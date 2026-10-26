import { usePaginatedQuery, useQuery } from "convex/react";
import { router } from "expo-router";
import { FlatList } from "react-native";
import { api } from "@/lib/api";
import { PostCard } from "@/components/social/post-card";
import {
  Screen,
  Header,
  IconButton,
  Empty,
  Loading,
  More,
  ScreenBoundary,
} from "@/components/social/ui";
function Home() {
  const { results, status, loadMore } = usePaginatedQuery(
      api.posts.feed,
      { mode: "home" },
      { initialNumItems: 15 },
    ),
    unread = useQuery(api.activity.unread, {});
  return (
    <Screen>
      <Header title="MiniGram">
        <IconButton
          name="bell"
          label="Activity"
          badge={unread}
          onPress={() => router.push("/activity")}
        />
        <IconButton
          name="plus"
          label="Create a post"
          onPress={() => router.push("/compose")}
        />
      </Header>
      <FlatList
        data={results}
        keyExtractor={(p) => p._id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={
          status === "LoadingFirstPage" ? (
            <Loading />
          ) : (
            <Empty
              title="Your feed starts here"
              description="Follow people to see their photos and videos, or share your first moment."
              label="Discover people"
              action={() => router.push("/(tabs)/explore")}
            />
          )
        }
        ListFooterComponent={
          <More status={status} onPress={() => loadMore(15)} />
        }
        onEndReached={() => {
          if (status === "CanLoadMore") loadMore(15);
        }}
        onEndReachedThreshold={0.4}
      />
    </Screen>
  );
}
export default function Page() {
  return (
    <ScreenBoundary>
      <Home />
    </ScreenBoundary>
  );
}
