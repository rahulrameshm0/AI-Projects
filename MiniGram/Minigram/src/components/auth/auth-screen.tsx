import { router } from "expo-router";
import { type ComponentRef, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuthFlow } from "@/hooks/use-auth-flow";
import { AuthStep } from "./auth-step";
import { CameraLogo, FieldIcon, ProviderIcon } from "./icons";

export function AuthScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signup = mode === "sign-up";
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const flow = useAuthFlow(signup);
  const { busy, error } = flow;
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const submit = () => {
    void flow.submit(username, email, password);
  };
  if (flow.step !== "form") {
    const profile = flow.step === "oauth-profile";
    const emailCode =
      flow.step === "verify-email" || flow.factor === "email_code";
    return (
      <AuthStep
        title={profile ? "Choose your username" : "Verify your account"}
        description={
          profile
            ? "Choose a username for your MiniGram account."
            : flow.step === "verify-email"
              ? `Enter the verification code sent to ${email}.`
              : flow.factor === "totp"
                ? "Enter the current code from your authenticator app."
                : flow.factor === "backup_code"
                  ? "Enter one of your account’s backup codes."
                  : `Enter the verification code sent to your ${emailCode ? "email" : "phone"}.`
        }
        inputs={
          profile
            ? [
                {
                  label: "Username",
                  value: username,
                  onChangeText: setUsername,
                  autoCapitalize: "none",
                  autoCorrect: false,
                  autoComplete: "username",
                },
              ]
            : [
                {
                  label: "Verification code",
                  value: code,
                  onChangeText: setCode,
                  keyboardType:
                    flow.factor === "backup_code" ? "default" : "number-pad",
                  textContentType: "oneTimeCode",
                  autoComplete: "one-time-code",
                  autoCapitalize: "none",
                  autoCorrect: false,
                },
              ]
        }
        error={error}
        notice={flow.notice}
        busy={busy}
        onSubmit={() => {
          void (profile
            ? flow.completeOAuthProfile(username)
            : flow.verify(code));
        }}
        onBack={() => {
          setCode("");
          void flow.back();
        }}
        onResend={
          !profile &&
          (flow.step === "verify-email" ||
            flow.factor === "email_code" ||
            flow.factor === "phone_code")
            ? () => {
                void flow.resend();
              }
            : undefined
        }
      />
    );
  }
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scroll}
        >
          <View
            style={[
              styles.content,
              {
                paddingTop: Math.max(
                  36,
                  Math.min(width, 430) * 0.265 - insets.top,
                ),
              },
            ]}
          >
            <View style={styles.brand}>
              <CameraLogo />
              <Text style={styles.wordmark}>MiniGram</Text>
            </View>
            <View style={styles.providers}>
              {(["Apple", "Google"] as const).map((provider) => (
                <Pressable
                  accessibilityRole="button"
                  key={provider}
                  disabled={busy}
                  accessibilityState={{ disabled: busy, busy }}
                  onPress={() => {
                    void flow.social(provider);
                  }}
                  onPressIn={() => setPressedButton(provider)}
                  onPressOut={() => setPressedButton(null)}
                  style={[
                    styles.provider,
                    pressedButton === provider && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.providerIcon,
                      { left: width < 360 ? 16 : 36 },
                    ]}
                  >
                    <ProviderIcon provider={provider} />
                  </View>
                  <Text style={styles.providerText}>
                    Continue with {provider}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.divider}>
              <View style={styles.rule} />
              <Text style={styles.or}>or</Text>
              <View style={styles.rule} />
            </View>
            <View style={styles.fields}>
              <View style={[styles.field, signup && styles.signupField]}>
                <FieldIcon name="user" />
                <TextInput
                  accessibilityLabel={signup ? "Username" : "Username or email"}
                  placeholder={signup ? "Username" : "Username or email"}
                  placeholderTextColor="#808087"
                  value={username}
                  onChangeText={(value) => {
                    setUsername(value);
                    if (error) flow.clearError();
                  }}
                  editable={!busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  underlineColorAndroid="transparent"
                  autoComplete="username"
                  style={styles.input}
                  returnKeyType="next"
                  onSubmitEditing={() =>
                    (signup ? emailRef : passwordRef).current?.focus()
                  }
                />
              </View>
              {signup && (
                <View style={[styles.field, signup && styles.signupField]}>
                  <FieldIcon name="mail" />
                  <TextInput
                    ref={emailRef}
                    accessibilityLabel="Email"
                    placeholder="Email"
                    placeholderTextColor="#808087"
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (error) flow.clearError();
                    }}
                    editable={!busy}
                    autoCapitalize="none"
                    autoCorrect={false}
                    underlineColorAndroid="transparent"
                    keyboardType="email-address"
                    autoComplete="email"
                    style={styles.input}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              )}
              <View style={[styles.field, signup && styles.signupField]}>
                <FieldIcon name="lock" />
                <TextInput
                  ref={passwordRef}
                  accessibilityLabel="Password"
                  placeholder="Password"
                  placeholderTextColor="#808087"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) flow.clearError();
                  }}
                  editable={!busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  underlineColorAndroid="transparent"
                  secureTextEntry={!visible}
                  autoComplete={signup ? "new-password" : "current-password"}
                  style={styles.input}
                  returnKeyType="go"
                  onSubmitEditing={submit}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    visible ? "Hide password" : "Show password"
                  }
                  disabled={busy}
                  onPress={() => setVisible(!visible)}
                  hitSlop={10}
                  style={styles.eye}
                >
                  <FieldIcon name={visible ? "eye-off" : "eye"} />
                </Pressable>
              </View>
            </View>
            {!signup && (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => router.push("/forgot-password")}
                style={styles.forgot}
              >
                <Text style={styles.forgotText}>Forgot?</Text>
              </Pressable>
            )}
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              accessibilityState={{ disabled: busy, busy }}
              onPress={submit}
              onPressIn={() => setPressedButton("submit")}
              onPressOut={() => setPressedButton(null)}
              style={[
                styles.submit,
                signup && styles.signupSubmit,
                (pressedButton === "submit" || busy) && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {signup ? "Create account" : "Sign in"}
                </Text>
              )}
            </Pressable>
            <View nativeID="clerk-captcha" />
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {signup ? "Already have an account?" : "New here?"}
              </Text>
              <Pressable
                disabled={busy}
                accessibilityRole="link"
                hitSlop={12}
                onPress={() =>
                  signup ? router.replace("/") : router.push("/sign-up")
                }
              >
                <Text style={styles.link}>
                  {signup ? "Sign in" : "Create an account"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center", paddingBottom: 28 },
  content: { width: "100%", maxWidth: 430, paddingHorizontal: 24 },
  brand: { alignItems: "center", marginBottom: 32, gap: 10 },
  wordmark: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: "700",
    letterSpacing: 0,
    color: "#080808",
  },
  providers: { gap: 12 },
  provider: {
    height: 60,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#dcdde2",
    alignItems: "center",
    justifyContent: "center",
  },
  providerIcon: { position: "absolute", left: 36 },
  providerText: { color: "#101010", fontSize: 18, fontWeight: "600" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginVertical: 23,
  },
  rule: { flex: 1, height: 1, backgroundColor: "#e6e6eb" },
  or: { fontSize: 16, color: "#808087" },
  fields: { gap: 12 },
  field: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: "#dedee4",
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  signupField: { minHeight: 56 },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: "#171717",
    paddingVertical: 16,
  },
  eye: {
    minWidth: 40,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  forgot: { alignSelf: "flex-end", paddingTop: 16, paddingBottom: 34 },
  forgotText: {
    fontSize: 16,
    color: "#28282b",
    textDecorationLine: "underline",
  },
  submit: {
    minHeight: 60,
    borderRadius: 15,
    backgroundColor: "#0b0b0b",
    alignItems: "center",
    justifyContent: "center",
  },
  signupSubmit: { marginTop: 28 },
  submitText: { color: "#fff", fontSize: 19, fontWeight: "500" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginTop: 26,
    flexWrap: "wrap",
  },
  footerText: { fontSize: 16, color: "#808087" },
  link: { fontSize: 16, color: "#ff2035" },
  pressed: { opacity: 0.65 },
  error: { color: "#d51b30", fontSize: 14, marginVertical: 10 },
});
