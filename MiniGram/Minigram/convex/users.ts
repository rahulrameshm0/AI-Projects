import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  bySubject,
  viewer,
  blocked,
  canViewPosts,
  profile,
  relationship,
  username,
  text,
  fail,
  settings,
  digest,
  throttle,
} from "./lib/access";
import { internal } from "./_generated/api";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const i = await ctx.auth.getUserIdentity();
    return i ? bySubject(ctx, i.subject) : null;
  },
});
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const i = await ctx.auth.getUserIdentity();
    if (!i) return fail("Sign in to continue.");
    const existing = await bySubject(ctx, i.subject);
    if (existing) {
      if (!existing.admin && process.env.MINIGRAM_ADMIN_EMAIL && i.email?.toLowerCase() === process.env.MINIGRAM_ADMIN_EMAIL.toLowerCase() && i.emailVerified === true && existing.status !== 'deleting') await ctx.db.patch(existing._id,{admin:true});
      return existing._id;
    }
    return ctx.db.insert("users", {
      subject: i.subject,
      username: "",
      displayName: "",
      bio: "",
      privacy: "private",
      status: "incomplete",
      admitted: false,
      admin:
        !!process.env.MINIGRAM_ADMIN_EMAIL &&
        i.email?.toLowerCase() ===
          process.env.MINIGRAM_ADMIN_EMAIL.toLowerCase() &&
        i.emailVerified === true,
      createdAt: Date.now(),
      postCount: 0,
    });
  },
});
export const complete = mutation({
  args: {
    code: v.string(),
    username: v.string(),
    displayName: v.string(),
    privacy: v.union(v.literal("private"), v.literal("public")),
    adult: v.boolean(),
    policies: v.boolean(),
    avatar: v.optional(v.id("media")),
  },
  handler: async (ctx, args) => {
    const me = await viewer(ctx, true);
    if (me.status === "active") return me._id;
    if (!args.adult || !args.policies)
      return fail(
        "Confirm that you are 18 or older and accept the privacy policy and community rules.",
      );
    await throttle(ctx, me._id, "invite", 15, 3_600_000);
    const name = username(args.username),
      displayName = text(args.displayName, 50, true);
    if (
      await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", name))
        .unique()
    )
      return fail("That username is already taken.");
    const s = await settings(ctx);
    if (!s.admissionsEnabled || s.admitted >= 100)
      return fail("The beta is currently full. Please try again later.");
    const awaitHash = await digest(
      args.code.trim().toUpperCase().replace(/\s/g, ""),
    );
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_hash", (q) => q.eq("hash", awaitHash))
      .unique();
    if (
      !invite ||
      invite.revoked ||
      invite.redeemedBy ||
      invite.expiresAt < Date.now()
    )
      return fail("That invitation is invalid or has already been used.");
    if (args.avatar) {
      const m = await ctx.db.get(args.avatar);
      if (
        !m ||
        m.owner !== me._id ||
        m.purpose !== "avatar" ||
        m.state !== "ready"
      )
        return fail("Avatar upload is not ready.");
      await ctx.db.patch(m._id, { state: "attached" });
    }
    await ctx.db.patch(invite._id, { redeemedBy: me._id });
    await ctx.db.patch(s._id, { admitted: s.admitted + 1 });
    await ctx.db.patch(me._id, {
      username: name,
      displayName,
      privacy: args.privacy,
      status: "active",
      admitted: true,
      avatar: args.avatar,
      acceptedPoliciesAt: Date.now(),
      ageConfirmedAt: Date.now(),
    });
    return me._id;
  },
});
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const me = await viewer(ctx);
    const target = await ctx.db.get(id);
    if (!target || target.status !== "active") return null;
    const isBlocked = await blocked(ctx, me._id, id);
    const edge = await relationship(ctx, me._id, id);
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_to", (q) => q.eq("to", id).eq("status", "accepted"))
      .collect();
    const following = await ctx.db
      .query("follows")
      .withIndex("by_from", (q) => q.eq("from", id).eq("status", "accepted"))
      .collect();

    return {
      ...profile(target),
      blocked: isBlocked,
      own: me._id === id,
      canView: await canViewPosts(ctx, me, target),
      relationship: edge?.status || null,
      followers: followers.length,
      following: following.length,
      postCount: target.postCount,
    };
  },
});
export const update = mutation({
  args: {
    username: v.string(),
    displayName: v.string(),
    bio: v.string(),
    privacy: v.union(v.literal("private"), v.literal("public")),
    avatar: v.optional(v.id("media")),
  },
  handler: async (ctx, args) => {
    const me = await viewer(ctx),
      name = username(args.username);
    const other = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", name))
      .unique();
    if (other && other._id !== me._id)
      return fail("That username is already taken.");
    if (args.avatar && args.avatar !== me.avatar) {
      const media = await ctx.db.get(args.avatar);
      if (
        !media ||
        media.owner !== me._id ||
        media.purpose !== "avatar" ||
        media.state !== "ready"
      )
        return fail("Avatar upload is not ready.");
      await ctx.db.patch(media._id, { state: "attached" });
      if (me.avatar)
        await ctx.scheduler.runAfter(0, internal.cleanup.removeMedia, {
          id: me.avatar,
        });
    }
    await ctx.db.patch(me._id, {
      username: name,
      displayName: text(args.displayName, 50, true),
      bio: text(args.bio, 160),
      privacy: args.privacy,
      ...(args.avatar ? { avatar: args.avatar } : {}),
    });
    if (me.privacy === "private" && args.privacy === "public") {
      const requests = await ctx.db
        .query("follows")
        .withIndex("by_to", (q) => q.eq("to", me._id).eq("status", "pending"))
        .collect();
      for (const r of requests)
        await ctx.db.patch(r._id, { status: "accepted" });
    }
  },
});
export const search = query({
  args: { prefix: v.string() },
  handler: async (ctx, { prefix }) => {
    const me = await viewer(ctx),
      term = prefix.trim().toLowerCase();
    if (!term) return [];
    const matches = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.gte("username", term).lt("username", term + "\uffff"),
      )
      .take(40);
    const byName = await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(101);
    const all = [
      ...new Map(
        [
          ...matches,
          ...byName.filter((u) => u.displayName.toLowerCase().startsWith(term)),
        ].map((u) => [u._id, u]),
      ).values(),
    ];
    const result = [];
    for (const u of all)
      if (
        u.status === "active" &&
        u._id !== me._id &&
        !(await blocked(ctx, me._id, u._id))
      )
        result.push(profile(u));
    return result.slice(0, 30);
  },
});
export const connections = query({
  args: {
    id: v.id("users"),
    kind: v.union(
      v.literal("followers"),
      v.literal("following"),
      v.literal("requests"),
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const me = await viewer(ctx),
      target = await ctx.db.get(args.id);
    if (
      !(await canViewPosts(ctx, me, target)) ||
      (args.kind === "requests" && args.id !== me._id)
    )
      return fail("This list is private.");
    const status = args.kind === "requests" ? "pending" : "accepted";
    const result =
      args.kind === "following"
        ? await ctx.db
            .query("follows")
            .withIndex("by_from", (q) =>
              q.eq("from", args.id).eq("status", status),
            )
            .order("desc")
            .paginate({
              ...args.paginationOpts,
              numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
            })
        : await ctx.db
            .query("follows")
            .withIndex("by_to", (q) => q.eq("to", args.id).eq("status", status))
            .order("desc")
            .paginate({
              ...args.paginationOpts,
              numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
            });
    const page = [];
    for (const edge of result.page) {
      const u = await ctx.db.get(
        args.kind === "following" ? edge.to : edge.from,
      );
      if (u && u.status === "active" && !(await blocked(ctx, me._id, u._id)))
        page.push({ ...profile(u), edge: edge._id });
    }
    return { ...result, page };
  },
});
export const deletion = mutation({
  args: { confirmation: v.string() },
  handler: async (ctx, { confirmation }) => {
    const me = await viewer(ctx, true);
    if (confirmation !== "DELETE") return fail("Type DELETE to confirm.");
    await ctx.db.patch(me._id, { status: "deleting" });
    await ctx.scheduler.runAfter(0, internal.cleanup.deleteAccount, {
      id: me._id,
    });
  },
});
export const checkInvite = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    await viewer(ctx, true);
    const hash = await digest(code.trim().toUpperCase().replace(/\s/g, "")),
      invite = await ctx.db
        .query("invites")
        .withIndex("by_hash", (q) => q.eq("hash", hash))
        .unique();
    const s = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "beta"))
      .unique();
    return (
      !!invite &&
      !invite.revoked &&
      !invite.redeemedBy &&
      invite.expiresAt > Date.now() &&
      (!s || (s.admissionsEnabled && s.admitted < 100))
    );
  },
});
