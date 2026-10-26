import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { api, messageOf } from "@/lib/api";
import {
  Screen,
  Header,
  T,
  Field,
  Button,
  ErrorText,
  Empty,
  usePalette,
} from "@/components/social/ui";
export default function Page() {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>(),
    p = usePalette(),
    create = useMutation(api.reports.create),
    [reason, setReason] = useState(""),
    [details, setDetails] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState("");
  const valid = ["user", "post", "comment", "message"].includes(type);
  return (
    <Screen>
      <Header title="Report" back />
      {sent ? (
        <Empty
          icon="check"
          title="Thanks for speaking up"
          description="Your report has been sent to the community administrator for review."
          label="Done"
          action={() => router.back()}
        />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, gap: 18 }}
        >
          <T size={24} bold>
            What’s happening?
          </T>
          <T muted>
            Your report is shared with moderators. The account you report won’t
            see who submitted it.
          </T>
          {[
            "Spam or scam",
            "Harassment or bullying",
            "Hate or threats",
            "Sexual or violent content",
            "Something else",
          ].map((label) => (
            <Pressable
              key={label}
              onPress={() => setReason(label)}
              accessibilityRole="radio"
              accessibilityState={{ selected: reason === label }}
              style={{
                padding: 16,
                borderRadius: 13,
                borderWidth: 1,
                borderColor: reason === label ? p.text : p.line,
              }}
            >
              <T>{label}</T>
            </Pressable>
          ))}
          <Field
            label="Additional details (optional)"
            multiline
            maxLength={800}
            value={details}
            onChangeText={setDetails}
            style={{ minHeight: 100, textAlignVertical: "top" }}
          />
          <ErrorText error={error} />
          <Button
            busy={busy}
            disabled={!reason || !valid}
            onPress={() => {
              setBusy(true);
              setError("");
              create({
                targetType: type as "user" | "post" | "comment" | "message",
                targetId: id,
                reason: `${reason}${details ? " — " + details : ""}`,
              })
                .then(() => setSent(true))
                .catch((e) => setError(messageOf(e)))
                .finally(() => setBusy(false));
            }}
          >
            Send report
          </Button>
        </ScrollView>
      )}
    </Screen>
  );
}
