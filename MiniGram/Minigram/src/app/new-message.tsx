import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { api, type Id, messageOf } from "@/lib/api";
import { Avatar } from "@/components/social/media";
import {
  Button,
  ErrorText,
  Field,
  Header,
  Loading,
  Screen,
  T,
  Empty,
  ScreenBoundary,
} from "@/components/social/ui";
function NewMessage() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    user = useQuery(api.users.get, { id: id as Id<"users"> }),
    start = useMutation(api.messages.start),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    clientId = useRef(randomUUID());
  const send = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const conversation = await start({
        recipient: id as Id<"users">,
        text: body,
        clientId: clientId.current,
      });
      router.replace({
        pathname: "/conversation/[id]",
        params: { id: conversation },
      });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="New message" back />
      {user === undefined ? (
        <Loading />
      ) : !user || user.blocked ? (
        <Empty
          icon="lock"
          title="Account unavailable"
          description="You can’t send a message to this account."
        />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, gap: 20 }}
        >
          <View style={{ alignItems: "center", gap: 12 }}>
            <Avatar user={user} size={72} />
            <T bold size={22}>
              {user.displayName}
            </T>
            <T muted>@{user.username}</T>
          </View>
          <T muted>
            You can send one text introduction. Photos and videos become
            available after your request is accepted.
          </T>
          <Field
            label="Your introduction"
            placeholder="Say hello…"
            multiline
            maxLength={2000}
            value={body}
            onChangeText={setBody}
            style={{ minHeight: 140, textAlignVertical: "top" }}
          />
          <ErrorText error={error} />
          <Button
            busy={busy}
            disabled={!body.trim()}
            onPress={() => void send()}
          >
            Send message request
          </Button>
        </ScrollView>
      )}
    </Screen>
  );
}
export default function Page() {
  return (
    <ScreenBoundary>
      <NewMessage />
    </ScreenBoundary>
  );
}
