import { useAuth, useClerk } from "@clerk/expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import {
  ConvexReactClient,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  AppState,
  Pressable,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { api, type Doc, messageOf } from "@/lib/api";
const url = process.env.EXPO_PUBLIC_CONVEX_URL;
export const siteUrl =
  process.env.EXPO_PUBLIC_CONVEX_SITE_URL ||
  url?.replace(".convex.cloud", ".convex.site").replace(":3210", ":3211");
const client = url
  ? new ConvexReactClient(url, { unsavedChangesWarning: false })
  : null;
type State = {
  me: Doc<"users"> | null | undefined;
  loading: boolean;
  error: string;
  retry: () => void;
};
const Context = createContext<State>({
  me: undefined,
  loading: true,
  error: "",
  retry: () => {},
});
const TokenContext = createContext<string | null>(null);
function SessionState({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth(),
    { isSignedIn } = useAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip"),
    ensure = useMutation(api.users.ensure);
  const [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [token, setToken] = useState<string | null>(null);
  const { getToken } = useAuth();
  useEffect(() => {
    let live = true;
    if (isAuthenticated)
      ensure().catch((e) => {
        if (live) setError(messageOf(e));
      });
    return () => {
      live = false;
    };
  }, [ensure, isAuthenticated, retry]);
  useEffect(() => {
    let live = true;
    const refresh = () => {
      if (!isAuthenticated) return;
      getToken()
        .then((t) => {
          if (live) setToken(t);
        })
        .catch(() => {
          if (live) setToken(null);
        });
    };
    refresh();
    const timer = setInterval(refresh, 45_000);
    const listener = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => {
      live = false;
      clearInterval(timer);
      listener.remove();
    };
  }, [getToken, isAuthenticated]);
  const failed = !!isSignedIn && !isLoading && !isAuthenticated;
  return (
    <Context.Provider
      value={{
        me,
        loading:
          isLoading ||
          (isAuthenticated && (me === undefined || me === null) && !error),
        error:
          error ||
          (failed
            ? "Unable to connect your account. Check your connection and try again."
            : ""),
        retry: () => {
          setError("");
          setRetry((n) => n + 1);
        },
      }}
    >
      <TokenContext.Provider value={isAuthenticated ? token : null}>
        {children}
      </TokenContext.Provider>
    </Context.Provider>
  );
}
export function BackendProvider({ children }: { children: ReactNode }) {
  const { signOut } = useClerk();
  if (!client)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 28,
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700" }}>
          MiniGram is getting ready
        </Text>
        <Text style={{ marginTop: 16 }}>
          The app’s server connection has not been configured.
        </Text>
        <Pressable
          onPress={() => void signOut()}
          style={{ paddingVertical: 24 }}
        >
          <Text>Sign out</Text>
        </Pressable>
      </View>
    );
  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <SessionState>{children}</SessionState>
    </ConvexProviderWithClerk>
  );
}
export const useAppState = () => useContext(Context);
export const useMe = () => {
  const { me } = useAppState();
  if (!me) throw new Error("Your profile is not ready.");
  return me;
};
export const useMediaToken = () => useContext(TokenContext);
export function SessionLoading() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <ActivityIndicator
        color="#111"
        size="large"
        accessibilityLabel="Loading MiniGram"
      />
    </View>
  );
}
