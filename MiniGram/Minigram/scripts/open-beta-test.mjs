import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
const fixture = JSON.parse(
  readFileSync(".beta-test-access.local.json", "utf8"),
);
const result = spawnSync("npx", ["convex", "env", "get", "CLERK_SECRET_KEY"], {
  encoding: "utf8",
});
const key = result.stdout.trim();
if (result.status || !key.startsWith("sk_test_"))
  throw new Error("Development backend required.");
const target = fixture.users[0];
const userResponse = await fetch(
  "https://api.clerk.com/v1/users/" + target.clerkId,
  { headers: { Authorization: "Bearer " + key } },
);
const user = await userResponse.json();
if (!userResponse.ok || user.private_metadata?.minigram_beta_test !== true)
  throw new Error("Only the approved beta test identity is allowed.");
const response = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ user_id: target.clerkId, expires_in_seconds: 60 }),
});
const ticket = await response.json();
if (!response.ok) throw new Error("Unable to create test sign-in link.");
const adb = path.join(
  process.env.ANDROID_HOME ||
    path.join(process.env.HOME, "Library/Android/sdk"),
  "platform-tools/adb",
);
const launched = spawnSync(
  adb,
  [
    "-s",
    "emulator-5554",
    "shell",
    "am",
    "start",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    "minigram://sign-in-link?ticket=" + encodeURIComponent(ticket.token),
    "com.rahulm.minigram",
  ],
  { stdio: "pipe" },
);
if (launched.status !== 0)
  throw new Error("Unable to open the beta test account in the emulator.");
console.log(
  "Opened the approved beta test account using a single-use 60-second sign-in link.",
);
