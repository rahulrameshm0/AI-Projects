import { useLocalSearchParams } from "expo-router";
import { ProfileScreen } from "@/components/social/profile-screen";
import type { Id } from "@/lib/api";
export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProfileScreen key={id} id={id as Id<"users">} back />;
}
