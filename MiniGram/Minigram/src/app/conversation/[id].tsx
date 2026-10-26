import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";
import { api, type Id, messageOf } from "@/lib/api";
import { useMediaUpload, type Selection } from "@/hooks/use-media-upload";
import { Media } from "@/components/social/media";
import {
  Button,
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
function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    cid = id as Id<"conversations">,
    c = useQuery(api.messages.get, { id: cid }),
    { results, status, loadMore } = usePaginatedQuery(
      api.messages.thread,
      { id: cid },
      { initialNumItems: 30 },
    ),
    send = useMutation(api.messages.send),
    respond = useMutation(api.messages.respond),
    read = useMutation(api.messages.read),
    unsend = useMutation(api.messages.unsend),
    [body, setBody] = useState(""),
    [selection, setSelection] = useState<Selection | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    clientId = useRef(randomUUID()),
    upload = useMediaUpload("message"),
    p = usePalette();
  const lastAt = c?.lastAt;
  useEffect(() => {
    if (lastAt !== undefined) read({ id: cid }).catch(() => {});
  }, [lastAt, cid, read]);
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
  const submit = () =>
    run(async () => {
      const media = selection ? await upload.upload(selection) : undefined;
      await send({ id: cid, text: body, media, clientId: clientId.current });
      setBody("");
      setSelection(null);
      clientId.current = randomUUID();
    });
  const attach = async () => {
    try {
      setError("");
      const result = await upload.pick();
      if (result) setSelection(result);
    } catch (e) {
      setError(messageOf(e));
    }
  };
  if (!c)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  const allowed = c.status === "accepted" && !c.blocked && !!c.other;
  return (
    <Screen>
      <Header title={c.other?.displayName || "Deleted account"} back>
        <IconButton
          name="more"
          label="Conversation options"
          onPress={() => {
            if (c.other)
              router.push({
                pathname: "/user/[id]",
                params: { id: c.other._id },
              });
          }}
        />
      </Header>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          inverted
          data={results}
          keyExtractor={(m) => m._id}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          ListFooterComponent={
            <More status={status} onPress={() => loadMore(30)} />
          }
          onEndReached={() => {
            if (status === "CanLoadMore") loadMore(30);
          }}
          renderItem={({ item }) => {
            const own = item.sender === c.own;
            return (
              <View style={{ alignItems: own ? "flex-end" : "flex-start" }}>
                <Pressable
                  onLongPress={() =>
                    Alert.alert(
                      "Message options",
                      undefined,
                      item.deleted
                        ? [{ text: "Cancel", style: "cancel" }]
                        : [
                            {
                              text: "Report message",
                              onPress: () =>
                                router.push({
                                  pathname: "/report",
                                  params: { type: "message", id: item._id },
                                }),
                            },
                            ...(own
                              ? [
                                  {
                                    text: "Unsend message",
                                    style: "destructive" as const,
                                    onPress: () =>
                                      void run(() => unsend({ id: item._id })),
                                  },
                                ]
                              : []),
                            { text: "Cancel", style: "cancel" },
                          ],
                    )
                  }
                  style={{
                    maxWidth: "84%",
                    minWidth: item.media ? 200 : undefined,
                    padding: 12,
                    gap: 8,
                    borderRadius: 18,
                    backgroundColor: own ? p.text : p.surface,
                  }}
                >
                  {item.deleted ? (
                    <T
                      size={14}
                      style={{
                        fontStyle: "italic",
                        color: own ? p.bg : p.muted,
                      }}
                    >
                      Message deleted
                    </T>
                  ) : (
                    <>
                      {item.media && (
                        <Media id={item.media} kind={item.mediaKind} />
                      )}
                      {!!item.text && (
                        <T size={15} style={{ color: own ? p.bg : p.text }}>
                          {item.text}
                        </T>
                      )}
                    </>
                  )}
                  <T
                    size={10}
                    style={{ color: own ? p.bg : p.muted, opacity: 0.65 }}
                  >
                    {relativeTime(item._creationTime)}
                  </T>
                </Pressable>
              </View>
            );
          }}
        />
        <View
          style={{
            padding: 14,
            gap: 10,
            borderTopWidth: 1,
            borderColor: p.line,
          }}
        >
          <ErrorText error={error} />
          {c.incoming ? (
            <>
              <T muted size={14}>
                Accept this request to reply and share photos or videos.
              </T>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    secondary
                    busy={busy}
                    onPress={() =>
                      void run(async () => {
                        await respond({ id: cid, accept: false });
                        router.back();
                      })
                    }
                  >
                    Decline
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    busy={busy}
                    onPress={() =>
                      void run(() => respond({ id: cid, accept: true }))
                    }
                  >
                    Accept
                  </Button>
                </View>
              </View>
            </>
          ) : !allowed ? (
            <T muted size={14}>
              {c.blocked
                ? "You can’t send messages while either account has blocked the other."
                : c.status === "pending"
                  ? "Waiting for your message request to be accepted."
                  : "This conversation is unavailable."}
            </T>
          ) : (
            <>
              {selection && (
                <View style={{ width: 100, gap: 8 }}>
                  <Media uri={selection.uri} kind={selection.kind} />
                  <Button
                    small
                    secondary
                    disabled={busy}
                    onPress={() => setSelection(null)}
                  >
                    Remove
                  </Button>
                </View>
              )}
              {upload.uploading && (
                <T muted size={12}>
                  {upload.progress < 1
                    ? `Uploading ${Math.round(upload.progress * 100)}%…`
                    : "Checking media…"}
                </T>
              )}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <IconButton
                  name="image"
                  label="Attach photo or video"
                  disabled={busy}
                  onPress={() => void attach()}
                />
                <View style={{ flex: 1 }}>
                  <Field
                    accessibilityLabel="Message"
                    placeholder="Message…"
                    multiline
                    maxLength={2000}
                    value={body}
                    onChangeText={setBody}
                    editable={!busy}
                  />
                </View>
                <Button
                  small
                  busy={busy}
                  disabled={!body.trim() && !selection}
                  onPress={() => void submit()}
                >
                  Send
                </Button>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
export default function Page() {
  return (
    <ScreenBoundary>
      <Conversation />
    </ScreenBoundary>
  );
}
