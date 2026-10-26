# Authentication screen verification

Reference: `design/auth-screen-design-ref.png`, panels 03 (Sign In) and 04 (Sign Up).

Implemented the two form screens with shared camera branding, provider buttons, outlined inputs, password visibility, account navigation, keyboard handling, and local required-field/email validation. The reference's white palette is intentional for these screens. Existing starter tabs are no longer mounted over authentication.

This is UI implementation only. Clerk/Convex integration, real provider sign-in, password recovery, admission, and the other onboarding panels remain unimplemented. Submitting populated forms or provider buttons displays an explicit unavailable message; no authenticated session is fabricated.

Checks: TypeScript, Expo lint, and Android Metro bundle compilation pass. The SDK-compatible react-native-svg dependency renders the camera and form/provider icons. ESLint configuration was initialized because the starter project lacked it. Existing starter ref and web hydration issues were corrected to allow the required checks to pass.

Native screenshot comparison completed on the separate `MiniGram_Visual_API35` emulator, running Expo Go 58.0.5 at 1080 × 2400, density 420. The existing API 37 emulator had repeated Android system-process watchdog failures, so Android API 35 Google APIs was installed for verification. Xcode/iOS Simulator is not installed.

Screenshot loop:
1. Captured initial sign-in render and compared its positions against panel 03, normalizing for screen width.
2. Enlarged the camera and wordmark, adjusted brand spacing and sign-in action spacing, then recaptured.
3. Captured panel 04, reduced sign-up field heights, and captured both final screens.

Final screenshots: `sign-in.png` and `sign-up.png` in this directory. The layout closely follows the design. It is not a pixel-identical iPhone reproduction: Android system fonts/bars, Expo Go’s floating development control, and the vector recreation of the camera mark differ from the supplied raster board.

Manual checks: empty sign-up submission visibly shows required-field validation; the Sign in link returns to the sign-in screen; password starts masked and toggles to visible text with the accessible label changing from Show password to Hide password. Final TypeScript, Expo lint, and whitespace checks pass.

Repeat captures with `./scripts/capture-auth.sh emulator-5554 sign-in` or `./scripts/capture-auth.sh emulator-5554 sign-up` while Metro runs on port 8081. The script waits for confirmation that rendering is complete before saving the screenshot.
