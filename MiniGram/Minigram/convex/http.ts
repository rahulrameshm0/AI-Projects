import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
const http = httpRouter();
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Range, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Expose-Headers":
    "Content-Range, Accept-Ranges, Content-Length",
  "Cache-Control": "no-store, private",
  Vary: "Authorization",
};
http.route({
  path: "/media",
  method: "OPTIONS",
  handler: httpAction(
    async () => new Response(null, { status: 204, headers: cors }),
  ),
});
http.route({
  path: "/media",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return new Response("Unauthorized", { status: 401, headers: cors });
    const url = new URL(request.url),
      raw = url.searchParams.get("id");
    if (!raw) return new Response("Not found", { status: 404, headers: cors });
    try {
      const media = await ctx.runQuery(internal.media.authorize, {
        id: raw as import("./_generated/dataModel").Id<"media">,
        subject: identity.subject,
      });
      if (!media?.storageId)
        return new Response("Not found", { status: 404, headers: cors });
      const blob = await ctx.storage.get(media.storageId);
      if (!blob)
        return new Response("Not found", { status: 404, headers: cors });
      const headers = {
        ...cors,
        "Content-Type": media.mime || "application/octet-stream",
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
      };
      const range = request.headers.get("Range");
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2]))
          return new Response(null, {
            status: 416,
            headers: { ...headers, "Content-Range": `bytes */${blob.size}` },
          });
        let start = match[1]
            ? Number(match[1])
            : Math.max(0, blob.size - Number(match[2])),
          end = match[1]
            ? match[2]
              ? Number(match[2])
              : blob.size - 1
            : blob.size - 1;
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start < 0 ||
          start >= blob.size ||
          end < start
        )
          return new Response(null, {
            status: 416,
            headers: { ...headers, "Content-Range": `bytes */${blob.size}` },
          });
        end = Math.min(end, blob.size - 1);
        return new Response(blob.slice(start, end + 1), {
          status: 206,
          headers: {
            ...headers,
            "Content-Range": `bytes ${start}-${end}/${blob.size}`,
            "Content-Length": String(end - start + 1),
          },
        });
      }
      return new Response(blob, {
        headers: { ...headers, "Content-Length": String(blob.size) },
      });
    } catch {
      return new Response("Not found", { status: 404, headers: cors });
    }
  }),
});
http.route({
  path: "/evidence",
  method: "OPTIONS",
  handler: httpAction(
    async () => new Response(null, { status: 204, headers: cors }),
  ),
});
http.route({
  path: "/evidence",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return new Response("Unauthorized", { status: 401, headers: cors });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return new Response("Not found", { status: 404, headers: cors });
    try {
      const evidence = await ctx.runQuery(internal.admin.evidence, {
        id: id as import("./_generated/dataModel").Id<"reports">,
        subject: identity.subject,
      });
      if (!evidence)
        return new Response("Not found", { status: 404, headers: cors });
      const blob = await ctx.storage.get(evidence.storageId);
      if (!blob)
        return new Response("Not found", { status: 404, headers: cors });
      return new Response(blob, {
        headers: {
          ...cors,
          "Content-Type": evidence.mime,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return new Response("Not found", { status: 404, headers: cors });
    }
  }),
});
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) return new Response("Not configured", { status: 503 });
    const id = request.headers.get("svix-id"),
      stamp = request.headers.get("svix-timestamp"),
      signature = request.headers.get("svix-signature");
    if (
      !id ||
      !stamp ||
      !signature ||
      Math.abs(Date.now() / 1000 - Number(stamp)) > 300 ||
      !Number.isFinite(Number(stamp))
    )
      return new Response("Invalid signature", { status: 400 });
    const raw = await request.text();
    if (raw.length > 1_000_000)
      return new Response("Too large", { status: 413 });
    try {
      const keyBytes = Uint8Array.from(
        atob(secret.replace(/^whsec_/, "")),
        (c) => c.charCodeAt(0),
      );
      const key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signed = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(`${id}.${stamp}.${raw}`),
      );
      const expected = btoa(String.fromCharCode(...new Uint8Array(signed)));
      const equal = (a: string, b: string) => {
        if (a.length !== b.length) return false;
        let diff = 0;
        for (let i = 0; i < a.length; i++)
          diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
        return diff === 0;
      };
      if (
        !signature
          .split(" ")
          .some((s) => s.startsWith("v1,") && equal(s.slice(3), expected))
      )
        return new Response("Invalid signature", { status: 400 });
      const event = JSON.parse(raw);
      if (
        (event.type === "user.deleted" || event.type === "user.updated") &&
        typeof event.data?.id === "string"
      )
        await ctx.runMutation(internal.webhooks.sync, {
          subject: event.data.id,
          deleted: event.type === "user.deleted",
          banned: event.data.banned === true,
        });
      return new Response("ok");
    } catch {
      return new Response("Invalid request", { status: 400 });
    }
  }),
});
http.route({
  path: "/upload",
  method: "OPTIONS",
  handler: httpAction(
    async () =>
      new Response(null, {
        status: 204,
        headers: { ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS" },
      }),
  ),
});
http.route({
  path: "/upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return new Response("Unauthorized", { status: 401, headers: cors });
    const raw = new URL(request.url).searchParams.get("id");
    if (!raw) return new Response("Not found", { status: 404, headers: cors });
    const id = raw as import("./_generated/dataModel").Id<"media">;
    let reserved = false,
      stored: import("./_generated/dataModel").Id<"_storage"> | undefined;
    try {
      const m = await ctx.runMutation(internal.media.reserveUpload, {
        id,
        subject: identity.subject,
      });
      if (m.storageId)
        return Response.json({ storageId: m.storageId }, { headers: cors });
      reserved = true;
      const length = request.headers.get("Content-Length");
      if (length && Number(length) > m.size)
        throw new Error("The uploaded file exceeds its reserved size.");
      const reader = request.body?.getReader();
      if (!reader) throw new Error("No file was supplied.");
      const parts: Uint8Array<ArrayBuffer>[] = [];
      let received = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        received += chunk.value.byteLength;
        if (received > m.size) {
          await reader.cancel();
          throw new Error("The uploaded file exceeds its reserved size.");
        }
        parts.push(chunk.value);
      }
      if (received !== m.size) throw new Error("The upload was interrupted.");
      stored = await ctx.storage.store(
        new Blob(parts, {
          type:
            request.headers.get("Content-Type") || "application/octet-stream",
        }),
      );
      await ctx.runMutation(internal.media.storeUpload, {
        id,
        storageId: stored,
        subject: identity.subject,
      });
      return Response.json({ storageId: stored }, { headers: cors });
    } catch {
      if (stored) await ctx.storage.delete(stored);
      if (reserved) await ctx.runMutation(internal.cleanup.removeMedia, { id });
      return new Response("Unable to upload this file.", {
        status: 400,
        headers: cors,
      });
    }
  }),
});
export default http;
