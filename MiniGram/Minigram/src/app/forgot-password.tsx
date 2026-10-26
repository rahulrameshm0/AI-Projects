import { router } from "expo-router";
import { useState } from "react";
import { AuthStep } from "@/components/auth/auth-step";
import { useAuthFlow } from "@/hooks/use-auth-flow";

export default function ForgotPasswordScreen() {
  const flow = useAuthFlow(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const newPassword = flow.step === "reset-password";
  const verifying = flow.step === "reset-code" || flow.step === "verify-factor";
  const factor = flow.step === "verify-factor";
  const onSubmit = () => {
    if (newPassword) void flow.savePassword(password);
    else if (factor) void flow.verify(code);
    else if (verifying) void flow.verifyReset(code);
    else void flow.requestReset(email);
  };
  return (
    <AuthStep
      title={
        newPassword
          ? "Choose a new password"
          : verifying
            ? "Verify your account"
            : "Reset your password"
      }
      description={
        newPassword
          ? "Choose a strong password for your MiniGram account."
          : factor && flow.factor === "totp"
            ? "Enter the code from your authenticator app."
            : factor && flow.factor === "backup_code"
              ? "Enter an unused backup code."
              : verifying
                ? "Enter the verification code sent to your account."
                : "Enter your account’s email address to receive a reset code."
      }
      inputs={
        newPassword
          ? [
              {
                label: "New password",
                value: password,
                onChangeText: setPassword,
                secureTextEntry: true,
                autoComplete: "new-password",
                autoCapitalize: "none",
              },
            ]
          : verifying
            ? [
                {
                  label: "Verification code",
                  value: code,
                  onChangeText: setCode,
                  keyboardType:
                    flow.factor === "backup_code" ? "default" : "number-pad",
                  textContentType: "oneTimeCode",
                  autoComplete: "one-time-code",
                  autoCapitalize: "none",
                },
              ]
            : [
                {
                  label: "Email",
                  value: email,
                  onChangeText: setEmail,
                  keyboardType: "email-address",
                  autoComplete: "email",
                  autoCapitalize: "none",
                  autoCorrect: false,
                },
              ]
      }
      error={flow.error}
      notice={flow.notice}
      busy={flow.busy}
      actionLabel={
        newPassword ? "Save password" : verifying ? "Verify" : "Send reset code"
      }
      onSubmit={onSubmit}
      onBack={() => {
        if (flow.step === "form") router.back();
        else {
          setCode("");
          setPassword("");
          void flow.back();
        }
      }}
      onResend={
        flow.step === "reset-code"
          ? () => {
              void flow.resendReset();
            }
          : factor &&
              (flow.factor === "email_code" || flow.factor === "phone_code")
            ? () => {
                void flow.resend();
              }
            : undefined
      }
    />
  );
}
