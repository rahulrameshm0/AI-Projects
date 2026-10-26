import { useConvex, useMutation } from "convex/react";
import { useClerk } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { api, messageOf } from "@/lib/api";
import { useMediaUpload, type Selection } from "@/hooks/use-media-upload";
import { Media, Avatar } from "@/components/social/media";
import { CameraLogo } from "@/components/auth/icons";
import {
  Screen,
  Header,
  T,
  Field,
  Button,
  ErrorText,
  Icon,
  usePalette,
} from "@/components/social/ui";
import { useMe } from "@/providers/app-state";
export default function Onboarding() {
  const p = usePalette(),
    me = useMe(),
    client = useConvex(),
    complete = useMutation(api.users.complete),
    { signOut } = useClerk(),
    upload = useMediaUpload("avatar"),
    [step, setStep] = useState(0),
    [code, setCode] = useState(""),
    [username, setUsername] = useState(""),
    [name, setName] = useState(""),
    [privacy, setPrivacy] = useState<"private" | "public">("private"),
    [adult, setAdult] = useState(false),
    [policies, setPolicies] = useState(false),
    [avatar, setAvatar] = useState<Selection | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const next = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (step === 0) {
        if (!adult || !policies)
          throw new Error(
            "Confirm your age and accept the community rules and privacy policy.",
          );
        if (!(await client.query(api.users.checkInvite, { code })))
          throw new Error(
            "That invitation is invalid, used, expired, or the beta is full.",
          );
        setStep(1);
      } else if (step === 1) {
        if (!/^[a-z][a-z0-9_.]{3,23}$/.test(username.trim().toLowerCase()))
          throw new Error(
            "Choose 4–24 letters, numbers, dots or underscores, starting with a letter.",
          );
        if (!name.trim()) throw new Error("Enter your display name.");
        setStep(2);
      } else {
        const media = avatar ? await upload.upload(avatar) : undefined;
        await complete({
          code,
          username,
          displayName: name,
          privacy,
          adult,
          policies,
          avatar: media,
        });
      }
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  const check = (
    checked: boolean,
    onPress: () => void,
    children: import("react").ReactNode,
  ) => (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingVertical: 10,
      }}
    >
      <View
        style={{
          width: 23,
          height: 23,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: checked ? p.text : p.line,
          backgroundColor: checked ? p.text : p.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <Icon name="check" size={17} color={p.bg} />}
      </View>
      <View style={{ flex: 1 }}>
        <T size={14}>{children}</T>
      </View>
    </Pressable>
  );
  return (
    <Screen>
      <Header
        title={
          step === 0 ? "Welcome to MiniGram" : `${step}/2 — Set up your profile`
        }
        back={false}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingBottom: 48, gap: 22 }}
      >
        <View style={{ alignItems: "center", marginTop: 24 }}>
          {step === 1 ? (
            <Pressable
              accessibilityLabel="Choose profile photo"
              onPress={() => {
                upload
                  .pick()
                  .then((a) => {
                    if (a) setAvatar(a);
                  })
                  .catch((e) => setError(messageOf(e)));
              }}
            >
              {avatar ? (
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    overflow: "hidden",
                  }}
                >
                  <Media uri={avatar.uri} />
                </View>
              ) : (
                <Avatar user={me} size={100} />
              )}
            </Pressable>
          ) : (
            <CameraLogo />
          )}
        </View>
        <View style={{ gap: 10 }}>
          <T size={29} bold style={{ textAlign: "center" }}>
            {step === 0
              ? "You’re invited."
              : step === 1
                ? "Make yourself at home."
                : "Choose your privacy."}
          </T>
          <T muted style={{ textAlign: "center" }}>
            {step === 0
              ? "A small community for real moments. Enter your invitation code to join the beta."
              : step === 1
                ? "Add a photo and tell people who you are."
                : "You can change this any time in settings."}
          </T>
        </View>
        {step === 0 ? (
          <>
            <Field
              label="Invitation code"
              placeholder="Enter your code"
              autoCapitalize="characters"
              autoCorrect={false}
              value={code}
              onChangeText={setCode}
              editable={!busy}
              maxLength={32}
            />
            {check(
              adult,
              () => setAdult(!adult),
              "I am 18 or older and live in India.",
            )}
            {check(
              policies,
              () => setPolicies(!policies),
              "I accept the community rules and privacy policy.",
            )}
            <Pressable onPress={() => router.push("/policies")}>
              <T size={14} style={{ textDecorationLine: "underline" }}>
                Read the community rules and privacy policy
              </T>
            </Pressable>
          </>
        ) : step === 1 ? (
          <>
            <Button
              secondary
              disabled={busy}
              onPress={() => {
                upload
                  .pick()
                  .then((a) => {
                    if (a) setAvatar(a);
                  })
                  .catch((e) => setError(messageOf(e)));
              }}
            >
              Choose profile photo
            </Button>
            <Field
              label="Username"
              placeholder="alex.r"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              maxLength={24}
              editable={!busy}
            />
            <Field
              label="Display name"
              placeholder="Alex Rivera"
              value={name}
              onChangeText={setName}
              maxLength={50}
              editable={!busy}
            />
            <T size={12} muted>
              Your username is unique on MiniGram. A profile photo is optional.
            </T>
          </>
        ) : (
          <>
            {(["private", "public"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected: privacy === value }}
                disabled={busy}
                onPress={() => setPrivacy(value)}
                style={{
                  padding: 20,
                  borderWidth: 1,
                  borderColor: privacy === value ? p.text : p.line,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <Icon name={value === "private" ? "lock" : "globe"} size={30} />
                <View style={{ flex: 1 }}>
                  <T bold>{value === "private" ? "Private" : "Public"}</T>
                  <T muted size={13}>
                    {value === "private"
                      ? "Only approved followers see your posts."
                      : "Anyone admitted to MiniGram can see your posts."}
                  </T>
                </View>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: privacy === value ? 6 : 1,
                    borderColor: privacy === value ? p.accent : p.muted,
                  }}
                />
              </Pressable>
            ))}
            <T muted size={13}>
              Your profile name, bio, photo and follower counts are visible to
              admitted members. Public posts are still hidden from people
              outside MiniGram.
            </T>
          </>
        )}
        <ErrorText error={error} />
        {upload.uploading && (
          <T muted size={13}>
            Uploading your photo… {Math.round(upload.progress * 100)}%
          </T>
        )}
        <Button busy={busy} onPress={() => void next()}>
          {step === 2 ? "Join MiniGram" : "Continue"}
        </Button>
        {step > 0 && (
          <Button
            secondary
            disabled={busy}
            onPress={() => {
              setError("");
              setStep(step - 1);
            }}
          >
            Back
          </Button>
        )}
        <Pressable
          disabled={busy}
          onPress={() => void signOut()}
          style={{ alignItems: "center", padding: 10 }}
        >
          <T muted size={14}>
            Use another account
          </T>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
