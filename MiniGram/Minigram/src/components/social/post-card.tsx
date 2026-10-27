import { useMutation } from "convex/react";
import { router } from "expo-router";
import { Alert, Pressable, View } from "react-native";
import { useRef, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api, messageOf } from "@/lib/api";
import { Avatar, Media } from "./media";
import { ErrorText, Icon, IconButton, T, relativeTime, usePalette } from "./ui";
export type Post = NonNullable<FunctionReturnType<typeof api.posts.get>>;
export function PostCard({
  post,
  detail = false,
}: {
  post: Post;
  detail?: boolean;
}) {
  const p = usePalette(),
    like = useMutation(api.posts.like),
    remove = useMutation(api.posts.remove),
    save = useMutation(api.posts.save),
    inFlight = useRef(false),
    [saving, setSaving] = useState(false),
    [optimisticLike, setOptimisticLike] = useState<boolean | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const toggleLike = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const desired = !post.liked;
    setOptimisticLike(desired);
    setBusy(true);
    setError("");
    try {
      await like({ id: post._id, liked: desired });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      inFlight.current = false;
      setOptimisticLike(null);
      setBusy(false);
    }
  };
  const liked = optimisticLike ?? post.liked;
  const likes = Math.max(
    0,
    post.likes + (liked === post.liked ? 0 : liked ? 1 : -1),
  );
  const toggleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await save({ id: post._id, saved: !post.saved });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setSaving(false);
    }
  };
  const menu = () =>
    Alert.alert("Post options", undefined, [
      {
        text: "Report post",
        onPress: () =>
          router.push({
            pathname: "/report",
            params: { type: "post", id: post._id },
          }),
      },
      ...(post.own
        ? [
            {
              text: "Edit caption",
              onPress: () =>
                router.push({
                  pathname: "/edit-post/[id]",
                  params: { id: post._id },
                }),
            },
            {
              text: "Delete post",
              style: "destructive" as const,
              onPress: () =>
                Alert.alert(
                  "Delete this post?",
                  "Your post will be removed from MiniGram.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        remove({ id: post._id })
                          .then(() => {
                            if (detail) router.replace("/(tabs)");
                          })
                          .catch((e) => setError(messageOf(e)));
                      },
                    },
                  ],
                ),
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" },
    ]);
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: p.line,
        paddingBottom: 18,
      }}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${post.author.username}'s profile`}
          onPress={() =>
            router.push({
              pathname: "/user/[id]",
              params: { id: post.author._id },
            })
          }
        >
          <Avatar user={post.author} />
        </Pressable>
        <Pressable
          style={{ flex: 1 }}
          onPress={() =>
            router.push({
              pathname: "/user/[id]",
              params: { id: post.author._id },
            })
          }
        >
          <T bold size={14}>
            {post.author.username}
          </T>
          <T size={12} muted>
            {relativeTime(post._creationTime)}
          </T>
        </Pressable>
        <IconButton name="more" label="Post options" onPress={menu} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View post"
        onPress={() => {
          if (!detail)
            router.push({ pathname: "/post/[id]", params: { id: post._id } });
        }}
        disabled={post.media.kind === "video"}
      >
        <Media
          id={post.media._id}
          kind={post.media.kind}
          ratio={
            post.media.width && post.media.height
              ? Math.max(
                  0.8,
                  Math.min(1.5, post.media.width / post.media.height),
                )
              : 1
          }
        />
      </Pressable>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={liked ? "Unlike post" : "Like post"}
            accessibilityState={{ disabled: busy, selected: liked }}
            onPress={() => void toggleLike()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 32,
            }}
          >
            <Icon
              name="heart"
              color={liked ? p.accent : p.text}
              filled={liked}
            />
            <T bold size={14}>
              {likes}
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View comments"
            onPress={() =>
              router.push({ pathname: "/post/[id]", params: { id: post._id } })
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 32,
            }}
          >
            <Icon name="comment" />
            <T size={14}>{post.comments}</T>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={post.saved ? "Unsave post" : "Save post"}
            accessibilityState={{ selected: post.saved, disabled: saving }}
            disabled={saving}
            onPress={() => void toggleSave()}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="bookmark" filled={post.saved} />
          </Pressable>
        </View>
        {likes > 0 && (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/likes/[id]", params: { id: post._id } })
            }
            accessibilityRole="button"
            accessibilityLabel="See who liked this post"
          >
            <T size={13} bold>
              {likes === 1
                ? "1 person likes this"
                : `${likes} people like this`}
            </T>
          </Pressable>
        )}
        {!!post.editedAt && (
          <T muted size={11}>
            Edited
          </T>
        )}
        {!!post.caption && (
          <T size={14}>
            <T bold size={14}>
              {post.author.username}{" "}
            </T>
            {post.caption}
          </T>
        )}
        {!detail && post.comments > 0 && (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/post/[id]", params: { id: post._id } })
            }
          >
            <T size={13} muted>
              View{" "}
              {post.comments === 1
                ? "comment"
                : `all ${post.comments} comments`}
            </T>
          </Pressable>
        )}
        <ErrorText error={error} />
      </View>
    </View>
  );
}
