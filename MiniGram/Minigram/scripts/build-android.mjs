import { spawnSync } from "node:child_process";
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const javaHomes = [
  process.env.JAVA_HOME,
  "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
  "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
].filter(Boolean);
const javaHome = javaHomes.find((p) => existsSync(path.join(p, "bin/java")));
if (!javaHome)
  throw new Error("Install JDK 21 or set JAVA_HOME to a valid JDK.");
const env = {
  ...process.env,
  ANDROID_HOME:
    process.env.ANDROID_HOME ||
    path.join(process.env.HOME, "Library/Android/sdk"),
  JAVA_HOME: javaHome,
};
const run = (cmd, args, cwd = root) => {
  const result = spawnSync(cmd, args, { cwd, env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
};
run("npx", ["expo", "prebuild", "--platform", "android", "--no-install"]);
run(
  "./gradlew",
  [
    "assembleRelease",
    "-PreactNativeArchitectures=arm64-v8a",
    "--no-daemon",
    "-Pkotlin.compiler.execution.strategy=in-process",
    "--max-workers=2",
    "-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=1024m",
  ],
  path.join(root, "android"),
);
mkdirSync(path.join(root, "artifacts"), { recursive: true });
copyFileSync(
  path.join(root, "android/app/build/outputs/apk/release/app-release.apk"),
  path.join(root, "artifacts/MiniGram-preview-arm64.apk"),
);
console.log("Built artifacts/MiniGram-preview-arm64.apk");
