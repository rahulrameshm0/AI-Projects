import { useMutation, usePaginatedQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, View } from "react-native";
import { api, type Id, messageOf } from "@/lib/api";
import { useMe } from "@/providers/app-state";
import { Avatar } from "@/components/social/media";
import {
  Screen,
  Header,
  T,
  Button,
  Empty,
  ErrorText,
  Loading,
  More,
  ScreenBoundary,
} from "@/components/social/ui";
function Connections() {
  const { id, kind: raw } = useLocalSearchParams<{
      id: string;
      kind: string;
    }>(),
    kind =
      raw === "requests"
        ? "requests"
        : raw === "following"
          ? "following"
          : "followers",
    me = useMe(),
    { results, status, loadMore } = usePaginatedQuery(
      api.users.connections,
      { id: id as Id<"users">, kind },
      { initialNumItems: 30 },
    ),
    respond = useMutation(api.social.respond),
    remove = useMutation(api.social.removeFollower),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState("");
  const run = async (key: string, action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(key);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Screen>
      <Header
        title={
          kind === "requests"
            ? "Follow requests"
            : kind === "following"
              ? "Following"
              : "Followers"
        }
        back
      />
      <View style={{ paddingHorizontal: 20 }}>
        <ErrorText error={error} />
      </View>
      <FlatList
        data={results}
        keyExtractor={(u) => u._id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/user/[id]",
                  params: { id: item._id },
                })
              }
            >
              <Avatar user={item} size={46} />
            </Pressable>
            <Pressable
              style={{ flex: 1 }}
              onPress={() =>
                router.push({
                  pathname: "/user/[id]",
                  params: { id: item._id },
                })
              }
            >
              <T bold size={14}>
                {item.username}
              </T>
              <T muted size={12}>
                {item.displayName}
              </T>
            </Pressable>
            {kind === "requests" ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  small
                  busy={busy === item._id}
                  disabled={!!busy}
                  onPress={() =>
                    void run(item._id, () =>
                      respond({ id: item.edge, accept: true }),
                    )
                  }
                >
                  Accept
                </Button>
                <Button
                  small
                  secondary
                  disabled={!!busy}
                  onPress={() =>
                    void run(item._id, () =>
                      respond({ id: item.edge, accept: false }),
                    )
                  }
                >
                  Decline
                </Button>
              </View>
            ) : kind === "followers" && id === me._id ? (
              <Button
                small
                secondary
                disabled={!!busy}
                onPress={() =>
                  Alert.alert(
                    "Remove follower?",
                    `${item.username} will need to request again if your account is private.`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: () =>
                          void run(item._id, () => remove({ id: item._id })),
                      },
                    ],
                  )
                }
              >
                Remove
              </Button>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          status === "LoadingFirstPage" ? (
            <Loading />
          ) : (
            <Empty
              icon="user"
              title={
                kind === "requests" ? "No follow requests" : "No accounts yet"
              }
              description={
                kind === "requests"
                  ? "When people ask to follow you, their requests will appear here."
                  : "Find people in Explore to grow your community."
              }
            />
          )
        }
        ListFooterComponent={
          <More status={status} onPress={() => loadMore(30)} />
        }
      />
    </Screen>
  );
}
export default function Page() {
  return (
    <ScreenBoundary>
      <Connections />
    </ScreenBoundary>
  );
}
