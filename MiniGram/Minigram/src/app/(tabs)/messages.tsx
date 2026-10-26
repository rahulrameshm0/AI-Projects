import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { api } from "@/lib/api";
import { Avatar } from "@/components/social/media";
import {
  Screen,
  Header,
  T,
  Empty,
  Loading,
  ScreenBoundary,
  relativeTime,
  usePalette,
} from "@/components/social/ui";
function Messages() {
  const p = usePalette(),
    conversations = useQuery(api.messages.list, {}),
    [requests, setRequests] = useState(false);
  const data = conversations?.filter((c) =>
    requests ? c.incoming : !c.incoming,
  );
  return (
    <Screen>
      <Header title="Messages" />
      <View style={{ flexDirection: "row", padding: 16, gap: 20 }}>
        {[false, true].map((value) => (
          <Pressable
            key={String(value)}
            onPress={() => setRequests(value)}
            style={{
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderColor: requests === value ? p.text : "transparent",
            }}
          >
            <T bold muted={requests !== value}>
              {value
                ? `Requests${conversations?.some((c) => c.incoming) ? " •" : ""}`
                : "Inbox"}
            </T>
          </Pressable>
        ))}
      </View>
      {!data ? (
        <Loading />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c._id}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/conversation/[id]",
                  params: { id: item._id },
                })
              }
              style={{
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Avatar user={item.other} size={52} />
              <View style={{ flex: 1, gap: 3 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <T bold={item.unread}>
                    {item.other?.displayName || "Deleted account"}
                  </T>
                  <T size={12} muted>
                    {relativeTime(item.lastAt)}
                  </T>
                </View>
                <T size={14} muted={!item.unread} style={{ maxHeight: 40 }}>
                  {item.status === "pending" && !item.incoming
                    ? "Request sent"
                    : item.lastText}
                </T>
              </View>
              {item.unread && (
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: p.accent,
                  }}
                />
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <Empty
              icon="message"
              title={requests ? "No message requests" : "Start a conversation"}
              description={
                requests
                  ? "When someone new sends you a message, their request will appear here."
                  : "Find someone in Explore, open their profile, and send a message request."
              }
              action={
                requests ? undefined : () => router.push("/(tabs)/explore")
              }
              label={requests ? undefined : "Find people"}
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
      <Messages />
    </ScreenBoundary>
  );
}
