import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, View } from "react-native";
import { useAppState } from "@/providers/app-state";
import { profileDestination } from "@/lib/auth/destination";
WebBrowser.maybeCompleteAuthSession();
export default function SSOCallback() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const state = useAppState();
  const destination = profileDestination(state.me?.status);
  if (!isLoaded || (isSignedIn && (state.loading || !destination)))
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator color="#111" />
      </View>
    );
  return <Redirect href={isSignedIn ? destination! : "/"} />;
}
