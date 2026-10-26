import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, View } from "react-native";
import { api, type Id, messageOf } from "@/lib/api";
import { useMe } from "@/providers/app-state";
import { Avatar, Media } from "./media";
import {
  Button,
  Empty,
  ErrorText,
  Header,
  Icon,
  IconButton,
  Loading,
  More,
  Screen,
  ScreenBoundary,
  T,
  usePalette,
} from "./ui";
function Content({ id, back }: { id: Id<"users">; back: boolean }) {
  const me = useMe(),
    p = usePalette(),
    user = useQuery(api.users.get, { id }),
    follow = useMutation(api.social.follow),
    block = useMutation(api.social.block),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.feed,
    { mode: "explore", author: id },
    { initialNumItems: 18 },
  );
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  if (user === undefined)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!user)
    return (
      <Screen>
        <Header title="Profile" back={back} />
        <Empty
          icon="user"
          title="Account unavailable"
          description="This account is no longer available."
        />
      </Screen>
    );
  const own = me._id === id;
  const menu = () =>
    Alert.alert("Account options", undefined, [
      {
        text: "Report account",
        onPress: () =>
          router.push({ pathname: "/report", params: { type: "user", id } }),
      },
      {
        text: user.blocked ? "Unblock account" : "Block account",
        style: "destructive",
        onPress: () => void run(() => block({ id })),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  const stats = (
    label: string,
    count: number,
    kind?: "followers" | "following",
  ) => (
    <Pressable
      disabled={!kind || !user.canView}
      onPress={() =>
        router.push({ pathname: "/connections", params: { id, kind } })
      }
      style={{ alignItems: "center", flex: 1 }}
    >
      <T size={21} bold>
        {count}
      </T>
      <T muted size={12}>
        {label}
      </T>
    </Pressable>
  );
  const header = (
    <View style={{ padding: 20, gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
        <Avatar user={user} size={82} />
        <View style={{ flex: 1, flexDirection: "row" }}>
          {stats("posts", user.postCount)}
          {stats("followers", user.followers, "followers")}
          {stats("following", user.following, "following")}
        </View>
      </View>
      <View>
        <T bold size={18}>
          {user.displayName}
        </T>
        {!!user.bio && (
          <T size={14} style={{ marginTop: 4 }}>
            {user.bio}
          </T>
        )}
      </View>
      {own ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button secondary onPress={() => router.push("/edit-profile")}>
              Edit profile
            </Button>
          </View>
          <IconButton
            name="settings"
            label="Settings"
            onPress={() => router.push("/settings")}
          />
        </View>
      ) : user.blocked ? (
        <Button
          secondary
          onPress={() => void run(() => block({ id }))}
          busy={busy}
        >
          Unblock account
        </Button>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              busy={busy}
              secondary={!!user.relationship}
              onPress={() => void run(() => follow({ id }))}
            >
              {user.relationship === "accepted"
                ? "Following"
                : user.relationship === "pending"
                  ? "Requested"
                  : user.privacy === "private"
                    ? "Request to follow"
                    : "Follow"}
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              onPress={() =>
                router.push({ pathname: "/new-message", params: { id } })
              }
            >
              Message
            </Button>
          </View>
        </View>
      )}
      <ErrorText error={error} />
      <View
        style={{
          alignItems: "center",
          borderTopWidth: 1,
          borderTopColor: p.line,
          paddingTop: 16,
        }}
      >
        <Icon name="grid" />
      </View>
    </View>
  );
  return (
    <Screen>
      <Header title={user.username || "Profile"} back={back}>
        {own ? (
          <IconButton
            name="bell"
            label="Follow requests"
            onPress={() =>
              router.push({
                pathname: "/connections",
                params: { id, kind: "requests" },
              })
            }
          />
        ) : (
          <IconButton name="more" label="Account options" onPress={menu} />
        )}
      </Header>
      <FlatList
        data={user.canView ? results : []}
        numColumns={3}
        keyExtractor={(p) => p._id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View post"
            onPress={() =>
              router.push({ pathname: "/post/[id]", params: { id: item._id } })
            }
            style={{ width: "33.333%", padding: 1 }}
          >
            <Media
              id={item.media._id}
              kind={item.media.kind}
              thumbnail
              ratio={1}
            />
            {item.media.kind === "video" && (
              <View style={{ position: "absolute", top: 8, right: 8 }}>
                <T size={11} style={{ color: "#fff" }} bold>
                  VIDEO
                </T>
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          !user.canView ? (
            <Empty
              icon="lock"
              title={
                user.blocked
                  ? "You blocked this account"
                  : "This account is private"
              }
              description={
                user.blocked
                  ? "Unblock this account to interact again. Previous follows are not restored."
                  : "Request to follow to see their photos and videos."
              }
            />
          ) : status === "LoadingFirstPage" ? (
            <Loading />
          ) : (
            <Empty
              title={own ? "Share your first moment" : "No posts yet"}
              description={
                own
                  ? "Your photos and videos will appear on your profile."
                  : "When they share a moment, it will appear here."
              }
              action={own ? () => router.push("/compose") : undefined}
              label={own ? "Create a post" : undefined}
            />
          )
        }
        ListFooterComponent={
          user.canView ? (
            <More status={status} onPress={() => loadMore(18)} />
          ) : undefined
        }
        onEndReached={() => {
          if (user.canView && status === "CanLoadMore") loadMore(18);
        }}
      />
    </Screen>
  );
}
export function ProfileScreen({
  id,
  back = false,
}: {
  id: Id<"users">;
  back?: boolean;
}) {
  return (
    <ScreenBoundary>
      <Content id={id} back={back} />
    </ScreenBoundary>
  );
}
