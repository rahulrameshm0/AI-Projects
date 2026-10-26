import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
type Ctx = QueryCtx | MutationCtx;
export const fail = (message: string): never => {
  throw new ConvexError(message);
};
export async function bySubject(ctx: Ctx, subject: string) {
  return ctx.db
    .query("users")
    .withIndex("by_subject", (q) => q.eq("subject", subject))
    .unique();
}
export async function viewer(ctx: Ctx, incomplete = false) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return fail("Sign in to continue.");
  const user = await bySubject(ctx, identity.subject);
  if (!user) return fail("Complete your account setup.");
  if (user.status === "suspended")
    return fail("Your account has been suspended.");
  if (user.status === "deleting") return fail("Your account is being deleted.");
  if (!incomplete && user.status !== "active")
    return fail("Redeem your invitation and finish your profile first.");
  return user;
}
export async function admin(ctx: Ctx) {
  const user = await viewer(ctx);
  if (!user.admin) return fail("Administrator access required.");
  return user;
}
export async function blocked(ctx: Ctx, a: Id<"users">, b: Id<"users">) {
  return !!(
    (await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) => q.eq("from", a).eq("to", b))
      .unique()) ||
    (await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) => q.eq("from", b).eq("to", a))
      .unique())
  );
}
export async function relationship(
  ctx: Ctx,
  from: Id<"users">,
  to: Id<"users">,
) {
  return ctx.db
    .query("follows")
    .withIndex("by_pair", (q) => q.eq("from", from).eq("to", to))
    .unique();
}
export async function visibleUser(
  ctx: Ctx,
  me: Doc<"users">,
  target: Doc<"users"> | null,
) {
  return (
    !!target &&
    target.status === "active" &&
    !(await blocked(ctx, me._id, target._id))
  );
}
export async function canViewPosts(
  ctx: Ctx,
  me: Doc<"users">,
  author: Doc<"users"> | null,
) {
  if (!(await visibleUser(ctx, me, author)) || !author) return false;
  return (
    me._id === author._id ||
    author.privacy === "public" ||
    (await relationship(ctx, me._id, author._id))?.status === "accepted"
  );
}
export async function postAccess(
  ctx: Ctx,
  me: Doc<"users">,
  post: Doc<"posts"> | null,
) {
  return (
    !!post &&
    !post.deleted &&
    (await canViewPosts(ctx, me, await ctx.db.get(post.author)))
  );
}
export async function conversationAccess(
  ctx: Ctx,
  me: Doc<"users">,
  id: Id<"conversations">,
) {
  const c = await ctx.db.get(id);
  if (!c || (c.a !== me._id && c.b !== me._id))
    return fail("Conversation not found.");
  return c;
}
export function profile(user: Doc<"users">) {
  return {
    _id: user._id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatar: user.avatar,
    privacy: user.privacy,
  };
}
export function text(value: string, max: number, required = false) {
  const result = value.trim();
  if (result.length > max || (required && !result))
    return fail(`Enter ${required ? "1–" : "up to "}${max} characters.`);
  return result;
}
export function username(value: string) {
  const name = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_.]{3,23}$/.test(name))
    return fail(
      "Use 4–24 letters, numbers, dots or underscores; start with a letter.",
    );
  return name;
}
export async function throttle(
  ctx: MutationCtx,
  user: Id<"users">,
  operation: string,
  max: number,
  period = 86_400_000,
) {
  const key = `${user}:${operation}`,
    window = Math.floor(Date.now() / period);
  const entry = await ctx.db
    .query("limits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (entry?.window === window && entry.count >= max)
    return fail("You’ve reached this limit. Please try again later.");
  if (entry)
    await ctx.db.patch(entry._id, {
      window,
      count: entry.window === window ? entry.count + 1 : 1,
    });
  else await ctx.db.insert("limits", { key, window, count: 1 });
}
export async function settings(ctx: MutationCtx) {
  let s = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "beta"))
    .unique();
  if (!s) {
    const id = await ctx.db.insert("settings", {
      key: "beta",
      admitted: 0,
      uploadsEnabled: true,
      admissionsEnabled: true,
      storedBytes: 0,
      maxStoredBytes: 5 * 1024 ** 3,
    });
    s = await ctx.db.get(id);
  }
  return s!;
}
export async function notify(
  ctx: MutationCtx,
  recipient: Id<"users">,
  actor: Id<"users">,
  kind: Doc<"activity">["kind"],
  post?: Id<"posts">,
) {
  if (recipient !== actor)
    await ctx.db.insert("activity", {
      recipient,
      actor,
      kind,
      post,
      read: false,
    });
}
export async function digest(value: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
