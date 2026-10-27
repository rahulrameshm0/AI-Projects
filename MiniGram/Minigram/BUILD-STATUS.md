# MiniGram Android preview — 27 October 2026

Artifact: `artifacts/MiniGram-preview-arm64.apk` (approximately 38 MB, Android ARM64, preview signing).
Invitation: `artifacts/owner-invitation.txt` (one use, expires 30 days after creation).

## Connected services

- Hosted Convex development deployment: https://hallowed-crab-42.convex.cloud
- HTTP actions: https://hallowed-crab-42.convex.site
- Fresh Clerk development app: MiniGram, app_3LFSLFm24OIs1uYRgq9RT287tQO
- Clerk issuer: https://careful-amoeba-9124.clerk.accounts.dev
- Email, username, Google and Apple sign-in enabled in Clerk; Native API enabled.
- Convex integration active; media requests use session tokens.
- Mobile OAuth callback allowlisted: minigram://sso-callback
- Server-only CLERK_SECRET_KEY and CLERK_WEBHOOK_SECRET saved in Convex, never bundled.
- Clerk webhook subscribes to user.updated and user.deleted at /clerk-webhook.
- The APK bundle was checked to contain the new public Clerk key and hosted backend address.

## Fixes and verification

- Fixed Android release lint errors in the network-security config plugin.
- Increased Gradle compiler metaspace to 1024 MB.
- Fixed invisible/misaligned authentication buttons and the shared social Button by resolving press styles before passing them to Pressable. Verified the corrected screen in the earlier emulator build.
- Final Android release assembly succeeds; APK signature verification passes.
- Mobile TypeScript, lint, all 14 backend tests, and admin TypeScript pass.
- Expo Doctor previously passed 20/20; admin production build previously passed.

## Remaining release acceptance

This is a development preview, not a Play Store production release. It uses Clerk/Convex development instances and preview signing. Full authenticated device acceptance (provider login, onboarding, uploads/video playback, messaging, privacy changes and deletion) has not been completed with the fresh Clerk instance. The final APK's reinstall attempt could not run because the emulator was no longer connected. Production provider credentials, stable release signing, and administrator designation remain separate release setup steps.

## Post-login navigation fix

Artifact: `artifacts/MiniGram-login-fixed.apk` (also copied to the original preview filename).

The root index now remains available as a state-aware entry point, so route protection cannot strand a newly authenticated member on the public rules screen. OAuth callbacks and legacy /account links resolve incomplete profiles to onboarding, active profiles to Home, and restricted profiles to the unavailable screen. Header fallback returns through this entry point. The rules page also includes an explicit return/setup button.

TypeScript, lint and all 18 tests pass, including a backend-backed test that creates a new authenticated profile, completes admission, verifies its Home destination and reads the Home feed. Android release assembly and signature validation pass. The fixed APK installs on the API 35 emulator; opening /policies directly and using its Back button successfully returns to sign-in. A fresh Google login to Home has not been automated on-device. The hosted user's profile was observed to be incomplete with the owner invitation still unused; invitation/profile completion remains required before Home access.
