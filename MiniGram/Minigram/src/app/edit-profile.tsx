import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { api, messageOf } from "@/lib/api";
import { useMe } from "@/providers/app-state";
import { useMediaUpload, type Selection } from "@/hooks/use-media-upload";
import { Avatar, Media } from "@/components/social/media";
import {
  Screen,
  Header,
  T,
  Field,
  Button,
  ErrorText,
} from "@/components/social/ui";
export default function Page() {
  const me = useMe(),
    save = useMutation(api.users.update),
    upload = useMediaUpload("avatar"),
    [username, setUsername] = useState(me.username),
    [name, setName] = useState(me.displayName),
    [bio, setBio] = useState(me.bio),
    [privacy, setPrivacy] = useState(me.privacy),
    [photo, setPhoto] = useState<Selection | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const avatar = photo ? await upload.upload(photo) : undefined;
      await save({ username, displayName: name, bio, privacy, avatar });
      router.back();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="Edit profile" back />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 48 }}
      >
        <View style={{ alignItems: "center" }}>
          {photo ? (
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                overflow: "hidden",
              }}
            >
              <Media uri={photo.uri} />
            </View>
          ) : (
            <Avatar user={me} size={96} />
          )}
        </View>
        <Button
          secondary
          disabled={busy}
          onPress={() => {
            upload
              .pick()
              .then((p) => {
                if (p) setPhoto(p);
              })
              .catch((e) => setError(messageOf(e)));
          }}
        >
          Change profile photo
        </Button>
        <Field
          label="Username"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          maxLength={24}
        />
        <Field
          label="Display name"
          value={name}
          onChangeText={setName}
          maxLength={50}
        />
        <Field
          label="Bio"
          multiline
          value={bio}
          onChangeText={setBio}
          maxLength={160}
          style={{ minHeight: 100, textAlignVertical: "top" }}
        />
        <T muted size={12}>
          {bio.length}/160
        </T>
        <Field
          label="Account privacy"
          editable={false}
          value={
            privacy === "private"
              ? "Private — approved followers only"
              : "Public — all admitted members"
          }
        />
        <Button
          secondary
          disabled={busy}
          onPress={() => {
            const next = privacy === "private" ? "public" : "private";
            if (next === "public")
              Alert.alert(
                "Make your account public?",
                "All admitted MiniGram members will see your posts, and pending follow requests will be accepted.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Make public", onPress: () => setPrivacy("public") },
                ],
              );
            else setPrivacy("private");
          }}
        >
          Switch to {privacy === "private" ? "public" : "private"}
        </Button>
        <T muted size={12}>
          Use your email address to sign in. Updating your MiniGram profile does
          not change your sign-in details.
        </T>
        <ErrorText error={error} />
        {upload.uploading && (
          <T muted size={13}>
            Uploading your photo… {Math.round(upload.progress * 100)}%
          </T>
        )}
        <Button busy={busy} onPress={() => void submit()}>
          Save changes
        </Button>
      </ScrollView>
    </Screen>
  );
}
