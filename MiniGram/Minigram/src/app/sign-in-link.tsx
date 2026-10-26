import { useSignIn } from "@clerk/expo";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { authErrorMessage, checkAuthResult } from "@/lib/auth/errors";
import { Empty, Loading, Screen } from "@/components/social/ui";
/** Accept only server-issued, expiring Clerk sign-in tickets. Admission is still enforced separately. */
export default function Page() {
  const { ticket } = useLocalSearchParams<{ ticket: string }>(),
    { signIn } = useSignIn(),
    started = useRef<string | null>(null),
    [error, setError] = useState(ticket ? "" : "This sign-in link is missing or expired.");
  useEffect(() => {
    if (!ticket || started.current === ticket) return;
    started.current = ticket;
    void (async () => {
      try {
        checkAuthResult(await signIn.ticket({ ticket }));
        if (signIn.status !== "complete")
          throw new Error(
            "Additional verification is required. Please use the sign-in screen.",
          );
        checkAuthResult(await signIn.finalize());
      } catch (e) {
        setError(authErrorMessage(e));
      }
    })();
  }, [ticket, signIn]);
  return (
    <Screen>
      {error ? (
        <Empty
          icon="lock"
          title="Unable to use this link"
          description={error}
          label="Go to sign in"
          action={() => router.replace("/")}
        />
      ) : (
        <Loading />
      )}
    </Screen>
  );
}
