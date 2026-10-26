import { ProfileScreen } from "@/components/social/profile-screen";
import { useMe } from "@/providers/app-state";
export default function Page() {
  const me = useMe();
  return <ProfileScreen id={me._id} />;
}
