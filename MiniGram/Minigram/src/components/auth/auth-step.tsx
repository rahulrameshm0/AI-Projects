import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraLogo } from "./icons";

type Input = TextInputProps & { label: string };
export function AuthStep({
  title,
  description,
  inputs,
  error,
  notice,
  busy,
  actionLabel = "Continue",
  onSubmit,
  onBack,
  onResend,
}: {
  title: string;
  description: string;
  inputs: Input[];
  error?: string;
  notice?: string;
  busy: boolean;
  actionLabel?: string;
  onSubmit: () => void;
  onBack: () => void;
  onResend?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.content}>
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              onPress={onBack}
              style={styles.back}
            >
              <Text style={styles.backText}>‹ Back</Text>
            </Pressable>
            <View style={styles.brand}>
              <CameraLogo />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            <View style={styles.fields}>
              {inputs.map(({ label, ...input }) => (
                <View key={label}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    {...input}
                    accessibilityLabel={label}
                    editable={!busy}
                    placeholderTextColor="#808087"
                    style={styles.input}
                    underlineColorAndroid="transparent"
                    onSubmitEditing={onSubmit}
                  />
                </View>
              ))}
            </View>
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            {!!notice && (
              <Text accessibilityLiveRegion="polite" style={styles.notice}>
                {notice}
              </Text>
            )}
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              onPress={onSubmit}
              style={[styles.button, busy && styles.disabled]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{actionLabel}</Text>
              )}
            </Pressable>
            {onResend && (
              <Pressable
                disabled={busy}
                accessibilityRole="button"
                onPress={onResend}
                style={styles.resend}
              >
                <Text style={styles.resendText}>Send a new code</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center", paddingBottom: 32 },
  content: { width: "100%", maxWidth: 430, paddingHorizontal: 24 },
  back: { paddingVertical: 18, alignSelf: "flex-start" },
  backText: { fontSize: 18, color: "#222" },
  brand: { alignItems: "center", marginTop: 36, marginBottom: 30 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#080808",
    textAlign: "center",
  },
  description: {
    color: "#77777e",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 32,
  },
  fields: { gap: 18 },
  label: { fontSize: 15, color: "#444", marginBottom: 8 },
  input: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dedee4",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: "#171717",
  },
  button: {
    minHeight: 60,
    borderRadius: 15,
    backgroundColor: "#0b0b0b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "500" },
  disabled: { opacity: 0.55 },
  error: { color: "#d51b30", fontSize: 15, lineHeight: 22, marginTop: 16 },
  notice: { color: "#258642", fontSize: 15, lineHeight: 22, marginTop: 16 },
  resend: { alignItems: "center", paddingVertical: 22 },
  resendText: { color: "#e82035", fontSize: 16 },
});
