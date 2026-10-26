import { useMutation } from "convex/react";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { api, messageOf } from "@/lib/api";
import { useMediaUpload, type Selection } from "@/hooks/use-media-upload";
import { Media } from "@/components/social/media";
import {
  Screen,
  Header,
  Button,
  Field,
  Empty,
  ErrorText,
  T,
} from "@/components/social/ui";
export default function Compose() {
  const { pick, upload, progress, uploading } = useMediaUpload("post"),
    publish = useMutation(api.posts.publish),
    [selection, setSelection] = useState<Selection | null>(null),
    [caption, setCaption] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    clientId = useRef(randomUUID());
  const select = async () => {
    try {
      setError("");
      const asset = await pick();
      if (asset) {
        setSelection(asset);
        clientId.current = randomUUID();
      }
    } catch (e) {
      setError(messageOf(e));
    }
  };
  const submit = async () => {
    if (busy || !selection) return;
    setBusy(true);
    setError("");
    try {
      const media = await upload(selection);
      const id = await publish({ media, caption, clientId: clientId.current });
      router.replace({ pathname: "/post/[id]", params: { id } });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="New post" back />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {selection ? (
          <View>
            <Media uri={selection.uri} kind={selection.kind} />
            <View style={{ padding: 20, gap: 18 }}>
              <Button secondary disabled={busy} onPress={() => void select()}>
                Choose another photo or video
              </Button>
              <Field
                label="Caption"
                accessibilityLabel="Post caption"
                placeholder="What’s the moment?"
                multiline
                maxLength={2200}
                value={caption}
                onChangeText={setCaption}
                editable={!busy}
                style={{ minHeight: 120, textAlignVertical: "top" }}
              />
              <T size={12} muted style={{ textAlign: "right" }}>
                {caption.length}/2,200
              </T>
              <ErrorText error={error} />
              {uploading && (
                <T muted size={14}>
                  {progress < 1
                    ? `Uploading ${Math.round(progress * 100)}%…`
                    : "Checking your media…"}
                </T>
              )}
              <Button busy={busy} onPress={() => void submit()}>
                {error ? "Try posting again" : "Post"}
              </Button>
              <T muted size={12}>
                One photo or video. Images up to 10 MB; videos up to 60 seconds
                and 50 MB.
              </T>
            </View>
          </View>
        ) : (
          <>
            <Empty
              icon="plus"
              title="Share a real moment"
              description="Choose one photo or video from your library."
              label="Choose from library"
              action={() => void select()}
            />
            <View style={{ padding: 20 }}>
              <ErrorText error={error} />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
