"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { imageSize } from "image-size";
import { ALL_FORMATS, BlobSource, Input } from "mediabunny";
import type { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
export const finish = action({
  args: { id: v.id("media"), storageId: v.id("_storage") },
  handler: async (ctx, args): Promise<Id<"media">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Sign in to continue.");
    const m = await ctx.runMutation(internal.media.claim, {
      ...args,
      subject: identity.subject,
    });
    if (m.state === "ready" || m.state === "attached") return m._id;
    try {
      const blob = await ctx.storage.get(args.storageId);
      if (
        !blob ||
        blob.size <= 0 ||
        blob.size > (m.kind === "image" ? 10 : 50) * 1024 ** 2
      )
        throw new Error("Media exceeds the allowed file size.");
      let width = 0,
        height = 0,
        duration: number | undefined,
        mime = "";
      if (m.kind === "image") {
        const dimensions = imageSize(new Uint8Array(await blob.arrayBuffer()));
        const formats: Record<string, string> = {
          jpg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
          gif: "image/gif",
          heif: "image/heif",
          heic: "image/heic",
        };
        mime = formats[dimensions.type || ""];
        width = dimensions.width;
        height = dimensions.height;
        if (!mime || !width || !height || width * height > 60_000_000)
          throw new Error(
            "Choose a supported image with fewer than 60 megapixels.",
          );
      } else {
        const input = new Input({
          source: new BlobSource(blob),
          formats: ALL_FORMATS,
        });
        try {
          const track = await input.getPrimaryVideoTrack();
          if (!track)
            throw new Error("The selected file does not contain a video.");
          duration = await input.computeDuration();
          width = track.displayWidth;
          height = track.displayHeight;
          const codec = await track.getCodec();
          if (!["avc", "hevc", "vp8", "vp9", "av1"].includes(codec || ""))
            throw new Error("This video format is not supported.");
          if (!Number.isFinite(duration) || duration <= 0 || duration > 60)
            throw new Error("Videos can be up to 60 seconds.");
          mime = await input.getMimeType();
        } finally {
          input.dispose();
        }
      }
      return await ctx.runMutation(internal.media.ready, {
        id: m._id,
        size: blob.size,
        mime,
        width,
        height,
        duration,
      });
    } catch (error) {
      await ctx.runMutation(internal.cleanup.removeMedia, { id: args.id });
      throw new ConvexError(
        error instanceof Error
          ? error.message
          : "Unable to validate this media.",
      );
    }
  },
});
