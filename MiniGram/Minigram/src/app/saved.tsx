import { usePaginatedQuery } from "convex/react";
import { FlatList } from "react-native";
import { api } from "@/lib/api";
import { PostCard } from "@/components/social/post-card";
import {
  Screen,
  Header,
  Loading,
  Empty,
  More,
  ScreenBoundary,
} from "@/components/social/ui";
function Saved() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.saved,
    {},
    { initialNumItems: 15 },
  );
  return (
    <Screen>
      <Header title="Saved posts" back />
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
              icon="bookmark"
              title="Keep the moments you love"
              description="Tap the bookmark on a post to save it here. Only you can see your saved collection. Posts remain subject to their owner's privacy settings."
            />
          )
        }
        ListFooterComponent={
          <More status={status} onPress={() => loadMore(15)} />
        }
        onEndReached={() => {
          if (status === "CanLoadMore") loadMore(15);
        }}
      />
    </Screen>
  );
}
export default function Page() {
  return (
    <ScreenBoundary>
      <Saved />
    </ScreenBoundary>
  );
}
