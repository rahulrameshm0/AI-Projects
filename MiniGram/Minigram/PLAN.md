# MiniGram — Product Specification and Implementation Plan

Status: planning complete; implementation not started by this task.

This document records the interview decisions and the sequence for later implementation. Creating this file does not authorize starting implementation. Complete phases only when the user requests implementation, and record validation evidence as work proceeds.

## 1. Product and baseline

Build a minimal, mobile-first social app for iOS and Android. Start with an invite-only beta capped at 100 accounts, for adults aged 18+ in India, in English. The intended eventual audience is the general public; the differentiator remains unresolved.

Use the existing MiniGram/Minigram project, not a replacement scaffold.

Manifest baseline observed during planning (declared versions, not verified installed versions):

| Technology | Declaration |
| --- | --- |
| Expo | ~58.0.19 |
| Expo Router | ~58.0.26 |
| React Native | 0.88.0 |
| React | 19.3.0 |
| TypeScript | ~6.0.3 |

Required stack additions: Clerk authentication, Convex backend/database/storage, and NativeWind styling. A separate Next.js admin dashboard uses the same Clerk and Convex projects for each environment.

Follow AGENTS.md. Preserve the existing package-manager convention, use Expo-compatible package installation, keep routes in src/app/, and keep non-route code outside that directory. Use SDK-matched documentation and record exact resolved versions before implementation. Do not silently downgrade Expo or replace agreed technologies.

## 2. User experience and scope

### Navigation and visual design

Four native tabs: **Home, Messages, Explore, Profile**.

- Minimal black-and-white styling, system fonts, subtle borders, and device light/dark theme.
- Respect native tab behavior and platform appearance; use NativeWind for screen styling.
- Home: chronological following feed including own posts, create-post action, and activity bell.
- Messages: accepted conversations, message requests, and unread badges.
- Explore: recent public posts and username/display-name prefix search.
- Profile: own posts, editable profile, follower management, and Settings.
- Supporting screens: post detail/comments, other profiles, composer, conversation, activity, follow requests, settings, and reports.
- Scrolling feed with tap-to-play video, not a full-screen swipe feed.
- Provide loading, empty, error, retry, and permission-denied states. Empty Home directs users to Explore.

### Authentication and onboarding

- Sign up/log in with Google or Apple through Clerk.
- All consumer content requires authentication and completed admission/onboarding.
- Validate a single-use invite before onboarding completion. Provider sign-in alone does not grant app access.
- Enforce the 100-account beta cap atomically.
- Require a case-insensitively unique username and display name. Avatar and bio are optional.
- Explicitly show a public/private choice, with private preselected.
- Returning users resume incomplete onboarding or enter Home.
- Enforce signed-out, incomplete, suspended, and deleting account restrictions in the backend.

### Profiles, follows, and privacy

- Editable username, display name, avatar, bio, and privacy. Email/identity remain managed through Clerk.
- Public content is visible to admitted signed-in users, not logged-out internet visitors.
- Private posts require approved follows.
- Private profile avatar, username, display name, bio, and follower/following counts remain visible to non-followers; posts and follower/following lists are hidden.
- Public follows take effect immediately; private follows require approval.
- Switching to private keeps existing followers.
- Switching to public exposes existing posts and accepts pending follow requests.
- Private owners can remove followers without notifications; removed users lose private-content access and must request again.

### Posts and interactions

- One image or one video per post, plus optional caption.
- Device-library uploads only; no capture, filters, editing suite, or carousel.
- Images: maximum 10 MB. Videos: maximum 60 seconds and 50 MB.
- Convex stores media initially; no dedicated transcoding service in the initial scope.
- One toggleable like per user per post.
- Flat comments without replies or comment likes.
- Users delete their own posts/comments. Post owners can also remove comments on their posts.
- Home shows newest posts from followed accounts and the current user. Explore shows newest public posts.
- Search matches username/display-name prefixes. Private profiles are discoverable, but posts remain protected.
- All feeds, search results, profiles, and interactions enforce current visibility and block rules.

### Direct messages

- One-to-one text, image, and video messages; maximum one attachment per message, using post media limits.
- Before acceptance, allow one text-only introductory message. Recipient can accept, decline, or block.
- Media becomes available only after acceptance.
- Accepted conversations persist after unfollowing or switching account privacy.
- Live updates while open and unread counts; no push notifications, read receipts, typing indicators, or online status.
- Senders can unsend their messages, leaving a “Message deleted” placeholder.
- Blocking prevents further messages. Existing messages remain visible unless unsent or removed through account deletion.

### Activity, safety, and deletion

- Home activity bell covers likes, comments, follows, and follow requests.
- Report users, posts, comments, and messages.
- Blocking removes follows in both directions, cancels pending follow/message requests, and prevents further interaction. Unblocking does not restore follows.
- Admin dashboard: review reports/evidence, remove content, suspend accounts, and manage invites.
- Account deletion is available in Settings with confirmation; remove profile and user-created content.
- Immediately hide deleted content and revoke access; remove files through retryable background cleanup.
- Content reported before deletion retains a restricted evidence copy for 30 days, then expires. Disclose this exception in the privacy policy.

### Explicitly outside v1

Consumer web app, logged-out browsing, monetization, personalized recommendations, hashtag/caption search, carousels, in-app capture/editing, threaded comments, comment likes, group chats, calls, disappearing messages, push notifications, typing/read indicators, offline publishing, and guaranteed background uploads.

Do not build speculative infrastructure for these features.

## 3. Architecture and data

### Responsibilities and interfaces

- Clerk: identity, provider sign-in, and sessions.
- Convex: application source of truth, authorization, business logic, realtime subscriptions, storage, and cleanup jobs.
- Mobile: navigation, presentation, library selection, progress, and recovery UI.
- Next.js admin: administrative UI; admin permissions remain enforced in Convex.
- Clients use Convex queries, mutations, and actions. Never rely on client-only ownership or visibility checks.
- Protect media with authenticated delivery when permissions require checks on every request. Permanent bearer URLs are not sufficient protection for private posts/messages or revocable access.
- Separate development, staging, and production data and credentials; do not include secrets in client bundles.

### Core entities

| Entity | Essential information |
| --- | --- |
| Users | Clerk identity, normalized username, display name, bio, avatar, privacy, admission/account status |
| Invitations | Code hash, creator, redemption state, redeeming user |
| Follows | Follower, target, pending/accepted state |
| Posts | Author, media reference, caption, creation time, deletion state |
| Media assets | Owner, storage reference, type, size, duration, lifecycle state |
| Likes | User and post |
| Comments | Author, post, text, creation/deletion state |
| Conversations | Unique participant pair, initiator, request/accepted state |
| Messages | Conversation, sender, text/media, creation/deletion state, retry identifier |
| Read state | Participant, conversation, last-read position |
| Activity | Recipient, actor, event type, target, read state |
| Blocks | Blocking user and blocked user |
| Reports | Reporter, target, reason, review state, evidence expiry |
| Moderation records | Admin actor, action, target, reason, timestamp |

Enforce uniqueness transactionally for usernames, invitation redemption, follows, likes, and conversation pairs. Index and paginate feeds, search, comments, messages, and admin queues; avoid full-table scans.

### Async operations and failure handling

- Upload in the foreground with progress and explicit retry controls.
- Require connectivity to publish or send; preserve entered text while the screen remains open.
- Publish/send only after successful upload and trusted validation of ownership, type, size, and video duration. Client checks alone are insufficient.
- Make retried publication/sends and Clerk lifecycle synchronization idempotent.
- Clean orphaned uploads and deleted assets with retryable jobs.
- Revoke access immediately even when physical cleanup is pending.
- Clear access-sensitive client state on session/permission changes.

## 4. Implementation phases

### Phase 1 — Validate the existing foundation

- [ ] Inspect existing routes, tabs, theme, lockfile, and working-tree changes; preserve unrelated work.
- [ ] Run baseline lint, type checking, and Expo diagnostics.
- [ ] Verify NativeWind compatibility with Expo 58 and record exact dependency versions.
- [ ] Verify Google/Apple sign-in on both platforms, including Apple's Android flow.
- [ ] Prove authenticated image/video delivery, seeking, and trusted upload validation with Convex.
- [ ] Record blockers; do not weaken privacy or change the stack to bypass them silently.

Acceptance: compatible stack and feasible auth/media paths documented before feature implementation.

### Phase 2 — App shell and environments

- [ ] Configure NativeWind and shared light/dark design tokens.
- [ ] Build four native tabs and supporting navigation.
- [ ] Add shared loading, empty, error, retry, and permission states.
- [ ] Separate environment configuration and configure EAS development/preview builds.

Acceptance: both platforms launch/navigate correctly, with accessible labels, text scaling, safe areas, and keyboard behavior.

### Phase 3 — Authentication, admission, and profiles

- [ ] Integrate Clerk and Convex.
- [ ] Implement invitations, account cap, onboarding, and protected navigation.
- [ ] Implement profile viewing/editing and backend uniqueness/account-status rules.

Acceptance: cancellation, returning login, incomplete onboarding, duplicate usernames, invite races, and suspended accounts behave correctly.

### Phase 4 — Social permissions

- [ ] Implement follows, requests, approval/rejection, unfollowing, and follower removal.
- [ ] Implement privacy transitions and blocking.
- [ ] Centralize visibility/ownership rules shared by all content surfaces.

Acceptance: direct unauthorized API calls cannot access private content or bypass blocks.

### Phase 5 — Media, posts, and discovery

- [ ] Implement library selection, upload progress, validation, publication, and cleanup.
- [ ] Build Home, Explore, people search, and profile post lists.
- [ ] Add post details, likes, comments, and permitted deletion.
- [ ] Handle canceled/failed uploads, unsupported media, slow networks, and retry duplication.

Acceptance: image/video workflows work on both platforms; deleted or newly private content stops being served to unauthorized users.

### Phase 6 — Messaging and activity

- [ ] Implement message requests and acceptance controls.
- [ ] Add live text/media conversations, unread state, and pagination.
- [ ] Implement unsending and block enforcement.
- [ ] Add activity events and Home activity screen.

Acceptance: retries do not duplicate messages; unaccepted requests cannot send media; outsiders cannot access conversations.

### Phase 7 — Moderation and deletion

- [ ] Build separate Next.js admin dashboard with Convex-enforced admin authorization.
- [ ] Add reports, review actions, suspensions, and invitation management.
- [ ] Implement account deletion, storage cleanup, restricted evidence retention, and expiry.

Acceptance: ordinary users cannot invoke admin operations; deletion revokes access immediately; cleanup tolerates retries and partial failure.

### Phase 8 — Beta readiness

- [ ] Add crash/error reporting and backend logs without message bodies or uploaded media.
- [ ] Measure storage, bandwidth, and API usage against the ₹5,000/month target.
- [ ] Configure alerts and application limits, counting message attachments as uploads.
- [ ] Stop new uploads/admissions at operational thresholds; preserve existing access and text messaging where possible.
- [ ] Run critical-flow checks on iOS and Android.
- [ ] Complete privacy, age-gating, moderation, and store-readiness review.
- [ ] Release to invited beta users and monitor reliability, reports, and spending.

Acceptance: critical flows and permission tests pass; alerts work; no unresolved privacy/data-loss blocker remains.

## 5. Quality, operations, and delivery

Automated backend coverage must include private access/revocation, blocking, suspension, invite/cap races, duplicate likes/follows/conversations, retry idempotency, message-request restrictions, conversation membership, admin permissions, cleanup retries, and evidence expiry.

Manual iOS/Android checks must cover sign-in, onboarding, media permissions, uploads/playback, follow requests, messaging, blocking, deletion, poor connectivity, app interruption, keyboard behavior, accessibility, and both themes.

Run repository-required lint/type checks before declaring implementation tasks complete. Use CI for lint, type checks, and backend tests; verify staging before production. Use EAS for mobile builds/submission. Choose and document admin hosting and monitoring vendors against the budget before provisioning.

## 6. Assumptions and unresolved risks

### Assumptions

- A familiar social experience is sufficient for beta; the product differentiator remains unresolved.
- The user is building with AI assistance, without a fixed deadline.
- The user initially operates the admin dashboard and reviews reports.
- Existing Clerk/Convex projects and Apple/Google developer accounts remain unconfirmed.
- ₹5,000/month excludes app-store fees and is a target, not a guaranteed provider billing cap.
- The earlier fresh-project assumption is superseded: use this existing MiniGram repository.

### Open risks and validation gates

- Exact NativeWind/Clerk compatibility with the existing Expo baseline.
- Apple sign-in on Android and provider/developer-account configuration.
- Authenticated video delivery, seeking, codec compatibility, and trusted duration validation without transcoding.
- Storage/bandwidth costs, rate limits, abuse controls, and enforceable usage thresholds.
- Empty discovery feeds when early users keep private accounts.
- Moderation workload, age gating, privacy disclosures, report retention, and store acceptance.
- Complete deletion across Clerk, Convex, files, logs, and retained evidence.
- Hosting/monitoring vendor selection, release identifiers, and environment credentials.
- Revocation cannot recall media already downloaded by a recipient.
- Text-length limits, search normalization details, request reattempt policy, and exact per-user usage limits still need explicit implementation decisions; do not treat them as previously agreed requirements.

### Documentation references

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [Expo native tabs](https://docs.expo.dev/router/advanced/native-tabs/)
- [NativeWind installation](https://www.nativewind.dev/docs/getting-started/installation)
- [Clerk Expo SDK](https://clerk.com/docs/reference/expo/overview)
- [Clerk Google sign-in](https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google)
- [Clerk Apple sign-in](https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-apple)
- [Convex uploads](https://docs.convex.dev/file-storage/upload-files)
- [Convex authenticated file delivery](https://docs.convex.dev/file-storage/serve-files)

Recheck documentation when implementation begins. Update this file with completed phases, validation evidence, decisions, and blockers. A finished UI alone does not mean a phase is complete.
