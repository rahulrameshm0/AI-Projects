import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { viewer, visibleUser, postAccess, profile } from "./lib/access";
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const me = await viewer(ctx),
      result = await ctx.db
        .query("activity")
        .withIndex("by_recipient", (q) => q.eq("recipient", me._id))
        .order("desc")
        .paginate({
          ...args.paginationOpts,
          numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
        }),
      page = [];
    for (const item of result.page) {
      const actor = await ctx.db.get(item.actor);
      if (!actor || !(await visibleUser(ctx, me, actor))) continue;
      if (
        item.post &&
        !(await postAccess(ctx, me, await ctx.db.get(item.post)))
      )
        continue;
      page.push({ ...item, actor: profile(actor) });
    }
    return { ...result, page };
  },
});
export const unread = query({
  args: {},
  handler: async (ctx) => {
    const me = await viewer(ctx),
      rows = await ctx.db
        .query("activity")
        .withIndex("by_recipient", (q) => q.eq("recipient", me._id))
        .order("desc")
        .take(100);
    let count = 0;
    for (const r of rows)
      if (!r.read && (await visibleUser(ctx, me, await ctx.db.get(r.actor))))
        count++;
    return count;
  },
});
export const markRead = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await viewer(ctx),
      rows = await ctx.db
        .query("activity")
        .withIndex("by_recipient", (q) => q.eq("recipient", me._id))
        .order("desc")
        .take(100);
    for (const r of rows)
      if (!r.read) await ctx.db.patch(r._id, { read: true });
  },
});
