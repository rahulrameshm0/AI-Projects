import { useClerk, useSignIn, useSignUp, useSSO } from "@clerk/expo";
import type { SignUpResource } from "@clerk/expo/types";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import { authErrorMessage, checkAuthResult } from "@/lib/auth/errors";

WebBrowser.maybeCompleteAuthSession();

type Step =
  | "form"
  | "verify-email"
  | "verify-factor"
  | "oauth-profile"
  | "reset-code"
  | "reset-password";
type Factor = "email_code" | "phone_code" | "totp" | "backup_code";

export function useAuthFlow(signup: boolean) {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const { setActive } = useClerk();
  const [step, setStep] = useState<Step>("form");
  const [factor, setFactor] = useState<Factor>("email_code");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const pendingOAuthSignUp = useRef<SignUpResource | null>(null);

  const run = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const finishSignIn = async () => {
    if (signIn.status === "complete") {
      checkAuthResult(await signIn.finalize());
      return;
    }
    if (
      signIn.status === "needs_second_factor" ||
      signIn.status === "needs_client_trust"
    ) {
      const factors = signIn.supportedSecondFactors || [];
      if (factors.some((f) => f.strategy === "totp")) {
        setFactor("totp");
      } else if (factors.some((f) => f.strategy === "email_code")) {
        checkAuthResult(await signIn.mfa.sendEmailCode());
        setFactor("email_code");
      } else if (factors.some((f) => f.strategy === "phone_code")) {
        checkAuthResult(await signIn.mfa.sendPhoneCode());
        setFactor("phone_code");
      } else if (factors.some((f) => f.strategy === "backup_code")) {
        setFactor("backup_code");
      } else {
        throw new Error(
          "This account requires a verification method that is not supported here yet.",
        );
      }
      setStep("verify-factor");
      return;
    }
    throw new Error(
      "Sign-in needs another step. Please try another sign-in method.",
    );
  };

  const submit = (username: string, email: string, password: string) =>
    run(async () => {
      if (!username.trim() || !password || (signup && !email.trim()))
        throw new Error("Please fill in all fields.");
      if (signup) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
          throw new Error("Enter a valid email address.");
        checkAuthResult(
          await signUp.password({
            username: username.trim(),
            emailAddress: email.trim(),
            password,
          }),
        );
        if (signUp.status === "complete") {
          checkAuthResult(await signUp.finalize());
          return;
        }
        if (signUp.missingFields.length)
          throw new Error(
            "Your account needs additional information. Please check the sign-up settings in Clerk.",
          );
        if (signUp.unverifiedFields.includes("email_address")) {
          setStep("verify-email");
          checkAuthResult(await signUp.verifications.sendEmailCode());
          return;
        }
        throw new Error(
          "Sign-up needs another verification method. Please try another sign-up method.",
        );
      }
      checkAuthResult(
        await signIn.password({ identifier: username.trim(), password }),
      );
      await finishSignIn();
    });

  const verify = (code: string) =>
    run(async () => {
      if (!code.trim()) throw new Error("Enter your verification code.");
      if (step === "verify-email") {
        checkAuthResult(
          await signUp.verifications.verifyEmailCode({ code: code.trim() }),
        );
        if (signUp.status !== "complete")
          throw new Error(
            "Your account still requires additional verification.",
          );
        checkAuthResult(await signUp.finalize());
      } else {
        const params = { code: code.trim() };
        if (factor === "email_code")
          checkAuthResult(await signIn.mfa.verifyEmailCode(params));
        else if (factor === "phone_code")
          checkAuthResult(await signIn.mfa.verifyPhoneCode(params));
        else if (factor === "totp")
          checkAuthResult(await signIn.mfa.verifyTOTP(params));
        else checkAuthResult(await signIn.mfa.verifyBackupCode(params));
        await finishSignIn();
      }
    });

  const resend = () =>
    run(async () => {
      if (step === "verify-email")
        checkAuthResult(await signUp.verifications.sendEmailCode());
      else if (factor === "email_code")
        checkAuthResult(await signIn.mfa.sendEmailCode());
      else if (factor === "phone_code")
        checkAuthResult(await signIn.mfa.sendPhoneCode());
      setNotice("A new verification code has been sent.");
    });

  const social = (provider: "Apple" | "Google") =>
    run(async () => {
      const result = await startSSOFlow({
        strategy: provider === "Apple" ? "oauth_apple" : "oauth_google",
        redirectUrl: makeRedirectUri({
          scheme: "minigram",
          path: "sso-callback",
        }),
      });
      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        return;
      }
      if (
        result.authSessionResult?.type === "cancel" ||
        result.authSessionResult?.type === "dismiss"
      )
        return;
      if (
        result.signUp?.status === "missing_requirements" &&
        result.signUp.missingFields.every((f) => f === "username") &&
        result.signUp.unverifiedFields.length === 0
      ) {
        pendingOAuthSignUp.current = result.signUp;
        setStep("oauth-profile");
        return;
      }
      throw new Error(
        "Your account requires another verification step. Please sign in with your email and password to continue.",
      );
    });

  const completeOAuthProfile = (username: string) =>
    run(async () => {
      if (!username.trim()) throw new Error("Choose a username.");
      const pending = pendingOAuthSignUp.current;
      if (!pending)
        throw new Error("Your sign-up has expired. Please try again.");
      const result = await pending.update({ username: username.trim() });
      if (result.status !== "complete" || !result.createdSessionId)
        throw new Error("Your account still requires additional verification.");
      await setActive({ session: result.createdSessionId });
    });

  const requestReset = (email: string) =>
    run(async () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        throw new Error("Enter your account’s email address.");
      checkAuthResult(await signIn.create({ identifier: email.trim() }));
      checkAuthResult(await signIn.resetPasswordEmailCode.sendCode());
      setStep("reset-code");
    });
  const verifyReset = (code: string) =>
    run(async () => {
      if (!code.trim()) throw new Error("Enter your verification code.");
      checkAuthResult(
        await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }),
      );
      setStep("reset-password");
    });
  const savePassword = (password: string) =>
    run(async () => {
      if (!password) throw new Error("Enter your new password.");
      checkAuthResult(
        await signIn.resetPasswordEmailCode.submitPassword({
          password,
          signOutOfOtherSessions: true,
        }),
      );
      await finishSignIn();
    });
  const resendReset = () =>
    run(async () => {
      checkAuthResult(await signIn.resetPasswordEmailCode.sendCode());
      setNotice("A new verification code has been sent.");
    });
  const back = () =>
    run(async () => {
      await signIn.reset();
      await signUp.reset();
      pendingOAuthSignUp.current = null;
      setStep("form");
    });
  return {
    step,
    factor,
    busy,
    error,
    notice,
    submit,
    verify,
    resend,
    social,
    completeOAuthProfile,
    requestReset,
    verifyReset,
    savePassword,
    resendReset,
    back,
    clearError: () => setError(""),
  };
}
