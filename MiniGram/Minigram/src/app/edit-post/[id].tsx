import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { api, type Id, messageOf } from "@/lib/api";
import { type Post } from "@/components/social/post-card";
import { Media } from "@/components/social/media";
import {
  Screen,
  Header,
  Loading,
  Empty,
  Button,
  Field,
  ErrorText,
  ScreenBoundary,
  T,
} from "@/components/social/ui";
function Editor({ post }: { post: Post }) {
  const edit = useMutation(api.posts.edit),
    pending = useRef(false);
  const [caption, setCaption] = useState(post.caption),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await edit({ id: post._id, caption });
      router.replace({ pathname: "/post/[id]", params: { id: post._id } });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Media id={post.media._id} kind={post.media.kind} />
      <View style={{ padding: 20, gap: 16 }}>
        <Field
          label="Caption"
          multiline
          maxLength={2200}
          value={caption}
          onChangeText={setCaption}
          editable={!busy}
          style={{ minHeight: 120, textAlignVertical: "top" }}
        />
        <T muted size={12}>
          {caption.length}/2,200
        </T>
        <ErrorText error={error} />
        <Button busy={busy} onPress={() => void submit()}>
          Save changes
        </Button>
      </View>
    </ScrollView>
  );
}
function Content() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = useQuery(api.posts.get, { id: id as Id<"posts"> });
  return (
    <Screen>
      <Header title="Edit caption" back />
      {post === undefined ? (
        <Loading />
      ) : !post?.own ? (
        <Empty
          title="Post unavailable"
          description="You can only edit your own posts."
        />
      ) : (
        <Editor post={post} />
      )}
    </Screen>
  );
}
export default function Page() {
  return (
    <ScreenBoundary>
      <Content />
    </ScreenBoundary>
  );
}
