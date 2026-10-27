import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

if (!process.argv.includes("--create-test-data"))
  throw new Error(
    "Explicit --create-test-data approval is required. Creates two labeled development accounts and invitations.",
  );
const values = {};
for (const file of [".env", ".env.local"])
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const at = line.indexOf("=");
      const name = line.slice(0, at);
      if (
        name === "EXPO_PUBLIC_CONVEX_URL" ||
        name === "EXPO_PUBLIC_CONVEX_SITE_URL"
      )
        values[name] = line
          .slice(at + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");
    }
  }
const url = values.EXPO_PUBLIC_CONVEX_URL,
  site = values.EXPO_PUBLIC_CONVEX_SITE_URL;
if (!url || !site) throw new Error("Configure the test deployment URLs.");
const secretResult = spawnSync(
  "npx",
  ["convex", "env", "get", "CLERK_SECRET_KEY"],
  { encoding: "utf8" },
);
const key = secretResult.stdout.trim();
if (secretResult.status !== 0 || !key.startsWith("sk_test_"))
  throw new Error("A configured Clerk DEVELOPMENT secret is required.");
const clerk = async (path, body) => {
  const r = await fetch("https://api.clerk.com/v1" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      "Clerk test request failed: " +
        r.status +
        " " +
        (data.errors?.[0]?.code || "unknown"),
    );
  return data;
};
const stamp = Date.now().toString(36),
  fixture = { createdAt: new Date().toISOString(), url, users: [] };
const fixtureFile = ".beta-test-access.local.json";
const persist = () =>
  writeFileSync(fixtureFile, JSON.stringify(fixture, null, 2), { mode: 0o600 });
const clients = [];
let checks = 0;
const ok = (value, label) => {
  if (!value) throw new Error(label);
  checks++;
  console.log("PASS " + label);
};
const page = { numItems: 30, cursor: null };
for (const [suffix, privacy] of [
  ["a", "public"],
  ["b", "private"],
]) {
  const username = `beta_${suffix}_${stamp}`;
  const user = await clerk("/users", {
    username,
    email_address: [`${username}+clerk_test@example.com`],
    password: randomBytes(24).toString("base64url"),
    first_name: "Beta Test",
    last_name: suffix.toUpperCase(),
    private_metadata: { minigram_beta_test: true },
  });
  fixture.users.push({ clerkId: user.id, username });
  persist();
  const session = await clerk("/sessions", { user_id: user.id });
  const client = new ConvexHttpClient(url);
  let token = "",
    fetchedAt = 0;
  const refresh = async () => {
    if (Date.now() - fetchedAt > 35000) {
      token = (await clerk(`/sessions/${session.id}/tokens`, {})).jwt;
      client.setAuth(token);
      fetchedAt = Date.now();
    }
    return token;
  };
  const c = {
    query: async (f, a) => {
      await refresh();
      return client.query(f, a);
    },
    mutation: async (f, a) => {
      await refresh();
      return client.mutation(f, a);
    },
    action: async (f, a) => {
      await refresh();
      return client.action(f, a);
    },
    token: refresh,
  };
  await c.mutation(api.users.ensure, {});
  ok(
    (await c.query(api.users.me, {})).status === "incomplete",
    "New " + suffix + " profile requires onboarding",
  );
  const code = randomBytes(8).toString("hex").toUpperCase();
  const result = spawnSync(
    "npx",
    ["convex", "run", "admin:bootstrap", JSON.stringify({ code })],
    { encoding: "utf8" },
  );
  if (result.status !== 0)
    throw new Error("Test invitation provisioning failed.");
  await c.mutation(api.users.complete, {
    code,
    username,
    displayName: "Beta Test " + suffix.toUpperCase(),
    privacy,
    adult: true,
    policies: true,
  });
  c.me = await c.query(api.users.me, {});
  clients.push(c);
}
const [a, b] = clients;
ok(
  a.me.status === "active" && b.me.status === "active",
  "Both test profiles complete admission",
);
const upload = async (c, path, kind = "image", purpose = "post") => {
  const bytes = readFileSync(path);
  const ticket = await c.mutation(api.media.begin, {
    kind,
    purpose,
    size: bytes.length,
  });
  const r = await fetch(ticket.url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + (await c.token()),
      "Content-Type": kind === "video" ? "video/mp4" : "image/png",
    },
    body: bytes,
  });
  if (!r.ok) throw new Error("Upload failed: " + r.status);
  const result = await r.json();
  return c.action(api.validateMedia.finish, {
    id: ticket.id,
    storageId: result.storageId,
  });
};
const image = await upload(a, "assets/images/auth-demo-img.png");
const privateImage = await upload(b, "assets/images/auth-demo-img.png");
const pa = await a.mutation(api.posts.publish, {
  media: image,
  caption: "BETA TEST — verified social interactions",
  clientId: "beta-" + stamp,
});
const pb = await b.mutation(api.posts.publish, {
  media: privateImage,
  caption: "BETA TEST — private visibility",
  clientId: "beta-private-" + stamp,
});
fixture.posts = [pa, pb];
persist();
ok(
  (
    await b.query(api.posts.feed, { mode: "explore", paginationOpts: page })
  ).page.some((p) => p._id === pa),
  "Public post appears in Explore",
);
ok(
  (await a.query(api.posts.get, { id: pb })) === null,
  "Private post denied before approval",
);
await b.mutation(api.posts.like, { id: pa, liked: true });
await b.mutation(api.posts.like, { id: pa, liked: true });
ok(
  (await a.query(api.posts.get, { id: pa })).likes === 1,
  "Like retries do not duplicate counts",
);
ok(
  (await a.query(api.posts.likers, { id: pa, paginationOpts: page })).page.some(
    (u) => u._id === b.me._id,
  ),
  "Liker list shows the correct member",
);
await b.mutation(api.posts.save, { id: pa, saved: true });
ok(
  (await b.query(api.posts.saved, { paginationOpts: page })).page.some(
    (p) => p._id === pa,
  ),
  "Saved post persists for its owner",
);
ok(
  !(await a.query(api.posts.saved, { paginationOpts: page })).page.some(
    (p) => p._id === pa,
  ),
  "Saved collection stays private",
);
const comment = {
  id: pa,
  text: "BETA TEST — comment retry",
  clientId: "beta-comment-" + stamp,
};
const commentId = await b.mutation(api.posts.comment, comment);
ok(
  (await b.mutation(api.posts.comment, comment)) === commentId,
  "Comment retries create one comment",
);
await a.mutation(api.posts.edit, {
  id: pa,
  caption: "BETA TEST — edited caption",
});
ok(
  (await b.query(api.posts.get, { id: pa })).caption ===
    "BETA TEST — edited caption",
  "Caption edits synchronize",
);
await a.mutation(api.social.follow, { id: b.me._id });
const requests = await b.query(api.users.connections, {
  id: b.me._id,
  kind: "requests",
  paginationOpts: page,
});
const edge = requests.page.find((u) => u._id === a.me._id);
ok(!!edge, "Private follow creates a request");
await b.mutation(api.social.respond, { id: edge.edge, accept: true });
ok(
  !!(await a.query(api.posts.get, { id: pb })),
  "Approved follow unlocks private content",
);
const cid = await a.mutation(api.messages.start, {
  recipient: b.me._id,
  text: "BETA TEST introduction",
  clientId: "beta-intro-" + stamp,
});
let denied = false;
try {
  await a.mutation(api.messages.send, {
    id: cid,
    text: "must wait",
    clientId: "beta-denied-" + stamp,
  });
} catch {
  denied = true;
}
ok(denied, "Messages require recipient acceptance");
await b.mutation(api.messages.respond, { id: cid, accept: true });
const message = {
  id: cid,
  text: "BETA TEST accepted message",
  clientId: "beta-message-" + stamp,
};
const mid = await a.mutation(api.messages.send, message);
ok(
  (await a.mutation(api.messages.send, message)) === mid,
  "Message retries are idempotent",
);
ok(
  (
    await b.query(api.messages.thread, { id: cid, paginationOpts: page })
  ).page.some((m) => m._id === mid),
  "Recipient receives the message",
);
const range = await fetch(site + "/media?id=" + image, {
  headers: {
    Authorization: "Bearer " + (await b.token()),
    Range: "bytes=0-15",
  },
});
ok(
  range.status === 206 && (await range.arrayBuffer()).byteLength === 16,
  "Authenticated media range delivery works",
);
const anon = await fetch(site + "/media?id=" + image);
ok(anon.status === 401, "Anonymous media delivery denied");
await a.mutation(api.social.block, { id: b.me._id });
ok(
  (await b.query(api.posts.saved, { paginationOpts: page })).page.length === 0,
  "Blocking revokes saved-content access",
);
ok(
  (await b.query(api.posts.get, { id: pa })) === null,
  "Blocking revokes post access",
);
await a.mutation(api.social.block, { id: b.me._id });
ok(
  (await a.query(api.posts.get, { id: pb })) === null,
  "Unblocking does not restore a private follow",
);
await a.mutation(api.posts.remove, { id: pa });
await b.mutation(api.posts.remove, { id: pb });
ok(
  (await a.query(api.posts.get, { id: pa })) === null,
  "Deleted post is immediately unavailable",
);
await b.mutation(api.posts.save, { id: pa, saved: false });
fixture.conversation = cid;
fixture.checks = checks;
fixture.complete = true;
persist();
console.log(
  `Completed ${checks} live checks. Only the two labeled test accounts were used. Private test references are in ${fixtureFile}.`,
);
