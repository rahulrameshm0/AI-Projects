import { mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import {
  viewer,
  bySubject,
  fail,
  settings,
  throttle,
  postAccess,
  blocked,
} from "./lib/access";
export const begin = mutation({
  args: {
    kind: v.union(v.literal("image"), v.literal("video")),
    purpose: v.union(
      v.literal("post"),
      v.literal("message"),
      v.literal("avatar"),
    ),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const me = await viewer(ctx, args.purpose === "avatar");
    if (args.purpose === "avatar" && args.kind !== "image")
      return fail("Choose an image for your avatar.");
    if (
      !Number.isSafeInteger(args.size) ||
      args.size <= 0 ||
      args.size > (args.kind === "image" ? 10 : 50) * 1024 ** 2
    )
      return fail("Images can be up to 10 MB; videos up to 50 MB.");
    const s = await settings(ctx);
    if (!s.uploadsEnabled || s.storedBytes + args.size > s.maxStoredBytes)
      return fail("Uploads are temporarily unavailable.");
    await throttle(ctx, me._id, "upload", 40);
    const id = await ctx.db.insert("media", {
      owner: me._id,
      kind: args.kind,
      purpose: args.purpose,
      state: "uploading",
      size: args.size,
      createdAt: Date.now(),
      counted: true,
    });
    await ctx.db.patch(s._id, { storedBytes: s.storedBytes + args.size });
    const base = process.env.CONVEX_SITE_URL;
    if (!base) return fail("The upload service is not configured.");
    return { id, url: `${base}/upload?id=${id}` };
  },
});
export const claim = internalMutation({
  args: { id: v.id("media"), storageId: v.id("_storage"), subject: v.string() },
  handler: async (ctx, args) => {
    const me = await bySubject(ctx, args.subject),
      m = await ctx.db.get(args.id);
    if (
      !me ||
      !m ||
      m.owner !== me._id ||
      me.status === "suspended" ||
      me.status === "deleting"
    )
      return fail("Upload not available.");
    if (m.state === "ready" || m.state === "attached") {
      if (m.storageId !== args.storageId)
        return fail("Upload already completed.");
      return m;
    }
    if (m.state !== "validating" || m.storageId !== args.storageId)
      return fail("The file does not belong to this upload.");
    return { ...m, storageId: args.storageId, state: "validating" as const };
  },
});
export const ready = internalMutation({
  args: {
    id: v.id("media"),
    size: v.number(),
    mime: v.string(),
    width: v.number(),
    height: v.number(),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const m = await ctx.db.get(args.id);
    if (!m) return fail("Upload not found.");
    if (m.state === "ready" || m.state === "attached") return m._id;
    if (m.state !== "validating") return fail("Upload was cancelled.");
    const s = await settings(ctx);
    if (
      !s.uploadsEnabled ||
      s.storedBytes + (m.counted ? 0 : args.size) > s.maxStoredBytes
    )
      return fail("Uploads are temporarily unavailable.");
    if (
      args.size !== m.size ||
      args.size > (m.kind === "image" ? 10 : 50) * 1024 ** 2 ||
      (m.kind === "video" && (!args.duration || args.duration > 60))
    )
      return fail("Media exceeds the allowed limits.");
    const { id, ...data } = args;
    await ctx.db.patch(id, { ...data, state: "ready", counted: true });
    await ctx.db.patch(s._id, {
      storedBytes: s.storedBytes + (m.counted ? 0 : args.size),
    });
    return id;
  },
});
export const authorize = internalQuery({
  args: { id: v.id("media"), subject: v.string() },
  handler: async (ctx, args) => {
    const me = await bySubject(ctx, args.subject),
      m = await ctx.db.get(args.id);
    if (
      !me ||
      !m ||
      !m.storageId ||
      m.state === "deleted" ||
      me.status === "suspended" ||
      me.status === "deleting"
    )
      return null;
    if (me._id === m.owner) return m;
    if (me.status !== "active" || m.state !== "attached") return null;
    const owner = await ctx.db.get(m.owner);
    if (!owner || owner.status !== "active") return null;
    if (m.purpose === "avatar")
      return (await blocked(ctx, me._id, m.owner)) ? null : m;
    if (m.post)
      return (await postAccess(ctx, me, await ctx.db.get(m.post))) ? m : null;
    if (m.message) {
      const message = await ctx.db.get(m.message);
      if (!message || message.deleted) return null;
      const c = await ctx.db.get(message.conversation);
      if (c && (c.a === me._id || c.b === me._id) && c.status === "accepted")
        return m;
    }
    return null;
  },
});

export const reserveUpload = internalMutation({
  args: { id: v.id("media"), subject: v.string() },
  handler: async (ctx, args) => {
    const me = await bySubject(ctx, args.subject),
      m = await ctx.db.get(args.id);
    if (
      !me ||
      !m ||
      m.owner !== me._id ||
      me.status === "suspended" ||
      me.status === "deleting" ||
      (m.purpose !== "avatar" && me.status !== "active")
    )
      return fail("Upload unavailable.");
    if (
      m.storageId &&
      (m.state === "validating" ||
        m.state === "ready" ||
        m.state === "attached")
    )
      return m;
    if (m.state !== "uploading")
      return fail("This upload is already in progress.");
    const s = await settings(ctx);
    if (!s.uploadsEnabled) return fail("Uploads are temporarily paused.");
    await ctx.db.patch(m._id, { state: "validating" });
    return { ...m, state: "validating" as const };
  },
});
export const storeUpload = internalMutation({
  args: { id: v.id("media"), storageId: v.id("_storage"), subject: v.string() },
  handler: async (ctx, args) => {
    const me = await bySubject(ctx, args.subject),
      m = await ctx.db.get(args.id);
    if (
      !me ||
      !m ||
      m.owner !== me._id ||
      me.status === "suspended" ||
      me.status === "deleting" ||
      m.state !== "validating"
    )
      return fail("Upload unavailable.");
    if (m.storageId && m.storageId !== args.storageId)
      return fail("This upload has already finished.");
    await ctx.db.patch(m._id, { storageId: args.storageId });
  },
});
