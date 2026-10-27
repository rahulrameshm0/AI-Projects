# MiniGram 1.1.0 beta

Android version code: 2. EAS project: `rahulrameshm0/Minigram`.
Cloud build: https://expo.dev/accounts/rahulrameshm0/projects/Minigram/builds/20b361ba-507f-4cff-9916-e76a64923e64

## Completed interactions

- Authentication and invitation/profile onboarding, with state-aware routing to Home.
- Image/video posts, owner deletion, owner caption editing and edited indicators.
- Immediate heart feedback; explicit desired-state likes so network retries do not undo an action or double the count; paginated liker lists.
- Comments with request IDs to prevent duplicate retries, plus owner/post-owner removal.
- Private saved-post collections, with immediate access checks after privacy changes and blocking.
- Public follows, private follow requests and approval/removal.
- Discovery and profiles, activity, text/image/video messaging with acceptance before media and retry-safe sends.
- Blocking, reporting, account deletion and saved-data cleanup.
- Video pause on navigation/background, video failure retry, avatar failure fallback.

## Verification

- TypeScript and Expo lint: pass.
- Local automated suite: 23 passing tests, including administrator-assignment admission checks and audit deduplication.
- Expo Doctor: 20/20 checks pass.
- Admin TypeScript: pass.
- Live Clerk/Convex checks: 22 passing checks using two explicitly approved labeled test accounts, covering admission, post publishing, Explore, private visibility, likes/counts/likers, saved-post privacy, comments, editing, private follow acceptance, message acceptance/delivery/retries, authenticated range requests, anonymous denial, block/unblock revocation and post deletion.
- Additional live media checks: video upload/duration validation, accepted video message delivery, authenticated byte-range delivery and access revocation after unsend all pass.
- The two test accounts and test conversation remain labeled for device verification. Test posts were soft-deleted. Private account references are ignored by Git.

## Install and release limits

The EAS APK is signed with the project's cloud-managed key. The old local preview has a different signing key: uninstall that local preview once before installing this build. Cloud profiles/posts remain stored in Convex. Future builds using the EAS key can update this beta normally.

This is an invite-only development beta, as selected by the owner. Clerk/Convex development instances remain in use. This release does not add Stories, live streams, calls, paid features or a recommendation algorithm. A public production release still needs production identity/provider configuration, production backend setup, moderation operations and acceptance testing on the target device range. Server-side media checks do not by themselves prove video playback on every Android device.

The owner-selected verified app member was assigned beta administrator access through an internal-only mutation with an audit record. The explicitly approved local admin dashboard is configured with the current server key in ignored admin/.env.local, runs only at http://127.0.0.1:3001, and redirects signed-out visitors to /sign-in (HTTP 307).
