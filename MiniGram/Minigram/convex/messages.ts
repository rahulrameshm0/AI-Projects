import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  viewer,
  visibleUser,
  conversationAccess,
  blocked,
  profile,
  text,
  throttle,
  fail,
} from "./lib/access";
import { internal } from "./_generated/api";
export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await viewer(ctx);
    const a = await ctx.db
        .query("conversations")
        .withIndex("by_a", (q) => q.eq("a", me._id))
        .collect(),
      b = await ctx.db
        .query("conversations")
        .withIndex("by_b", (q) => q.eq("b", me._id))
        .collect();
    const result = [];
    for (const c of [...a, ...b].sort((x, y) => y.lastAt - x.lastAt)) {
      if (c.status === "declined" || c.status === "blocked") continue;
      const other = await ctx.db.get(c.a === me._id ? c.b : c.a);
      const unavailable = !other || other.status !== "active";
      result.push({
        ...c,
        other: !unavailable && other ? profile(other) : null,
        incoming: c.status === "pending" && c.initiator !== me._id,
        unread:
          (c.initiator !== me._id && c.status === "pending") ||
          c.lastAt > (c.a === me._id ? c.aReadAt : c.bReadAt),
        unavailable,
        blocked: other ? await blocked(ctx, me._id, other._id) : true,
      });
    }
    return result;
  },
});
export const get = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, { id }) => {
    const me = await viewer(ctx),
      c = await conversationAccess(ctx, me, id),
      other = await ctx.db.get(c.a === me._id ? c.b : c.a);
    return {
      ...c,
      other: other?.status === "active" ? profile(other) : null,
      incoming: c.status === "pending" && c.initiator !== me._id,
      blocked: other ? await blocked(ctx, me._id, other._id) : true,
      own: me._id,
    };
  },
});
export const thread = query({
  args: { id: v.id("conversations"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const me = await viewer(ctx);
    await conversationAccess(ctx, me, args.id);
    const result = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversation", args.id))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
      });
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (m) => ({
          ...m,
          mediaKind:
            m.media && !m.deleted
              ? (await ctx.db.get(m.media))?.kind
              : undefined,
        })),
      ),
    };
  },
});
export const start = mutation({
  args: { recipient: v.id("users"), text: v.string(), clientId: v.string() },
  handler: async (ctx, args) => {
    const me = await viewer(ctx),
      other = await ctx.db.get(args.recipient);
    if (me._id === args.recipient || !(await visibleUser(ctx, me, other)))
      return fail("Account not available.");
    const pair = [me._id, args.recipient].sort().join(":"),
      existing = await ctx.db
        .query("conversations")
        .withIndex("by_pair", (q) => q.eq("pair", pair))
        .unique();
    if (existing) {
      if (existing.status === "declined" || existing.status === "blocked")
        return fail("This message request is closed.");
      return existing._id;
    }
    await throttle(ctx, me._id, "message-request", 20);
    const body = text(args.text, 2000, true);
    text(args.clientId, 100, true);
    const id = await ctx.db.insert("conversations", {
      pair,
      a: me._id,
      b: args.recipient,
      initiator: me._id,
      status: "pending",
      lastAt: Date.now(),
      lastText: body,
      aReadAt: Date.now(),
      bReadAt: 0,
    });
    await ctx.db.insert("messages", {
      conversation: id,
      sender: me._id,
      text: body,
      deleted: false,
      clientId: args.clientId,
    });
    return id;
  },
});
export const respond = mutation({
  args: { id: v.id("conversations"), accept: v.boolean() },
  handler: async (ctx, args) => {
    const me = await viewer(ctx),
      c = await conversationAccess(ctx, me, args.id);
    if (c.status !== "pending" || c.initiator === me._id)
      return fail("Request not available.");
    if (await blocked(ctx, c.a, c.b))
      return fail("This conversation is blocked.");
    await ctx.db.patch(c._id, {
      status: args.accept ? "accepted" : "declined",
    });
  },
});
export const send = mutation({
  args: {
    id: v.id("conversations"),
    text: v.string(),
    media: v.optional(v.id("media")),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await viewer(ctx),
      c = await conversationAccess(ctx, me, args.id);
    text(args.clientId, 100, true);
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_client", (q) =>
        q.eq("sender", me._id).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) {
      if (existing.conversation !== c._id)
        return fail("Invalid request identifier.");
      return existing._id;
    }
    const other = await ctx.db.get(c.a === me._id ? c.b : c.a);
    if (c.status !== "accepted" || !(await visibleUser(ctx, me, other)))
      return fail("You cannot send messages in this conversation.");
    const body = text(args.text, 2000, !args.media);
    let media = null;
    if (args.media) {
      media = await ctx.db.get(args.media);
      if (
        !media ||
        media.owner !== me._id ||
        media.purpose !== "message" ||
        media.state !== "ready"
      )
        return fail("Your media upload is not ready.");
    }
    await throttle(ctx, me._id, "message", 500);
    const id = await ctx.db.insert("messages", {
      conversation: c._id,
      sender: me._id,
      text: body,
      media: args.media,
      deleted: false,
      clientId: args.clientId,
    });
    if (media)
      await ctx.db.patch(media._id, { state: "attached", message: id });
    await ctx.db.patch(c._id, {
      lastAt: Date.now(),
      lastText: body || (media?.kind === "video" ? "Video" : "Photo"),
      ...(c.a === me._id ? { aReadAt: Date.now() } : { bReadAt: Date.now() }),
    });
    return id;
  },
});
export const read = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, { id }) => {
    const me = await viewer(ctx),
      c = await conversationAccess(ctx, me, id);
    await ctx.db.patch(
      id,
      c.a === me._id ? { aReadAt: Date.now() } : { bReadAt: Date.now() },
    );
  },
});
export const unsend = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, { id }) => {
    const me = await viewer(ctx),
      message = await ctx.db.get(id);
    if (!message || message.sender !== me._id)
      return fail("You cannot unsend this message.");
    if (message.deleted) return;
    await ctx.db.patch(id, { deleted: true, text: "" });
    if (message.media)
      await ctx.scheduler.runAfter(0, internal.cleanup.removeMedia, {
        id: message.media,
      });
    const c = await ctx.db.get(message.conversation);
    if (c) {
      const latest = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversation", c._id))
        .order("desc")
        .first();
      if (latest?._id === id)
        await ctx.db.patch(c._id, { lastText: "Message deleted" });
    }
  },
});
