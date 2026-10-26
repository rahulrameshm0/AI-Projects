import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  viewer,
  postAccess,
  canViewPosts,
  relationship,
  fail,
  notify,
  throttle,
  text,
  profile,
} from "./lib/access";
import { internal } from "./_generated/api";
async function decorate(ctx: QueryCtx, me: Doc<"users">, post: Doc<"posts">) {
  const author = await ctx.db.get(post.author),
    media = await ctx.db.get(post.media);
  if (!author || !media) return null;
  const like = await ctx.db
    .query("likes")
    .withIndex("by_pair", (q) => q.eq("user", me._id).eq("post", post._id))
    .unique();
  return {
    ...post,
    author: profile(author),
    media: {
      _id: media._id,
      kind: media.kind,
      width: media.width,
      height: media.height,
      duration: media.duration,
    },
    liked: !!like,
    own: post.author === me._id,
  };
}
export const feed = query({
  args: {
    mode: v.union(v.literal("home"), v.literal("explore")),
    author: v.optional(v.id("users")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const me = await viewer(ctx);
    const source = args.author
      ? ctx.db
          .query("posts")
          .withIndex("by_author", (q) => q.eq("author", args.author!))
      : ctx.db
          .query("posts")
          .withIndex("by_deleted", (q) => q.eq("deleted", false));
    if (
      args.author &&
      !(await canViewPosts(ctx, me, await ctx.db.get(args.author)))
    )
      return { page: [], isDone: true, continueCursor: "" };
    const result = await source
        .order("desc")
        .paginate({
          ...args.paginationOpts,
          numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
        }),
      page = [];
    for (const post of result.page) {
      if (!(await postAccess(ctx, me, post))) continue;
      const author = await ctx.db.get(post.author);
      if (!author) continue;
      if (
        !args.author &&
        args.mode === "explore" &&
        author.privacy !== "public"
      )
        continue;
      if (
        !args.author &&
        args.mode === "home" &&
        post.author !== me._id &&
        (await relationship(ctx, me._id, post.author))?.status !== "accepted"
      )
        continue;
      const decorated = await decorate(ctx, me, post);
      if (decorated) page.push(decorated);
    }
    return { ...result, page };
  },
});
export const get = query({
  args: { id: v.id("posts") },
  handler: async (ctx, { id }) => {
    const me = await viewer(ctx),
      post = await ctx.db.get(id);
    return (await postAccess(ctx, me, post)) && post
      ? decorate(ctx, me, post)
      : null;
  },
});
export const publish = mutation({
  args: { media: v.id("media"), caption: v.string(), clientId: v.string() },
  handler: async (ctx, args) => {
    const me = await viewer(ctx);
    text(args.clientId, 100, true);
    const prior = await ctx.db
      .query("posts")
      .withIndex("by_client", (q) =>
        q.eq("author", me._id).eq("clientId", args.clientId),
      )
      .unique();
    if (prior) return prior._id;
    const media = await ctx.db.get(args.media);
    if (
      !media ||
      media.owner !== me._id ||
      media.purpose !== "post" ||
      media.state !== "ready"
    )
      return fail("Your media upload is not ready.");
    await throttle(ctx, me._id, "post", 20);
    const id = await ctx.db.insert("posts", {
      author: me._id,
      media: args.media,
      caption: text(args.caption, 2200),
      clientId: args.clientId,
      deleted: false,
      likes: 0,
      comments: 0,
    });
    await ctx.db.patch(media._id, { state: "attached", post: id });
    await ctx.db.patch(me._id, { postCount: me.postCount + 1 });
    return id;
  },
});
export const like = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, { id }) => {
    const me = await viewer(ctx),
      post = await ctx.db.get(id);
    if (!post || !(await postAccess(ctx, me, post)))
      return fail("Post not available.");
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_pair", (q) => q.eq("user", me._id).eq("post", id))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(id, { likes: Math.max(0, post.likes - 1) });
      return false;
    }
    await throttle(ctx, me._id, "like", 1000);
    await ctx.db.insert("likes", { user: me._id, post: id });
    await ctx.db.patch(id, { likes: post.likes + 1 });
    await notify(ctx, post.author, me._id, "like", id);
    return true;
  },
});
export const remove = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, { id }) => {
    const me = await viewer(ctx),
      post = await ctx.db.get(id);
    if (!post || post.author !== me._id)
      return fail("You cannot delete this post.");
    if (post.deleted) return;
    await ctx.db.patch(id, { deleted: true, caption: "" });
    const author = await ctx.db.get(post.author);
    if (author)
      await ctx.db.patch(author._id, {
        postCount: Math.max(0, author.postCount - 1),
      });
    await ctx.scheduler.runAfter(0, internal.cleanup.removeMedia, {
      id: post.media,
    });
  },
});
export const comments = query({
  args: { id: v.id("posts"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const me = await viewer(ctx),
      post = await ctx.db.get(args.id);
    if (!(await postAccess(ctx, me, post))) return fail("Post not available.");
    const result = await ctx.db
        .query("comments")
        .withIndex("by_post", (q) => q.eq("post", args.id))
        .order("desc")
        .paginate({
          ...args.paginationOpts,
          numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
        }),
      page = [];
    for (const c of result.page) {
      const author = await ctx.db.get(c.author);
      if (
        !c.deleted &&
        author &&
        (await canViewPosts(ctx, me, { ...author, privacy: "public" }))
      )
        page.push({
          ...c,
          author: profile(author),
          canDelete: c.author === me._id || post?.author === me._id,
        });
    }
    return { ...result, page };
  },
});
export const comment = mutation({
  args: { id: v.id("posts"), text: v.string() },
  handler: async (ctx, args) => {
    const me = await viewer(ctx),
      post = await ctx.db.get(args.id);
    if (!post || !(await postAccess(ctx, me, post)))
      return fail("Post not available.");
    await throttle(ctx, me._id, "comment", 200);
    const id = await ctx.db.insert("comments", {
      author: me._id,
      post: args.id,
      text: text(args.text, 1000, true),
      deleted: false,
    });
    await ctx.db.patch(post._id, { comments: post.comments + 1 });
    await notify(ctx, post.author, me._id, "comment", post._id);
    return id;
  },
});
export const removeComment = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, { id }) => {
    const me = await viewer(ctx),
      comment = await ctx.db.get(id);
    if (!comment) return fail("Comment not found.");
    const post = await ctx.db.get(comment.post);
    if (comment.author !== me._id && post?.author !== me._id)
      return fail("You cannot delete this comment.");
    if (comment.deleted) return;
    await ctx.db.patch(id, { deleted: true, text: "" });
    if (post)
      await ctx.db.patch(post._id, {
        comments: Math.max(0, post.comments - 1),
      });
  },
});
