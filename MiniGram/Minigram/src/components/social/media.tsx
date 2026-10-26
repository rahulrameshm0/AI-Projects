import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useMemo, useState } from "react";
import { Pressable, View, ActivityIndicator } from "react-native";
import { useMediaToken, siteUrl } from "@/providers/app-state";
import type { Id } from "@/lib/api";
import { Icon, T, usePalette } from "./ui";
export function Media({
  id,
  kind = "image",
  ratio = 1,
  uri,
  thumbnail = false,
}: {
  id?: Id<"media">;
  kind?: "image" | "video";
  ratio?: number;
  uri?: string;
  thumbnail?: boolean;
}) {
  const token = useMediaToken(),
    p = usePalette(),
    [failedSource, setFailedSource] = useState<string | null>(null);
  const source = useMemo(
    () =>
      uri
        ? { uri }
        : id && token && siteUrl
          ? {
              uri: `${siteUrl}/media?id=${encodeURIComponent(id)}`,
              headers: { Authorization: `Bearer ${token}` },
            }
          : null,
    [id, token, uri],
  );
  const failed = failedSource === (uri || id);
  if (kind === "video" && thumbnail)
    return (
      <View
        style={{
          aspectRatio: ratio,
          backgroundColor: p.surface,
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon name="image" size={30} color={p.muted} />
        <T size={12} muted>
          Video
        </T>
      </View>
    );
  if (failed)
    return (
      <View
        style={{
          aspectRatio: ratio,
          backgroundColor: p.surface,
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <Icon name="image" color={p.muted} />
        <T muted size={13}>
          Media unavailable
        </T>
        <Pressable onPress={() => setFailedSource(null)}>
          <T bold size={13}>
            Retry
          </T>
        </Pressable>
      </View>
    );
  if (!source)
    return (
      <View
        style={{
          aspectRatio: ratio,
          backgroundColor: p.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={p.muted} />
      </View>
    );
  if (kind === "video") return <Video source={source} ratio={ratio} />;
  return (
    <Image
      accessibilityLabel="Post photo"
      source={source}
      style={{ width: "100%", aspectRatio: ratio, backgroundColor: p.surface }}
      contentFit="cover"
      cachePolicy="none"
      onError={() => setFailedSource(uri || id || "")}
    />
  );
}
function Video({
  source,
  ratio,
}: {
  source: { uri: string; headers?: Record<string, string> };
  ratio: number;
}) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={{ width: "100%", aspectRatio: ratio, backgroundColor: "#111" }}
      nativeControls
      fullscreenOptions={{ enable: true }}
    />
  );
}
export function Avatar({
  user,
  size = 42,
}: {
  user:
    | { avatar?: Id<"media">; displayName?: string; username?: string }
    | null
    | undefined;
  size?: number;
}) {
  const p = usePalette(),
    token = useMediaToken();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: p.line,
      }}
    >
      {user?.avatar && token && siteUrl ? (
        <Image
          source={{
            uri: `${siteUrl}/media?id=${encodeURIComponent(user.avatar)}`,
            headers: { Authorization: `Bearer ${token}` },
          }}
          style={{ width: size, height: size }}
          contentFit="cover"
          cachePolicy="none"
        />
      ) : (
        <T size={size * 0.35} bold>
          {(user?.displayName || user?.username || "?")
            .slice(0, 2)
            .toUpperCase()}
        </T>
      )}
    </View>
  );
}
