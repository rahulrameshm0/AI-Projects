import { AuthScreen } from "@/components/auth/auth-screen";
import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { profileDestination } from "@/lib/auth/destination";
import { SessionLoading, useAppState } from "@/providers/app-state";
export default function SignInScreen() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { me, loading } = useAppState();
  if (!isLoaded) return <SessionLoading />;
  if (!isSignedIn) return <AuthScreen mode="sign-in" />;
  const destination = profileDestination(me?.status);
  if (loading || !destination) return <SessionLoading />;
  return <Redirect href={destination} />;
}
