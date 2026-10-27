import "@/global.css";
import { ClerkProvider, useAuth, useClerk } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  BackendProvider,
  useAppState,
  SessionLoading,
} from "@/providers/app-state";
import {
  Screen,
  Empty,
  Button,
  ScreenBoundary,
  usePalette,
} from "@/components/social/ui";
import { Text, View } from "react-native";
const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
function Routes() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false }),
    state = useAppState(),
    { signOut } = useClerk(),
    p = usePalette();
  if (!isLoaded) return <SessionLoading />;
  if (isSignedIn && state.error)
    return (
      <Screen>
        <Empty
          icon="lock"
          title="Unable to connect"
          description={state.error}
          action={state.retry}
          label="Try again"
        />
        <View style={{ padding: 24 }}>
          <Button secondary onPress={() => void signOut()}>
            Sign out
          </Button>
        </View>
      </Screen>
    );
  if (isSignedIn && state.loading) return <SessionLoading />;
  const active = !!isSignedIn && state.me?.status === "active",
    onboarding = !!isSignedIn && state.me?.status === "incomplete",
    blocked = !!isSignedIn && !!state.me && !active && !onboarding;
  return (
    <>
      <StatusBar style={p.dark ? "light" : "dark"} />
      <ScreenBoundary key={`${isSignedIn}:${state.me?.status}`}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: p.bg },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Protected guard={!isSignedIn}>
            <Stack.Screen name="sign-up" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="sign-in-link" />
          </Stack.Protected>
          <Stack.Protected guard={onboarding}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={active}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="user/[id]" />
            <Stack.Screen name="post/[id]" />
            <Stack.Screen name="conversation/[id]" />
            <Stack.Screen name="compose" options={{ presentation: "modal" }} />
            <Stack.Screen name="new-message" />
            <Stack.Screen name="connections" />
            <Stack.Screen name="activity" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="blocked" />
            <Stack.Screen name="report" />
            <Stack.Screen name="delete-account" />
            <Stack.Screen name="explore" />
          </Stack.Protected>
          <Stack.Protected guard={blocked}>
            <Stack.Screen name="unavailable" />
          </Stack.Protected>
          <Stack.Protected guard={!!isSignedIn}>
            <Stack.Screen name="account" />
          </Stack.Protected>
          <Stack.Screen name="policies" />
          <Stack.Screen name="sso-callback" />
        </Stack>
      </ScreenBoundary>
    </>
  );
}
export default function RootLayout() {
  if (!key || key === "pk_test_replace_me")
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 28,
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700" }}>
          Connect MiniGram to Clerk
        </Text>
        <Text style={{ marginTop: 16 }}>
          Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env, then restart Expo.
        </Text>
      </View>
    );
  return (
    <ClerkProvider publishableKey={key} tokenCache={tokenCache}>
      <BackendProvider>
        <Routes />
      </BackendProvider>
    </ClerkProvider>
  );
}
