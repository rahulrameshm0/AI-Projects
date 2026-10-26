import { NativeTabs } from "expo-router/native-tabs";
import { useQuery } from "convex/react";
import { api } from "@/lib/api";
import { usePalette } from "@/components/social/ui";
export default function TabsLayout() {
  const p = usePalette(),
    conversations = useQuery(api.messages.list, {}),
    unread = conversations?.filter((c) => c.unread).length || 0;
  return (
    <NativeTabs
      backgroundColor={p.bg}
      indicatorColor={p.surface}
      tintColor={p.text}
      labelStyle={{ color: p.muted, selected: { color: p.text } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="bubble.left.and.bubble.right"
          md="chat_bubble"
        />
        {unread > 0 && (
          <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
