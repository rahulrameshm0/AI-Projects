# MiniGram

Expo SDK 58 social app with Clerk authentication, Convex storage/realtime data, and a separate admin dashboard. Includes feeds, photo/video posts, likes, comments, private profiles, follow requests, direct messages, activity, blocking, reporting, and account deletion.

## Development

Use Node 24 and npm. Copy `.env.example` to `.env`, configure the public values, then run:

```sh
npm ci
npm run backend
npm start
```

The current local Convex deployment uses ports 3210 and 3211. A physical phone cannot reach this Mac using `127.0.0.1` without USB port forwarding.

## Hosted deployment

Connect Convex to your account with `npx convex dev`, then deploy with `npx convex deploy`. Configure the server's `CLERK_JWT_ISSUER_DOMAIN` and activate Clerk's Convex integration for the same Clerk instance as the mobile publishable key.

Set `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SECRET` on the Convex server for account lifecycle synchronization. Configure the Clerk webhook for user updates/deletion at `/clerk-webhook` on the Convex site URL. Set `MINIGRAM_ADMIN_EMAIL` to the administrator's verified email. The admin dashboard manages invitations; onboarding requires an invitation and adult/policy consent.

Set the mobile build's `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_SITE_URL`, and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` to the matching hosted environment. Configure Clerk sign-in providers and redirects for scheme `minigram` and Android package `com.rahulm.minigram`. The `admin/` app uses its own environment settings for the same Clerk and Convex instances.

Never put server secrets in `EXPO_PUBLIC_*` variables or commit environment files.

## Android APK

The EAS preview profile produces an APK:

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Configure hosted public environment values in EAS before building. EAS returns a signed APK download link. See the [Expo APK guide](https://docs.expo.dev/build-reference/apk/).

For a local ARM64 preview, install JDK 21 and the Android SDK, then run:

```sh
npm run build:android
```

Output: `artifacts/MiniGram-preview-arm64.apk`. This preview uses debug signing and embeds the current environment. For a local-backend build, connect an Android phone with USB debugging enabled, start `npm run backend`, and forward both ports:

```sh
adb reverse tcp:3210 tcp:3210
adb reverse tcp:3211 tcp:3211
```

The app bundle is included in the APK; Metro is not required. The local backend and internet access for Clerk remain required. Use EAS-managed stable release signing and a hosted backend for distribution.

## Verification

```sh
npm run check
npx expo-doctor
```

`check` runs TypeScript, lint, and backend tests. Device verification must additionally cover sign-in, invitation onboarding, uploads/playback, privacy, messaging, and deletion against the intended hosted environment.
