import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { randomUUID } from "expo-crypto";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";
import { api, type Id, messageOf } from "@/lib/api";
import { PostCard } from "@/components/social/post-card";
import { Avatar } from "@/components/social/media";
import {
  Button,
  Empty,
  ErrorText,
  Field,
  Header,
  IconButton,
  Loading,
  More,
  Screen,
  ScreenBoundary,
  T,
  relativeTime,
  usePalette,
} from "@/components/social/ui";
function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    postId = id as Id<"posts">,
    post = useQuery(api.posts.get, { id: postId }),
    { results, status, loadMore } = usePaginatedQuery(
      api.posts.comments,
      { id: postId },
      { initialNumItems: 20 },
    ),
    add = useMutation(api.posts.comment),
    remove = useMutation(api.posts.removeComment),
    requestId = useRef(randomUUID()),
    inFlight = useRef(false),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    p = usePalette();
  const submit = async () => {
    if (inFlight.current || !text.trim()) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await add({ id: postId, text, clientId: requestId.current });
      setText("");
      requestId.current = randomUUID();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  };
  if (post === undefined)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!post)
    return (
      <Screen>
        <Header title="Post" back />
        <Empty
          icon="lock"
          title="Post unavailable"
          description="It may have been deleted, or you may no longer have access."
        />
      </Screen>
    );
  return (
    <Screen>
      <Header title="Post" back />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={results}
          keyExtractor={(c) => c._id}
          ListHeaderComponent={
            <>
              <PostCard post={post} detail />
              <View style={{ padding: 16 }}>
                <T bold>Comments</T>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: "row",
                gap: 10,
              }}
            >
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/user/[id]",
                    params: { id: item.author._id },
                  })
                }
              >
                <Avatar user={item.author} size={36} />
              </Pressable>
              <View style={{ flex: 1, gap: 3 }}>
                <T size={14}>
                  <T size={14} bold>
                    {item.author.username}{" "}
                  </T>
                  {item.text}
                </T>
                <T size={11} muted>
                  {relativeTime(item._creationTime)}
                </T>
              </View>
              <IconButton
                name="more"
                label="Comment options"
                onPress={() =>
                  Alert.alert("Comment options", undefined, [
                    {
                      text: "Report comment",
                      onPress: () =>
                        router.push({
                          pathname: "/report",
                          params: { type: "comment", id: item._id },
                        }),
                    },
                    ...(item.canDelete
                      ? [
                          {
                            text: "Delete comment",
                            style: "destructive" as const,
                            onPress: () => {
                              remove({ id: item._id }).catch((e) =>
                                setError(messageOf(e)),
                              );
                            },
                          },
                        ]
                      : []),
                    { text: "Cancel", style: "cancel" },
                  ])
                }
              />
            </View>
          )}
          ListEmptyComponent={
            status === "LoadingFirstPage" ? (
              <Loading />
            ) : (
              <View style={{ padding: 24 }}>
                <T muted>No comments yet. Start the conversation.</T>
              </View>
            )
          }
          ListFooterComponent={
            <More status={status} onPress={() => loadMore(20)} />
          }
        />
        <View
          style={{
            padding: 14,
            borderTopWidth: 1,
            borderColor: p.line,
            gap: 8,
          }}
        >
          <ErrorText error={error} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field
                accessibilityLabel="Add a comment"
                placeholder="Add a comment…"
                maxLength={1000}
                value={text}
                onChangeText={setText}
                editable={!busy}
                onSubmitEditing={() => void submit()}
              />
            </View>
            <Button
              busy={busy}
              disabled={!text.trim()}
              onPress={() => void submit()}
            >
              Send
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
export default function Page() {
  return (
    <ScreenBoundary>
      <Detail />
    </ScreenBoundary>
  );
}
