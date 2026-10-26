import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

export function CameraLogo() {
  return (
    <Svg
      width={88}
      height={88}
      viewBox="0 0 100 100"
      accessibilityLabel="MiniGram camera"
    >
      <Defs>
        <LinearGradient id="body" x2="1" y2="1">
          <Stop stopColor="#303030" />
          <Stop offset="1" stopColor="#030303" />
        </LinearGradient>
      </Defs>
      <Rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="24"
        fill="url(#body)"
        stroke="#080808"
        strokeWidth="2"
      />
      <Path
        d="M17 43Q17 31 29 31H34L40 23H59L66 31H72Q83 31 83 43V69Q83 80 72 80H29Q17 80 17 69Z"
        fill="white"
      />
      <Circle cx="50" cy="54" r="24" fill="#111" />
      <Circle
        cx="50"
        cy="54"
        r="20"
        fill="#050505"
        stroke="#ccc"
        strokeWidth="1.5"
      />
      <Circle
        cx="50"
        cy="54"
        r="16.5"
        stroke="#777"
        strokeWidth="1"
        fill="none"
      />
      <Path
        d="M37 52Q38 42 48 40"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Circle cx="81" cy="20" r="6" fill="#ff283b" />
    </Svg>
  );
}
export function FieldIcon({
  name,
}: {
  name: "user" | "mail" | "lock" | "eye" | "eye-off";
}) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#44464a"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "user" && (
        <>
          <Circle cx="12" cy="7" r="3.5" />
          <Path d="M5 21v-3a7 6 0 0 1 14 0v3Z" />
        </>
      )}
      {name === "mail" && (
        <>
          <Rect x="2" y="4" width="20" height="16" rx="2" />
          <Path d="m3 6 9 7 9-7" />
        </>
      )}
      {name === "lock" && (
        <>
          <Rect x="5" y="10" width="14" height="12" rx="2" />
          <Path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3" />
        </>
      )}
      {(name === "eye" || name === "eye-off") && (
        <>
          <Path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <Circle cx="12" cy="12" r="2.5" />
          {name === "eye-off" && <Path d="m3 3 18 18" />}
        </>
      )}
    </Svg>
  );
}
export function ProviderIcon({ provider }: { provider: "Apple" | "Google" }) {
  return provider === "Apple" ? (
    <Svg width={29} height={29} viewBox="0 0 24 24">
      <Path
        fill="#080808"
        d="M17.1 12.3c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.2-1.7-1.3-.2-2.6.8-3.3.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.2 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.8-1.1-2.8-4ZM15 5.9c.7-.9 1.2-2.1 1.1-3.3-1.1.1-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5Z"
      />
    </Svg>
  ) : (
    <Svg width={27} height={27} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.3 2.9-7.4Z"
      />
      <Path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H2.9v2.6A10 10 0 0 0 12 22Z"
      />
      <Path
        fill="#FBBC05"
        d="M6.3 13.9a6 6 0 0 1 0-3.8V7.5H2.9a10 10 0 0 0 0 9Z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9.1 5.5l3.4 2.6C7.1 7.7 9.4 5.9 12 5.9Z"
      />
    </Svg>
  );
}
