import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { bySubject } from "./lib/access";
import { internal } from "./_generated/api";
export const sync = internalMutation({
  args: { subject: v.string(), deleted: v.boolean(), banned: v.boolean() },
  handler: async (ctx, args) => {
    const user = await bySubject(ctx, args.subject);
    if (!user) return;
    if (args.deleted) {
      if (user.status === "deleting") return;
      await ctx.db.patch(user._id, { status: "deleting" });
      await ctx.scheduler.runAfter(0, internal.cleanup.deleteAccount, {
        id: user._id,
      });
    } else if (args.banned && user.status !== "deleting")
      await ctx.db.patch(user._id, { status: "suspended" });
  },
});
