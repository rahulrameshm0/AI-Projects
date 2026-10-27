/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { profileDestination } from "../src/lib/auth/destination";
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const page = { numItems: 30, cursor: null };
function setup() {
  return convexTest(schema, modules);
}
type T = ReturnType<typeof setup>;
async function user(
  t: T,
  name: string,
  privacy: "private" | "public" = "public",
  admin = false,
) {
  const id = await t.run((ctx) =>
    ctx.db.insert("users", {
      subject: name,
      username: name,
      displayName: name,
      bio: "",
      privacy,
      status: "active",
      admitted: true,
      admin,
      createdAt: Date.now(),
      postCount: 0,
    }),
  );
  return {
    id,
    client: t.withIdentity({
      subject: name,
      email: `${name}@example.com`,
      emailVerified: true,
    }),
  };
}
async function media(
  t: T,
  owner: Id<"users">,
  purpose: "post" | "message" | "avatar" = "post",
) {
  return t.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(["image"], { type: "image/png" }),
    );
    return ctx.db.insert("media", {
      owner,
      purpose,
      kind: "image",
      state: "ready",
      storageId,
      mime: "image/png",
      size: 5,
      width: 1,
      height: 1,
      createdAt: Date.now(),
      counted: true,
    });
  });
}
async function post(
  t: T,
  u: Awaited<ReturnType<typeof user>>,
  clientId = "post-1",
) {
  const m = await media(t, u.id);
  return u.client.mutation(api.posts.publish, {
    media: m,
    caption: "A real moment",
    clientId,
  });
}
beforeEach(() => {
  vi.useRealTimers();
});
describe("privacy and admission", () => {
  it("routes a signed-in new member through setup and unlocks Home after completion", async () => {
    const t = setup();
    const client = t.withIdentity({ subject: "google-new-member" });
    await client.mutation(api.users.ensure, {});
    const pending = await client.query(api.users.me, {});
    expect(profileDestination(pending?.status)).toBe("/onboarding");
    await t.mutation(internal.admin.bootstrap, { code: "ROUTING-TEST" });
    await client.mutation(api.users.complete, {
      code: "ROUTING-TEST",
      username: "new.member",
      displayName: "New Member",
      privacy: "private",
      adult: true,
      policies: true,
    });
    const admitted = await client.query(api.users.me, {});
    expect(profileDestination(admitted?.status)).toBe("/(tabs)");
    const feed = await client.query(api.posts.feed, {
      mode: "home",
      paginationOpts: page,
    });
    expect(feed.page).toEqual([]);
  });
  it("rejects signed-out and incomplete consumers", async () => {
    const t = setup();
    await expect(
      t.query(api.posts.feed, { mode: "home", paginationOpts: page }),
    ).rejects.toThrow("Sign in");
    const c = t.withIdentity({ subject: "new-user" });
    await c.mutation(api.users.ensure, {});
    await expect(c.query(api.messages.list, {})).rejects.toThrow("invitation");
  });
  it("enforces private posts, approval, blocking, and immediate media revocation", async () => {
    const t = setup(),
      a = await user(t, "alice", "private"),
      b = await user(t, "bruno"),
      id = await post(t, a);
    expect(await b.client.query(api.posts.get, { id })).toBeNull();
    await b.client.mutation(api.social.follow, { id: a.id });
    expect(await b.client.query(api.posts.get, { id })).toBeNull();
    const edge = await t.run((ctx) => ctx.db.query("follows").first());
    await a.client.mutation(api.social.respond, {
      id: edge!._id,
      accept: true,
    });
    expect(await b.client.query(api.posts.get, { id })).not.toBeNull();
    const p = await t.run((ctx) => ctx.db.get(id));
    expect(
      await t.query(internal.media.authorize, {
        id: p!.media,
        subject: "bruno",
      }),
    ).not.toBeNull();
    await a.client.mutation(api.social.block, { id: b.id });
    expect(await b.client.query(api.posts.get, { id })).toBeNull();
    expect(
      await t.query(internal.media.authorize, {
        id: p!.media,
        subject: "bruno",
      }),
    ).toBeNull();
    await a.client.mutation(api.social.block, { id: b.id });
    expect(await b.client.query(api.posts.get, { id })).toBeNull();
  });
  it("revokes public content when its owner becomes private", async () => {
    const t = setup(),
      a = await user(t, "alice"),
      b = await user(t, "bruno"),
      id = await post(t, a);
    expect(await b.client.query(api.posts.get, { id })).not.toBeNull();
    await a.client.mutation(api.users.update, {
      username: "alice",
      displayName: "Alice",
      bio: "",
      privacy: "private",
    });
    expect(await b.client.query(api.posts.get, { id })).toBeNull();
  });
  it("suspended accounts cannot read or publish", async () => {
    const t = setup(),
      a = await user(t, "alice");
    await t.run((ctx) => ctx.db.patch(a.id, { status: "suspended" }));
    await expect(
      a.client.query(api.posts.feed, { mode: "explore", paginationOpts: page }),
    ).rejects.toThrow("suspended");
  });
  it("redeems each invitation once under concurrent attempts", async () => {
    const t = setup();
    await t.mutation(internal.admin.bootstrap, { code: "ONE-INVITE" });
    const clients = ["alice", "bruno"].map((subject) =>
      t.withIdentity({ subject }),
    );
    for (const c of clients) await c.mutation(api.users.ensure, {});
    const results = await Promise.allSettled(
      clients.map((c, i) =>
        c.mutation(api.users.complete, {
          code: "ONE-INVITE",
          username: i ? "bruno" : "alice",
          displayName: "A Person",
          privacy: "private",
          adult: true,
          policies: true,
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await t.run((ctx) => ctx.db.query("settings").first()))?.admitted,
    ).toBe(1);
  });
  it("atomically enforces the 100-account cap", async () => {
    const t = setup();
    await t.mutation(internal.admin.bootstrap, { code: "INVITE-ONE" });
    await t.mutation(internal.admin.bootstrap, { code: "INVITE-TWO" });
    await t.run(async (ctx) => {
      const s = await ctx.db.query("settings").first();
      await ctx.db.patch(s!._id, { admitted: 99 });
    });
    const clients = ["alice", "bruno"].map((subject) =>
      t.withIdentity({ subject }),
    );
    for (const c of clients) await c.mutation(api.users.ensure, {});
    const results = await Promise.allSettled(
      clients.map((c, i) =>
        c.mutation(api.users.complete, {
          code: i ? "INVITE-TWO" : "INVITE-ONE",
          username: i ? "bruno" : "alice",
          displayName: "Person",
          privacy: "private",
          adult: true,
          policies: true,
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await t.run((ctx) => ctx.db.query("settings").first()))?.admitted,
    ).toBe(100);
  });
  it("normalizes and enforces unique usernames", async () => {
    const t = setup(),
      a = await user(t, "alice"),
      b = await user(t, "bruno");
    await expect(
      b.client.mutation(api.users.update, {
        username: "ALICE",
        displayName: "Bruno",
        bio: "",
        privacy: "public",
      }),
    ).rejects.toThrow("taken");
    expect(a.id).not.toBe(b.id);
  });
});
describe("posts and messaging", () => {
  it("publishes idempotently and stores one like per pair", async () => {
    const t = setup(),
      a = await user(t, "alice"),
      b = await user(t, "bruno"),
      m = await media(t, a.id);
    const args = { media: m, caption: "Hello", clientId: "same-request" };
    const one = await a.client.mutation(api.posts.publish, args),
      two = await a.client.mutation(api.posts.publish, args);
    expect(one).toBe(two);
    await b.client.mutation(api.posts.like, { id: one });
    expect(await t.run((ctx) => ctx.db.query("likes").collect())).toHaveLength(
      1,
    );
    await b.client.mutation(api.posts.like, { id: one });
    expect((await t.run((ctx) => ctx.db.get(one)))?.likes).toBe(0);
  });
  it("rejects another owner’s upload and repeated media attachment", async () => {
    const t = setup(),
      a = await user(t, "alice"),
      b = await user(t, "bruno"),
      m = await media(t, a.id);
    await expect(
      b.client.mutation(api.posts.publish, {
        media: m,
        caption: "",
        clientId: "bad",
      }),
    ).rejects.toThrow("not ready");
    await a.client.mutation(api.posts.publish, {
      media: m,
      caption: "",
      clientId: "one",
    });
    await expect(
      a.client.mutation(api.posts.publish, {
        media: m,
        caption: "",
        clientId: "two",
      }),
    ).rejects.toThrow("not ready");
  });
  it("allows one introduction, requires acceptance, checks membership, and deduplicates retries", async () => {
    const t = setup(),
      a = await user(t, "alice"),
      b = await user(t, "bruno"),
      c = await user(t, "carol");
    const id = await a.client.mutation(api.messages.start, {
      recipient: b.id,
      text: "Hello",
      clientId: "intro",
    });
    expect(
      await a.client.mutation(api.messages.start, {
        recipient: b.id,
        text: "More",
        clientId: "intro-2",
      }),
    ).toBe(id);
    expect(
      await t.run((ctx) => ctx.db.query("messages").collect()),
    ).toHaveLength(1);
    await expect(
      a.client.mutation(api.messages.send, {
        id,
        text: "Again",
        clientId: "bad",
      }),
    ).rejects.toThrow("cannot send");
    await expect(
      c.client.query(api.messages.thread, { id, paginationOpts: page }),
    ).rejects.toThrow("not found");
    await b.client.mutation(api.messages.respond, { id, accept: true });
    const args = { id, text: "Now we can chat", clientId: "send-1" };
    const first = await a.client.mutation(api.messages.send, args);
    expect(await a.client.mutation(api.messages.send, args)).toBe(first);
    await b.client.mutation(api.social.block, { id: a.id });
    await expect(
      a.client.mutation(api.messages.send, {
        id,
        text: "No",
        clientId: "blocked",
      }),
    ).rejects.toThrow("cannot send");
    expect(
      (await a.client.query(api.messages.thread, { id, paginationOpts: page }))
        .page,
    ).toHaveLength(2);
    await a.client.mutation(api.messages.unsend, { id: first });
    expect((await t.run((ctx) => ctx.db.get(first)))?.text).toBe("");
  });
  it("never lets recipients unsend another person’s message", async () => {
    const t = setup(),
      a = await user(t, "alice"),
      b = await user(t, "bruno");
    await a.client.mutation(api.messages.start, {
      recipient: b.id,
      text: "Hello",
      clientId: "intro",
    });
    const m = await t.run((ctx) => ctx.db.query("messages").first());
    await expect(
      b.client.mutation(api.messages.unsend, { id: m!._id }),
    ).rejects.toThrow("cannot unsend");
  });
});
describe("moderation, capacity, and deletion", () => {
  it("enforces administrator access and upload controls", async () => {
    const t = setup(),
      a = await user(t, "alice"),
      admin = await user(t, "owner", "public", true);
    await expect(a.client.query(api.admin.dashboard, {})).rejects.toThrow(
      "Administrator",
    );
    await admin.client.mutation(api.admin.controls, {
      uploadsEnabled: false,
      admissionsEnabled: true,
    });
    await expect(
      a.client.mutation(api.media.begin, {
        kind: "image",
        purpose: "post",
        size: 100,
      }),
    ).rejects.toThrow("unavailable");
  });
  it("retains reported files for 30 days, then removes the evidence and bytes", async () => {
    vi.useFakeTimers();
    const t = setup(),
      a = await user(t, "alice"),
      b = await user(t, "bruno"),
      id = await post(t, a),
      p = await t.run((ctx) => ctx.db.get(id)),
      m = await t.run((ctx) => ctx.db.get(p!.media));
    const rid = await b.client.mutation(api.reports.create, {
      targetType: "post",
      targetId: id,
      reason: "Spam",
    });
    await a.client.mutation(api.posts.remove, { id });
    await t.mutation(internal.cleanup.removeMedia, { id: m!._id });
    expect(
      await t.run(
        async (ctx) => (await ctx.storage.get(m!.storageId!)) !== null,
      ),
    ).toBe(true);
    vi.setSystemTime(Date.now() + 31 * 86_400_000);
    await t.mutation(internal.cleanup.sweep, {});
    await t.mutation(internal.cleanup.removeMedia, { id: m!._id });
    expect((await t.run((ctx) => ctx.db.get(rid)))?.evidence).toBe("");
    expect(
      await t.run(
        async (ctx) => (await ctx.storage.get(m!.storageId!)) !== null,
      ),
    ).toBe(false);
  });
  it("account deletion revokes access immediately and redacts owned text", async () => {
    const t = setup(),
      a = await user(t, "alice"),
      b = await user(t, "bruno"),
      id = await post(t, a);
    await a.client.mutation(api.users.deletion, { confirmation: "DELETE" });
    expect(await b.client.query(api.posts.get, { id })).toBeNull();
    await expect(
      a.client.query(api.posts.feed, { mode: "home", paginationOpts: page }),
    ).rejects.toThrow("deleted");
    await t.mutation(internal.cleanup.deleteAccount, { id: a.id });
    const tombstone = await t.run((ctx) => ctx.db.get(a.id));
    expect(tombstone?.username).toBe("");
    expect((await t.run((ctx) => ctx.db.get(id)))?.caption).toBe("");
  });
});
