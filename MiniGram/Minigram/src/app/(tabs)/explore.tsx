import { usePaginatedQuery, useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { api } from "@/lib/api";
import { Avatar, Media } from "@/components/social/media";
import {
  Screen,
  Header,
  Field,
  T,
  Empty,
  Loading,
  More,
  Icon,
  ScreenBoundary,
} from "@/components/social/ui";
function Explore() {
  const [search, setSearch] = useState(""),
    people = useQuery(
      api.users.search,
      search.trim() ? { prefix: search } : "skip",
    ),
    { results, status, loadMore } = usePaginatedQuery(
      api.posts.feed,
      { mode: "explore" },
      { initialNumItems: 21 },
    );
  return (
    <Screen>
      <Header title="Explore" />
      <View style={{ padding: 16 }}>
        <Field
          accessibilityLabel="Search people"
          placeholder="Search people by name or username"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      {search.trim() ? (
        people === undefined ? (
          <Loading />
        ) : (
          <FlatList
            data={people}
            keyExtractor={(u) => u._id}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/user/[id]",
                    params: { id: item._id },
                  })
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  gap: 12,
                }}
              >
                <Avatar user={item} size={48} />
                <View style={{ flex: 1 }}>
                  <T bold>{item.username}</T>
                  <T muted size={14}>
                    {item.displayName}
                  </T>
                  <T muted size={12}>
                    {item.privacy === "private"
                      ? "Private account"
                      : "Public account"}
                  </T>
                </View>
                <Icon name="back" />
              </Pressable>
            )}
            ListEmptyComponent={
              <Empty
                icon="search"
                title="No people found"
                description="Try a different name or check your spelling."
              />
            }
          />
        )
      ) : (
        <FlatList
          key="grid"
          numColumns={3}
          data={results}
          keyExtractor={(p) => p._id}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${item.author.username}'s post`}
              onPress={() =>
                router.push({
                  pathname: "/post/[id]",
                  params: { id: item._id },
                })
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
                  <T bold style={{ color: "#fff" }} size={11}>
                    VIDEO
                  </T>
                </View>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            status === "LoadingFirstPage" ? (
              <Loading />
            ) : (
              <Empty
                title="A place for real moments"
                description="Public photos and videos from the MiniGram community will appear here."
                label="Share a moment"
                action={() => router.push("/compose")}
              />
            )
          }
          ListFooterComponent={
            <More status={status} onPress={() => loadMore(21)} />
          }
          onEndReached={() => {
            if (status === "CanLoadMore") loadMore(21);
          }}
        />
      )}
    </Screen>
  );
}
export default function Page() {
  return (
    <ScreenBoundary>
      <Explore />
    </ScreenBoundary>
  );
}
