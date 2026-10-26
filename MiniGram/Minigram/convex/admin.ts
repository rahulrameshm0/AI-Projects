import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { admin, bySubject, settings, digest, text, fail } from "./lib/access";
import { internal } from "./_generated/api";
export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    await admin(ctx);
    const s = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "beta"))
      .unique();
    const open = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .take(100);
    return { settings: s, openReports: open.length };
  },
});
export const reports = query({
  args: {
    status: v.union(v.literal("open"), v.literal("resolved")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await admin(ctx);
    return ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
      });
  },
});
export const users = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await admin(ctx);
    return ctx.db
      .query("users")
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
      });
  },
});
export const invites = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await admin(ctx);
    const r = await ctx.db
      .query("invites")
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
      });
    return { ...r, page: r.page.map(({ hash, ...i }) => i) };
  },
});
export const createInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await admin(ctx);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 10; i++)
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    const hash = await digest(code);
    const id = await ctx.db.insert("invites", {
      hash,
      hint: code.slice(-4),
      creator: me._id,
      revoked: false,
      expiresAt: Date.now() + 7 * 86_400_000,
    });
    await ctx.db.insert("moderation", {
      admin: me._id,
      action: "create_invite",
      target: id,
      reason: "",
    });
    return { id, code };
  },
});
export const revokeInvite = mutation({
  args: { id: v.id("invites") },
  handler: async (ctx, { id }) => {
    const me = await admin(ctx),
      i = await ctx.db.get(id);
    if (!i || i.redeemedBy) return fail("Invitation is unavailable.");
    await ctx.db.patch(id, { revoked: true });
    await ctx.db.insert("moderation", {
      admin: me._id,
      action: "revoke_invite",
      target: id,
      reason: "",
    });
  },
});
export const controls = mutation({
  args: { uploadsEnabled: v.boolean(), admissionsEnabled: v.boolean() },
  handler: async (ctx, args) => {
    const me = await admin(ctx),
      s = await settings(ctx);
    await ctx.db.patch(s._id, args);
    await ctx.db.insert("moderation", {
      admin: me._id,
      action: "update_controls",
      target: s._id,
      reason: JSON.stringify(args),
    });
  },
});
export const suspend = mutation({
  args: { id: v.id("users"), suspended: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const me = await admin(ctx),
      u = await ctx.db.get(args.id);
    if (
      !u ||
      u._id === me._id ||
      u.admin ||
      !u.admitted ||
      u.status === "deleting"
    )
      return fail("This account cannot be changed.");
    await ctx.db.patch(u._id, {
      status: args.suspended ? "suspended" : "active",
    });
    await ctx.db.insert("moderation", {
      admin: me._id,
      action: args.suspended ? "suspend" : "restore",
      target: u._id,
      reason: text(args.reason, 1000, true),
    });
  },
});
export const resolve = mutation({
  args: {
    id: v.id("reports"),
    action: v.union(v.literal("dismiss"), v.literal("remove")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await admin(ctx),
      report = await ctx.db.get(args.id);
    if (!report || report.status !== "open") return fail("Report is not open.");
    if (args.action === "remove") {
      if (report.targetType === "user") {
        const id = ctx.db.normalizeId("users", report.targetId),
          u = id ? await ctx.db.get(id) : null;
        if (u && !u.admin && u.admitted)
          await ctx.db.patch(u._id, { status: "suspended" });
      }
      if (report.targetType === "post") {
        const id = ctx.db.normalizeId("posts", report.targetId),
          p = id ? await ctx.db.get(id) : null;
        if (p && !p.deleted) {
          await ctx.db.patch(p._id, { deleted: true, caption: "" });
          const u = await ctx.db.get(p.author);
          if (u)
            await ctx.db.patch(u._id, {
              postCount: Math.max(0, u.postCount - 1),
            });
          await ctx.scheduler.runAfter(0, internal.cleanup.removeMedia, {
            id: p.media,
          });
        }
      }
      if (report.targetType === "comment") {
        const id = ctx.db.normalizeId("comments", report.targetId),
          c = id ? await ctx.db.get(id) : null;
        if (c && !c.deleted) {
          await ctx.db.patch(c._id, { deleted: true, text: "" });
          const p = await ctx.db.get(c.post);
          if (p)
            await ctx.db.patch(p._id, {
              comments: Math.max(0, p.comments - 1),
            });
        }
      }
      if (report.targetType === "message") {
        const id = ctx.db.normalizeId("messages", report.targetId),
          m = id ? await ctx.db.get(id) : null;
        if (m && !m.deleted) {
          await ctx.db.patch(m._id, { text: "", deleted: true });
          if (m.media)
            await ctx.scheduler.runAfter(0, internal.cleanup.removeMedia, {
              id: m.media,
            });
        }
      }
    }
    await ctx.db.patch(report._id, {
      status: "resolved",
      resolution: text(args.reason, 1000, true),
    });
    await ctx.db.insert("moderation", {
      admin: me._id,
      action: args.action,
      target: report.targetId,
      reason: args.reason,
    });
  },
});
/** Only the deployment operator can call internal bootstrap functions. Never exposed to mobile clients. */
export const bootstrap = internalMutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    await settings(ctx);
    const normalized = code.trim().toUpperCase(),
      hash = await digest(normalized);
    if (
      !(await ctx.db
        .query("invites")
        .withIndex("by_hash", (q) => q.eq("hash", hash))
        .unique())
    )
      await ctx.db.insert("invites", {
        hash,
        hint: normalized.slice(-4),
        expiresAt: Date.now() + 30 * 86_400_000,
        revoked: false,
      });
    return { created: true };
  },
});
export const audit = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await admin(ctx);
    return ctx.db
      .query("moderation")
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
      });
  },
});

export const evidence = internalQuery({
  args: { id: v.id("reports"), subject: v.string() },
  handler: async (ctx, args) => {
    const me = await bySubject(ctx, args.subject);
    if (!me?.admin || me.status !== "active") return null;
    const r = await ctx.db.get(args.id);
    if (!r?.evidenceStorage || r.expiresAt <= Date.now()) return null;
    const m = await ctx.db
      .query("media")
      .withIndex("by_storage", (q) => q.eq("storageId", r.evidenceStorage))
      .unique();
    return {
      storageId: r.evidenceStorage,
      mime: m?.mime || "application/octet-stream",
    };
  },
});
