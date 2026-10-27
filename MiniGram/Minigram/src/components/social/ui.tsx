import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type ReactNode, Component, useState } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
export function usePalette() {
  const dark = useColorScheme() === "dark";
  return {
    dark,
    bg: dark ? "#000" : "#fff",
    text: dark ? "#fff" : "#0b0b0b",
    muted: dark ? "#a2a2aa" : "#77777e",
    line: dark ? "#2b2b30" : "#e6e6eb",
    surface: dark ? "#161619" : "#f4f4f6",
    accent: "#ff263b",
    green: "#22b456",
  };
}
export type IconName =
  | "home"
  | "search"
  | "plus"
  | "bell"
  | "heart"
  | "comment"
  | "send"
  | "back"
  | "close"
  | "more"
  | "settings"
  | "lock"
  | "grid"
  | "user"
  | "image"
  | "check"
  | "globe"
  | "message"
  | "flag";
export function Icon({
  name,
  size = 24,
  color,
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  const p = usePalette();
  const c = color || p.text;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "home" && (
        <>
          <Path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z" fill={filled ? c : "none"} />
        </>
      )}
      {name === "search" && (
        <>
          <Circle cx="10.5" cy="10.5" r="7.5" />
          <Path d="m16 16 5 5" />
        </>
      )}
      {name === "plus" && (
        <>
          <Rect
            x="2"
            y="2"
            width="20"
            height="20"
            rx="6"
            fill={filled ? c : "none"}
          />
          <Path d="M12 7v10M7 12h10" stroke={filled ? p.bg : c} />
        </>
      )}
      {name === "bell" && (
        <>
          <Path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4" />
        </>
      )}
      {name === "heart" && (
        <Path
          d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"
          fill={filled ? c : "none"}
        />
      )}
      {(name === "comment" || name === "message") && (
        <Path d="M21 11.5a9 9 0 0 1-9 9c-1.5 0-3-.4-4.3-1L3 21l1.5-4.7a9 9 0 1 1 16.5-4.8Z" />
      )}
      {name === "send" && (
        <>
          <Path d="m22 2-7 20-4-9-9-4Z M22 2 11 13" />
        </>
      )}
      {name === "back" && <Path d="m15 5-7 7 7 7" />}
      {name === "close" && <Path d="m6 6 12 12M6 18 18 6" />}
      {name === "more" && (
        <>
          <Circle cx="4" cy="12" r="1" fill={c} />
          <Circle cx="12" cy="12" r="1" fill={c} />
          <Circle cx="20" cy="12" r="1" fill={c} />
        </>
      )}
      {name === "settings" && (
        <>
          <Circle cx="12" cy="12" r="4" />
          <Path d="m10 2-.6 3-2 .9-2.6-1.4-2 3.4L5 10v3l-2.2 1.8 2 3.4 2.6-.9 2 .9.6 3h4l.6-3 2-.9 2.6.9 2-3.4L19 13v-3l2.2-2.1-2-3.4-2.6 1.4-2-.9L14 2Z" />
        </>
      )}
      {name === "lock" && (
        <>
          <Rect x="5" y="10" width="14" height="12" rx="2" />
          <Path d="M8 10V6a4 4 0 0 1 8 0v4" />
        </>
      )}
      {name === "grid" && (
        <>
          <Rect x="3" y="3" width="7" height="7" rx="1" />
          <Rect x="14" y="3" width="7" height="7" rx="1" />
          <Rect x="3" y="14" width="7" height="7" rx="1" />
          <Rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      )}
      {name === "user" && (
        <>
          <Circle cx="12" cy="7" r="4" />
          <Path d="M4 22v-3a8 8 0 0 1 16 0v3" />
        </>
      )}
      {name === "image" && (
        <>
          <Rect x="2" y="3" width="20" height="18" rx="3" />
          <Circle cx="8" cy="9" r="2" />
          <Path d="m3 19 6-6 4 4 3-4 6 6" />
        </>
      )}
      {name === "check" && <Path d="m4 12 5 5L20 6" />}
      {name === "globe" && (
        <>
          <Circle cx="12" cy="12" r="10" />
          <Path d="M2 12h20M12 2a22 22 0 0 1 0 20 22 22 0 0 1 0-20" />
        </>
      )}
      {name === "flag" && <Path d="M5 22V3c5-4 9 4 15 0v11c-6 4-10-4-15 0" />}
    </Svg>
  );
}
export function T({
  children,
  muted = false,
  bold = false,
  size = 16,
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  bold?: boolean;
  size?: number;
  style?: import("react-native").TextStyle;
}) {
  const p = usePalette();
  return (
    <Text
      style={[
        {
          color: muted ? p.muted : p.text,
          fontSize: size,
          fontWeight: bold ? "600" : "400",
          lineHeight: size * 1.4,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const p = usePalette();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-white dark:bg-black"
      style={[{ backgroundColor: p.bg }, style]}
    >
      {children}
    </SafeAreaView>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  badge,
  disabled,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  badge?: number;
  disabled?: boolean;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={s.iconButton}
    >
      <Icon name={name} />
      {!!badge && (
        <View style={[s.badge, { backgroundColor: p.accent }]}>
          <Text style={s.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}
export function Header({
  title,
  back = false,
  children,
}: {
  title: string;
  back?: boolean;
  children?: ReactNode;
}) {
  const p = usePalette();
  return (
    <View style={[s.header, { borderBottomColor: p.line }]}>
      {back && (
        <IconButton
          name="back"
          label="Go back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        />
      )}
      <T
        bold
        size={back ? 18 : 25}
        style={{ flex: 1, letterSpacing: back ? 0 : -0.8 }}
      >
        {title}
      </T>
      <View style={s.row}>{children}</View>
    </View>
  );
}
export function Button({
  children,
  onPress,
  busy = false,
  disabled = false,
  secondary = false,
  danger = false,
  small = false,
}: {
  children: ReactNode;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  small?: boolean;
}) {
  const p = usePalette();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      className="items-center justify-center"
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || disabled, busy }}
      onPress={onPress}
      disabled={busy || disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          minHeight: small ? 36 : 52,
          paddingHorizontal: small ? 16 : 22,
          borderRadius: small ? 9 : 13,
          borderWidth: secondary ? 1 : 0,
          borderColor: p.line,
          backgroundColor: secondary ? p.surface : danger ? p.accent : p.text,
          opacity: pressed || busy || disabled ? 0.5 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? p.text : p.bg} />
      ) : (
        <Text
          style={{
            color: secondary ? p.text : p.bg,
            fontSize: small ? 14 : 16,
            fontWeight: "600",
          }}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: 8 }}>
      {label && (
        <T size={14} bold>
          {label}
        </T>
      )}
      <TextInput
        {...props}
        placeholderTextColor={p.muted}
        style={[
          {
            minHeight: 52,
            borderRadius: 13,
            borderWidth: 1,
            borderColor: p.line,
            paddingHorizontal: 16,
            paddingVertical: 13,
            color: p.text,
            backgroundColor: p.bg,
            fontSize: 16,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Empty({
  icon = "image",
  title,
  description,
  action,
  label,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: () => void;
  label?: string;
}) {
  const p = usePalette();
  return (
    <View style={s.empty}>
      <View style={[s.emptyIcon, { backgroundColor: p.surface }]}>
        <Icon name={icon} size={36} color={p.muted} />
      </View>
      <T size={22} bold style={{ textAlign: "center" }}>
        {title}
      </T>
      <T muted style={{ textAlign: "center", maxWidth: 300 }}>
        {description}
      </T>
      {action && label && (
        <View style={{ marginTop: 8 }}>
          <Button onPress={action}>{label}</Button>
        </View>
      )}
    </View>
  );
}
export function Loading() {
  const p = usePalette();
  return (
    <View style={s.empty}>
      <ActivityIndicator
        color={p.text}
        size="large"
        accessibilityLabel="Loading"
      />
    </View>
  );
}
export function ErrorText({ error }: { error?: string }) {
  const p = usePalette();
  return error ? (
    <Text
      accessibilityRole="alert"
      style={{
        color: p.accent,
        fontSize: 14,
        lineHeight: 21,
        marginVertical: 10,
      }}
    >
      {error}
    </Text>
  ) : null;
}
export function More({
  status,
  onPress,
}: {
  status: string;
  onPress: () => void;
}) {
  return (
    <View style={{ padding: 20 }}>
      {status === "LoadingMore" ? (
        <Loading />
      ) : status === "CanLoadMore" ? (
        <Button secondary onPress={onPress}>
          Load more
        </Button>
      ) : null}
    </View>
  );
}
export class ScreenBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <Screen>
        <Empty
          icon="lock"
          title="This page is unavailable"
          description="Your access may have changed, or the connection was interrupted."
          label="Try again"
          action={() => this.setState({ error: false })}
        />
        <Button secondary onPress={() => router.replace("/(tabs)")}>
          Go home
        </Button>
      </Screen>
    ) : (
      this.props.children
    );
  }
}
export function relativeTime(time: number) {
  const seconds = Math.max(0, (Date.now() - time) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(time).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
export const s = StyleSheet.create({
  header: {
    height: 64,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: 0,
    top: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  empty: {
    flexGrow: 1,
    minHeight: 280,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIcon: {
    height: 80,
    width: 80,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  section: { padding: 20, gap: 16 },
  divider: { height: 1 },
});
