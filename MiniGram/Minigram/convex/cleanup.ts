import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { settings } from "./lib/access";
async function purgeMedia(
  ctx: import("./_generated/server").MutationCtx,
  id: import("./_generated/dataModel").Id<"media">,
) {
  const m = await ctx.db.get(id);
  if (!m || m.purged) return;
  await ctx.db.patch(id, { state: "deleted" });
  if (m.storageId) {
    const retained = await ctx.db
      .query("reports")
      .withIndex("by_storage", (q) => q.eq("evidenceStorage", m.storageId))
      .collect();
    if (retained.some((r) => r.expiresAt > Date.now())) return;
    await ctx.storage.delete(m.storageId);
  }
  if (m.counted) {
    const s = await settings(ctx);
    await ctx.db.patch(s._id, {
      storedBytes: Math.max(0, s.storedBytes - m.size),
    });
  }
  await ctx.db.patch(id, { purged: true, counted: false });
}
export const removeMedia = internalMutation({
  args: { id: v.id("media") },
  handler: async (ctx, { id }) => purgeMedia(ctx, id),
});
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const state of ["uploading", "validating", "ready"] as const) {
      const stale = await ctx.db
        .query("media")
        .withIndex("by_state", (q) =>
          q.eq("state", state).lt("createdAt", Date.now() - 86_400_000),
        )
        .take(100);
      for (const m of stale)
        await ctx.scheduler.runAfter(0, internal.cleanup.removeMedia, {
          id: m._id,
        });
    }
    const expired = await ctx.db
      .query("reports")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", Date.now()))
      .filter((q) => q.neq(q.field("evidence"), ""))
      .take(100);
    for (const r of expired) {
      await ctx.db.patch(r._id, { evidence: "", evidenceStorage: undefined });
      if (r.evidenceStorage) {
        const media = await ctx.db
          .query("media")
          .withIndex("by_storage", (q) => q.eq("storageId", r.evidenceStorage))
          .unique();
        if (media?.state === "deleted")
          await ctx.scheduler.runAfter(0, internal.cleanup.removeMedia, {
            id: media._id,
          });
      }
    }
  },
});
export const deleteAccount = internalMutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const u = await ctx.db.get(id);
    if (!u || u.status !== "deleting") return;
    // Page each owned collection so large accounts never exceed one transaction's limits.
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("author", id))
      .filter((q) => q.eq(q.field("deleted"), false))
      .take(50);
    for (const p of posts) {
      await ctx.db.patch(p._id, { deleted: true, caption: "" });
      await ctx.scheduler.runAfter(0, internal.cleanup.removeMedia, {
        id: p.media,
      });
    }
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_author", (q) => q.eq("author", id))
      .filter((q) => q.eq(q.field("deleted"), false))
      .take(50);
    for (const c of comments) {
      await ctx.db.patch(c._id, { deleted: true, text: "" });
      const p = await ctx.db.get(c.post);
      if (p)
        await ctx.db.patch(p._id, { comments: Math.max(0, p.comments - 1) });
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("sender", id))
      .filter((q) => q.eq(q.field("deleted"), false))
      .take(50);
    for (const m of messages) {
      await ctx.db.patch(m._id, { deleted: true, text: "" });
      if (m.media)
        await ctx.scheduler.runAfter(0, internal.cleanup.removeMedia, {
          id: m.media,
        });
      const c = await ctx.db.get(m.conversation);
      if (c) await ctx.db.patch(c._id, { lastText: "Message deleted" });
    }
    if (
      posts.length === 50 ||
      comments.length === 50 ||
      messages.length === 50
    ) {
      await ctx.scheduler.runAfter(0, internal.cleanup.deleteAccount, { id });
      return;
    }
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_pair", (q) => q.eq("user", id))
      .take(50);
    for (const l of likes) {
      await ctx.db.delete(l._id);
      const p = await ctx.db.get(l.post);
      if (p) await ctx.db.patch(p._id, { likes: Math.max(0, p.likes - 1) });
    }
    if (likes.length === 50) {
      await ctx.scheduler.runAfter(0, internal.cleanup.deleteAccount, { id });
      return;
    }
    const media = await ctx.db
      .query("media")
      .withIndex("by_owner", (q) => q.eq("owner", id))
      .filter((q) => q.neq(q.field("state"), "deleted"))
      .take(50);
    for (const m of media) await purgeMedia(ctx, m._id);
    if (media.length === 50) {
      await ctx.scheduler.runAfter(0, internal.cleanup.deleteAccount, { id });
      return;
    }
    const blocksFrom = await ctx.db
        .query("blocks")
        .withIndex("by_from", (q) => q.eq("from", id))
        .collect(),
      blocksTo = await ctx.db
        .query("blocks")
        .withIndex("by_to", (q) => q.eq("to", id))
        .collect();
    for (const b of [...blocksFrom, ...blocksTo]) await ctx.db.delete(b._id);
    const from = await ctx.db
        .query("follows")
        .withIndex("by_from", (q) => q.eq("from", id))
        .collect(),
      to = await ctx.db
        .query("follows")
        .withIndex("by_to", (q) => q.eq("to", id))
        .collect();
    for (const edge of [...from, ...to]) await ctx.db.delete(edge._id);
    const s = await settings(ctx);
    if (u.admitted)
      await ctx.db.patch(s._id, { admitted: Math.max(0, s.admitted - 1) });
    await ctx.db.patch(id, {
      username: "",
      displayName: "Deleted account",
      bio: "",
      avatar: undefined,
      postCount: 0,
      admitted: false,
      admin: false,
    });
    if (
      await ctx.db
        .query("jobs")
        .withIndex("by_target", (q) => q.eq("target", u.subject))
        .unique()
    )
      return;
    const job = await ctx.db.insert("jobs", {
      kind: "clerk",
      target: u.subject,
      attempts: 0,
    });
    await ctx.scheduler.runAfter(0, internal.lifecycle.deleteClerkUser, {
      job,
    });
  },
});
export const retryJob = internalMutation({
  args: { id: v.id("jobs"), done: v.boolean() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) return;
    if (args.done) {
      await ctx.db.delete(job._id);
      return;
    }
    await ctx.db.patch(job._id, { attempts: job.attempts + 1 });
    await ctx.scheduler.runAfter(
      Math.min(86_400_000, 60_000 * 2 ** Math.min(job.attempts, 10)),
      internal.lifecycle.deleteClerkUser,
      { job: job._id },
    );
  },
});
export const job = internalMutation({
  args: { id: v.id("jobs") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const expireReport = internalMutation({
  args: { id: v.id("reports") },
  handler: async (ctx, { id }) => {
    const r = await ctx.db.get(id);
    if (!r || r.expiresAt > Date.now()) return;
    await ctx.db.patch(id, { evidence: "", evidenceStorage: undefined });
    if (r.evidenceStorage) {
      const m = await ctx.db
        .query("media")
        .withIndex("by_storage", (q) => q.eq("storageId", r.evidenceStorage))
        .unique();
      if (m?.state === "deleted") await purgeMedia(ctx, m._id);
    }
  },
});
export const sweepStorage = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db.system
      .query("_storage")
      .paginate({ numItems: 100, cursor: cursor || null });
    for (const f of result.page) {
      if (f._creationTime > Date.now() - 86_400_000) continue;
      const m = await ctx.db
        .query("media")
        .withIndex("by_storage", (q) => q.eq("storageId", f._id))
        .unique();
      if (!m) await ctx.storage.delete(f._id);
    }
    if (!result.isDone)
      await ctx.scheduler.runAfter(0, internal.cleanup.sweepStorage, {
        cursor: result.continueCursor,
      });
  },
});
