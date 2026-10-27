import { ScrollView } from "react-native";
import { router } from "expo-router";
import { Screen, Header, T, Button } from "@/components/social/ui";
import { useAppState } from "@/providers/app-state";
import { profileDestination } from "@/lib/auth/destination";
export default function Page() {
  const { me } = useAppState();
  const destination = profileDestination(me?.status) || "/";
  return (
    <Screen>
      <Header title="Community and privacy" back />
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 18, paddingBottom: 48 }}
      >
        <T size={28} bold>
          A small community. Real people.
        </T>
        <T>
          MiniGram is an invite-only beta for adults aged 18 or older in India.
          Be respectful, share content you have the right to post, and keep
          other people’s private information private.
        </T>
        <T size={21} bold>
          Community rules
        </T>
        <T>
          No harassment, threats, hate, scams, sexual exploitation, illegal
          content, or impersonation. Don’t share someone’s private images or
          personal details without permission. Report harmful content and block
          unwanted contact.
        </T>
        <T size={21} bold>
          Who sees your content
        </T>
        <T>
          Every member must sign in and complete invitation and profile setup.
          Private posts are visible only to approved followers. Public posts are
          visible to all admitted members, including in Explore. Your profile
          name, username, bio, photo and follower counts remain visible to
          admitted members, unless blocked.
        </T>
        <T>
          Changing to public makes existing posts visible to admitted members
          and accepts pending follow requests. Changing to private keeps current
          followers. You can remove followers, block accounts, and delete your
          own content.
        </T>
        <T size={21} bold>
          Messages
        </T>
        <T>
          Only participants can access a conversation. Before a request is
          accepted, the sender can send one text introduction. Accepted
          conversations can include photos and videos. Blocking prevents new
          messages; existing messages remain unless unsent or deleted.
        </T>
        <T size={21} bold>
          What we store
        </T>
        <T>
          Clerk manages your sign-in identity and sessions. Convex stores your
          profile, posts, media, follows, conversations, activity, reports, and
          operational records. MiniGram does not request your contacts or
          continuously track your location. Media is selected from your device
          library with your permission.
        </T>
        <T size={21} bold>
          Reports and deletion
        </T>
        <T>
          Moderators can review reported content and suspend accounts or remove
          harmful content. Evidence reported before deletion is restricted to
          administrators and retained for up to 30 days, then expires. Deleting
          your account hides your content immediately and schedules permanent
          cleanup, including your sign-in account. Cleanup retries if a service
          is unavailable.
        </T>
        <T>
          We cannot recall copies that other people have already downloaded.
          During the beta, contact the administrator who invited you for privacy
          requests, appeals, or support.
        </T>
        <T muted size={12}>
          Beta policy • Version 1 • 26 October 2026
        </T>
        <Button
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace(destination)
          }
        >
          {me?.status === "incomplete" ? "Continue account setup" : "Return to MiniGram"}
        </Button>
      </ScrollView>
    </Screen>
  );
}
