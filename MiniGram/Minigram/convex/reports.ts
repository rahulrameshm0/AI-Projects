import { internal } from "./_generated/api";
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  viewer,
  visibleUser,
  postAccess,
  conversationAccess,
  throttle,
  text,
  fail,
  profile,
} from "./lib/access";
import type { Id } from "./_generated/dataModel";
export const create = mutation({
  args: {
    targetType: v.union(
      v.literal("user"),
      v.literal("post"),
      v.literal("comment"),
      v.literal("message"),
    ),
    targetId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await viewer(ctx);
    await throttle(ctx, me._id, "report", 20);
    const reason = text(args.reason, 1000, true);
    let evidence = "",
      storage: Id<"_storage"> | undefined;
    if (args.targetType === "user") {
      const id = ctx.db.normalizeId("users", args.targetId),
        u = id ? await ctx.db.get(id) : null;
      if (!u || !(await visibleUser(ctx, me, u)))
        return fail("Account not available.");
      evidence = JSON.stringify(profile(u));
      if (u.avatar) storage = (await ctx.db.get(u.avatar))?.storageId;
    }
    if (args.targetType === "post") {
      const id = ctx.db.normalizeId("posts", args.targetId),
        p = id ? await ctx.db.get(id) : null;
      if (!p || !(await postAccess(ctx, me, p)))
        return fail("Post not available.");
      evidence = JSON.stringify(p);
      storage = (await ctx.db.get(p.media))?.storageId;
    }
    if (args.targetType === "comment") {
      const id = ctx.db.normalizeId("comments", args.targetId),
        c = id ? await ctx.db.get(id) : null;
      if (
        !c ||
        c.deleted ||
        !(await postAccess(ctx, me, await ctx.db.get(c.post)))
      )
        return fail("Comment not available.");
      evidence = JSON.stringify(c);
    }
    if (args.targetType === "message") {
      const id = ctx.db.normalizeId("messages", args.targetId),
        m = id ? await ctx.db.get(id) : null;
      if (!m || m.deleted) return fail("Message not available.");
      await conversationAccess(ctx, me, m.conversation);
      evidence = JSON.stringify(m);
      if (m.media) storage = (await ctx.db.get(m.media))?.storageId;
    }
    const id = await ctx.db.insert("reports", {
      reporter: me._id,
      ...args,
      reason,
      evidence,
      evidenceStorage: storage,
      expiresAt: Date.now() + 30 * 86_400_000,
      status: "open",
    });
    await ctx.scheduler.runAt(
      Date.now() + 30 * 86_400_000,
      internal.cleanup.expireReport,
      { id },
    );
    return id;
  },
});
