import { useAuth } from "@clerk/expo";
import { useAction, useMutation } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import {
  createUploadTask,
  FileSystemUploadType,
} from "expo-file-system/legacy";
import { useRef, useState } from "react";
import { ConvexError } from "convex/values";
import { api, type Id } from "@/lib/api";
export type Selection = {
  uri: string;
  kind: "image" | "video";
  size: number;
  mime: string;
};
export function useMediaUpload(purpose: "post" | "message" | "avatar") {
  const { getToken } = useAuth();
  const begin = useMutation(api.media.begin),
    finish = useAction(api.validateMedia.finish),
    [progress, setProgress] = useState(0),
    [uploading, setUploading] = useState(false);
  const cache = useRef<{
    uri: string;
    id: Id<"media">;
    url: string;
    storageId?: Id<"_storage">;
    ready?: boolean;
  } | null>(null);
  const pick = async (): Promise<Selection | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: purpose === "avatar" ? ["images"] : ["images", "videos"],
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (result.canceled) return null;
    const asset = result.assets[0],
      kind = asset.type === "video" ? "video" : "image",
      size = asset.fileSize || new File(asset.uri).size;
    if (!size || size > (kind === "image" ? 10 : 50) * 1024 ** 2)
      throw new Error("Choose an image under 10 MB or a video under 50 MB.");
    if (kind === "video" && asset.duration && asset.duration > 60_000)
      throw new Error("Videos can be up to 60 seconds.");
    cache.current = null;
    setProgress(0);
    return {
      uri: asset.uri,
      kind,
      size,
      mime: asset.mimeType || (kind === "video" ? "video/mp4" : "image/jpeg"),
    };
  };
  const upload = async (selection: Selection): Promise<Id<"media">> => {
    setUploading(true);
    try {
      if (cache.current?.uri !== selection.uri) {
        const ticket = await begin({
          kind: selection.kind,
          purpose,
          size: selection.size,
        });
        cache.current = { ...ticket, uri: selection.uri };
      }
      const current = cache.current!;
      if (current.ready) return current.id;
      if (!current.storageId) {
        const task = createUploadTask(
          current.url,
          selection.uri,
          {
            httpMethod: "POST",
            uploadType: FileSystemUploadType.BINARY_CONTENT,
            headers: {
              "Content-Type": selection.mime,
              Authorization: `Bearer ${await getToken({ template: "convex" })}`,
            },
          },
          (e) =>
            setProgress(
              e.totalBytesExpectedToSend
                ? e.totalBytesSent / e.totalBytesExpectedToSend
                : 0,
            ),
        );
        const result = await task.uploadAsync();
        if (!result || result.status < 200 || result.status >= 300) {
          cache.current = null;
          throw new Error("Upload interrupted. Please try again.");
        }
        const response = JSON.parse(result.body);
        if (!response.storageId) {
          cache.current = null;
          throw new Error("Upload could not be completed.");
        }
        current.storageId = response.storageId;
      }
      const id = await finish({
        id: current.id,
        storageId: current.storageId!,
      });
      current.ready = true;
      setProgress(1);
      return id;
    } catch (error) {
      if (error instanceof ConvexError) cache.current = null;
      throw error;
    } finally {
      setUploading(false);
    }
  };
  return { pick, upload, progress, uploading };
}
