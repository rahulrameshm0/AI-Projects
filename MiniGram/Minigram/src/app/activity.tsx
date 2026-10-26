import { useMutation, usePaginatedQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect } from "react";
import { FlatList, Pressable, View } from "react-native";
import { api } from "@/lib/api";
import { useMe } from "@/providers/app-state";
import { Avatar } from "@/components/social/media";
import {
  Screen,
  Header,
  T,
  Button,
  Empty,
  Loading,
  More,
  ScreenBoundary,
  relativeTime,
} from "@/components/social/ui";
function Activity() {
  const me = useMe(),
    { results, status, loadMore } = usePaginatedQuery(
      api.activity.list,
      {},
      { initialNumItems: 30 },
    ),
    mark = useMutation(api.activity.markRead);
  useEffect(() => {
    void mark().catch(() => {});
  }, [mark]);
  return (
    <Screen>
      <Header title="Activity" back />
      <View style={{ padding: 16 }}>
        <Button
          secondary
          onPress={() =>
            router.push({
              pathname: "/connections",
              params: { id: me._id, kind: "requests" },
            })
          }
        >
          Follow requests
        </Button>
      </View>
      <FlatList
        data={results}
        keyExtractor={(a) => a._id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              item.post
                ? router.push({
                    pathname: "/post/[id]",
                    params: { id: item.post },
                  })
                : item.kind === "request"
                  ? router.push({
                      pathname: "/connections",
                      params: { id: me._id, kind: "requests" },
                    })
                  : router.push({
                      pathname: "/user/[id]",
                      params: { id: item.actor._id },
                    })
            }
            style={{
              flexDirection: "row",
              padding: 16,
              gap: 12,
              alignItems: "center",
            }}
          >
            <Avatar user={item.actor} />
            <View style={{ flex: 1 }}>
              <T size={14}>
                <T bold size={14}>
                  {item.actor.username}{" "}
                </T>
                {item.kind === "like"
                  ? "liked your post."
                  : item.kind === "comment"
                    ? "commented on your post."
                    : item.kind === "request"
                      ? "requested to follow you."
                      : "is now connected with you."}
              </T>
              <T muted size={12}>
                {relativeTime(item._creationTime)}
              </T>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          status === "LoadingFirstPage" ? (
            <Loading />
          ) : (
            <Empty
              icon="bell"
              title="You’re all caught up"
              description="Likes, comments, and new connections will appear here."
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
      <Activity />
    </ScreenBoundary>
  );
}
