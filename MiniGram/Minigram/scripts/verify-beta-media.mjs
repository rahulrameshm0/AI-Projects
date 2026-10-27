import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { ConvexHttpClient } from "convex/browser";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { api } from "../convex/_generated/api.js";
const fixture = JSON.parse(
  readFileSync(".beta-test-access.local.json", "utf8"),
);
if (!fixture.complete || fixture.users.length !== 2)
  throw new Error("Run the approved beta fixture checks first.");
const k = spawnSync("npx", ["convex", "env", "get", "CLERK_SECRET_KEY"], {
  encoding: "utf8",
});
const key = k.stdout.trim();
if (k.status || !key.startsWith("sk_test_"))
  throw new Error("Development credentials required.");
const clerk = async (path, body) => {
  const r = await fetch("https://api.clerk.com/v1" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error("Clerk test request failed: " + r.status);
  return d;
};
const clients = [];
for (const u of fixture.users) {
  const user = await clerk("/users/" + u.clerkId);
  if (user.private_metadata?.minigram_beta_test !== true)
    throw new Error("Only marked test accounts are allowed.");
  const session = await clerk("/sessions", { user_id: u.clerkId });
  const jwt = (await clerk(`/sessions/${session.id}/tokens`, {})).jwt;
  const client = new ConvexHttpClient(fixture.url);
  client.setAuth(jwt);
  clients.push({ client, jwt });
}
const [a, b] = clients,
  site = fixture.url.replace(".convex.cloud", ".convex.site");
const path = "artifacts/beta-test-video.mp4";
const encoded = spawnSync(
  ffmpeg.path,
  [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=black:s=160x160:d=1",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    path,
  ],
  { encoding: "utf8" },
);
if (encoded.status !== 0)
  throw new Error("Unable to create synthetic test video.");
const bytes = readFileSync(path),
  ticket = await a.client.mutation(api.media.begin, {
    kind: "video",
    purpose: "message",
    size: bytes.length,
  });
const sent = await fetch(ticket.url, {
  method: "POST",
  headers: { Authorization: "Bearer " + a.jwt, "Content-Type": "video/mp4" },
  body: bytes,
});
if (!sent.ok) throw new Error("Video upload failed: " + sent.status);
const storage = await sent.json(),
  media = await a.client.action(api.validateMedia.finish, {
    id: ticket.id,
    storageId: storage.storageId,
  });
const mid = await a.client.mutation(api.messages.send, {
  id: fixture.conversation,
  text: "BETA TEST video",
  media,
  clientId: "beta-video-" + Date.now(),
});
const thread = await b.client.query(api.messages.thread, {
  id: fixture.conversation,
  paginationOpts: { numItems: 30, cursor: null },
});
if (!thread.page.some((m) => m._id === mid && m.mediaKind === "video"))
  throw new Error("Recipient cannot see video attachment.");
const range = await fetch(site + "/media?id=" + media, {
  headers: { Authorization: "Bearer " + b.jwt, Range: "bytes=0-31" },
});
if (range.status !== 206 || (await range.arrayBuffer()).byteLength !== 32)
  throw new Error("Video range delivery failed.");
await a.client.mutation(api.messages.unsend, { id: mid });
const revoked = await fetch(site + "/media?id=" + media, {
  headers: { Authorization: "Bearer " + b.jwt },
});
if (revoked.status !== 404)
  throw new Error("Unsend did not revoke video access.");
writeFileSync(
  "artifacts/beta-media-check.json",
  JSON.stringify(
    {
      videoValidation: true,
      videoMessageDelivery: true,
      videoRangeDelivery: true,
      unsendRevocation: true,
      checkedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(
  "PASS video upload and trusted duration validation\nPASS accepted video message delivery\nPASS authenticated video seeking/range response\nPASS unsend immediately revokes video access",
);
