import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  viewer,
  visibleUser,
  relationship,
  fail,
  notify,
  throttle,
  profile,
} from "./lib/access";

export const follow = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const me = await viewer(ctx),
      target = await ctx.db.get(id);
    if (id === me._id || !(await visibleUser(ctx, me, target)) || !target)
      return fail("Account not available.");
    const edge = await relationship(ctx, me._id, id);
    if (edge) {
      await ctx.db.delete(edge._id);
      return null;
    }
    await throttle(ctx, me._id, "follow", 100);
    const status = target.privacy === "private" ? "pending" : "accepted";
    await ctx.db.insert("follows", { from: me._id, to: id, status });
    await notify(ctx, id, me._id, status === "pending" ? "request" : "follow");
    return status;
  },
});
export const respond = mutation({
  args: { id: v.id("follows"), accept: v.boolean() },
  handler: async (ctx, args) => {
    const me = await viewer(ctx),
      edge = await ctx.db.get(args.id);
    if (!edge || edge.to !== me._id || edge.status !== "pending")
      return fail("Request not found.");
    if (args.accept) {
      await ctx.db.patch(edge._id, { status: "accepted" });
      await notify(ctx, edge.from, me._id, "follow");
    } else await ctx.db.delete(edge._id);
  },
});
export const removeFollower = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const me = await viewer(ctx),
      edge = await relationship(ctx, id, me._id);
    if (edge) await ctx.db.delete(edge._id);
  },
});
export const block = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const me = await viewer(ctx);
    if (id === me._id) return fail("You cannot block yourself.");
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) => q.eq("from", me._id).eq("to", id))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    if (!(await ctx.db.get(id))) return fail("Account not found.");
    await ctx.db.insert("blocks", { from: me._id, to: id });
    for (const [a, b] of [
      [me._id, id],
      [id, me._id],
    ] as const) {
      const edge = await relationship(ctx, a, b);
      if (edge) await ctx.db.delete(edge._id);
    }
    const pair = [me._id, id].sort().join(":");
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_pair", (q) => q.eq("pair", pair))
      .unique();
    if (conversation?.status === "pending")
      await ctx.db.patch(conversation._id, { status: "blocked" });
    return true;
  },
});
export const blockedAccounts = query({
  args: {},
  handler: async (ctx) => {
    const me = await viewer(ctx),
      rows = await ctx.db
        .query("blocks")
        .withIndex("by_from", (q) => q.eq("from", me._id))
        .take(100);
    const users = [];
    for (const r of rows) {
      const u = await ctx.db.get(r.to);
      if (u && u.status !== "deleting") users.push(profile(u));
    }
    return users;
  },
});
