import { useMutation } from "convex/react";
import { useState } from "react";
import { ScrollView } from "react-native";
import { api, messageOf } from "@/lib/api";
import {
  Screen,
  Header,
  T,
  Field,
  Button,
  ErrorText,
} from "@/components/social/ui";
export default function Page() {
  const remove = useMutation(api.users.deletion),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Screen>
      <Header title="Delete your account" back />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, gap: 22 }}
      >
        <T size={26} bold>
          This is permanent.
        </T>
        <T>
          Your profile and content will be hidden immediately. We’ll remove your
          posts, comments, messages and uploaded files, then delete your sign-in
          account.
        </T>
        <T muted>
          Content reported before deletion may be retained as restricted
          moderation evidence for up to 30 days. Other people may have already
          saved a copy of content you shared.
        </T>
        <Field
          label="Type DELETE to confirm"
          autoCapitalize="characters"
          autoCorrect={false}
          value={confirmation}
          onChangeText={setConfirmation}
          editable={!busy}
        />
        <ErrorText error={error} />
        <Button
          danger
          busy={busy}
          disabled={confirmation !== "DELETE"}
          onPress={() => {
            setBusy(true);
            setError("");
            remove({ confirmation }).catch((e) => {
              setError(messageOf(e));
              setBusy(false);
            });
          }}
        >
          Permanently delete account
        </Button>
      </ScrollView>
    </Screen>
  );
}
