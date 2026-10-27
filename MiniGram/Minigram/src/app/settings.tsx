import { useClerk } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { messageOf } from "@/lib/api";
import { useMe } from "@/providers/app-state";
import {
  Screen,
  Header,
  T,
  Button,
  ErrorText,
  Icon,
  usePalette,
} from "@/components/social/ui";
export default function Page() {
  const p = usePalette(),
    me = useMe(),
    { signOut } = useClerk(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const logout = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  const row = (title: string, action: () => void) => (
    <Pressable
      accessibilityRole="button"
      onPress={action}
      style={{
        paddingVertical: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderColor: p.line,
      }}
    >
      <T>{title}</T>
      <Icon name="back" size={18} />
    </Pressable>
  );
  return (
    <Screen>
      <Header title="Settings" back />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        <T size={13} muted>
          ACCOUNT
        </T>
        {row("Saved posts", () => router.push("/saved"))}
        {row("Edit profile", () => router.push("/edit-profile"))}
        {row("Blocked accounts", () => router.push("/blocked"))}
        {row("Community rules and privacy", () => router.push("/policies"))}
        {me.admin && (
          <View style={{ paddingVertical: 20, gap: 8 }}>
            <T bold>Community administrator</T>
            <T muted size={13}>
              Use the MiniGram admin dashboard to manage invitations, reports,
              and beta limits.
            </T>
          </View>
        )}
        <View style={{ height: 24 }} />
        <ErrorText error={error} />
        <Button
          secondary
          busy={busy}
          onPress={() =>
            Alert.alert("Sign out of MiniGram?", undefined, [
              { text: "Cancel", style: "cancel" },
              { text: "Sign out", onPress: () => void logout() },
            ])
          }
        >
          Sign out
        </Button>
        <View style={{ height: 24 }} />
        <Button danger onPress={() => router.push("/delete-account")}>
          Delete account
        </Button>
        <T muted size={12} style={{ textAlign: "center", marginTop: 24 }}>
          MiniGram • Invite-only beta
        </T>
      </ScrollView>
    </Screen>
  );
}
