import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { api, messageOf } from "@/lib/api";
import { Avatar } from "@/components/social/media";
import {
  Screen,
  Header,
  T,
  Button,
  Empty,
  ErrorText,
  Loading,
  ScreenBoundary,
} from "@/components/social/ui";
function Content() {
  const list = useQuery(api.social.blockedAccounts, {}),
    block = useMutation(api.social.block),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState("");
  return (
    <Screen>
      <Header title="Blocked accounts" back />
      <View style={{ padding: 16 }}>
        <ErrorText error={error} />
        <T muted size={13}>
          Unblocking does not restore previous follows or closed message
          requests.
        </T>
      </View>
      {!list ? (
        <Loading />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(u) => u._id}
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                gap: 12,
              }}
            >
              <Avatar user={item} />
              <View style={{ flex: 1 }}>
                <T bold>{item.username}</T>
              </View>
              <Button
                small
                secondary
                busy={busy === item._id}
                disabled={!!busy}
                onPress={() => {
                  setBusy(item._id);
                  setError("");
                  block({ id: item._id })
                    .catch((e) => setError(messageOf(e)))
                    .finally(() => setBusy(null));
                }}
              >
                Unblock
              </Button>
            </View>
          )}
          ListEmptyComponent={
            <Empty
              icon="user"
              title="No blocked accounts"
              description="Accounts you block will appear here."
            />
          }
        />
      )}
    </Screen>
  );
}
export default function Page() {
  return (
    <ScreenBoundary>
      <Content />
    </ScreenBoundary>
  );
}
