import { Redirect } from "expo-router";
import { useAppState, SessionLoading } from "@/providers/app-state";
import { profileDestination } from "@/lib/auth/destination";
export default function Page() {
  const { me } = useAppState();
  const destination = profileDestination(me?.status);
  return destination ? <Redirect href={destination} /> : <SessionLoading />;
}
