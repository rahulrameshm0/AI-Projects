import { useClerk } from "@clerk/expo";
import { View } from "react-native";
import { useAppState } from "@/providers/app-state";
import { Screen, Empty, Button } from "@/components/social/ui";
export default function Page() {
  const { me } = useAppState(),
    { signOut } = useClerk();
  return (
    <Screen>
      <Empty
        icon="lock"
        title={
          me?.status === "deleting"
            ? "Your account is being deleted"
            : "Your account is suspended"
        }
        description={
          me?.status === "deleting"
            ? "Access has been removed. Your profile, posts and messages are being cleaned up. Reported evidence may be retained for up to 30 days."
            : "Your access to MiniGram has been restricted. Contact the community administrator if you believe this is a mistake."
        }
      />
      <View style={{ padding: 24 }}>
        <Button onPress={() => void signOut()}>Sign out</Button>
      </View>
    </Screen>
  );
}
