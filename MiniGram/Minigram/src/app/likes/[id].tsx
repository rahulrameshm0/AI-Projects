import { usePaginatedQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, View } from "react-native";
import { api, type Id } from "@/lib/api";
import { Avatar } from "@/components/social/media";
import {
  Screen,
  Header,
  Loading,
  Empty,
  More,
  ScreenBoundary,
  T,
} from "@/components/social/ui";
function Likes() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.likers,
    { id: id as Id<"posts"> },
    { initialNumItems: 30 },
  );
  return (
    <Screen>
      <Header title="Liked by" back />
      <FlatList
        data={results}
        keyExtractor={(u) => u._id}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${item.username}'s profile`}
            onPress={() =>
              router.push({ pathname: "/user/[id]", params: { id: item._id } })
            }
            style={{
              flexDirection: "row",
              padding: 16,
              gap: 12,
              alignItems: "center",
            }}
          >
            <Avatar user={item} />
            <View>
              <T bold>{item.username}</T>
              <T muted size={14}>
                {item.displayName}
              </T>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          status === "LoadingFirstPage" ? (
            <Loading />
          ) : (
            <Empty
              icon="heart"
              title="No likes yet"
              description="People who like this post will appear here."
            />
          )
        }
        ListFooterComponent={
          <More status={status} onPress={() => loadMore(30)} />
        }
        onEndReached={() => {
          if (status === "CanLoadMore") loadMore(30);
        }}
      />
    </Screen>
  );
}
export default function Page() {
  return (
    <ScreenBoundary>
      <Likes />
    </ScreenBoundary>
  );
}
