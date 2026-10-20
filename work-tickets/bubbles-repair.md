# Bubbles Repair Work Ticket

**Owner Request Summary**
- Add **speaker enrollment** UI so a user can register their voice profile before any transcription is processed.
- Implement **audio speaker verification** that checks the incoming audio against the enrolled profile; reject mismatched voices.
- **Reject** transcriptions from Twitter/TV sources unless the owner explicitly enables a `mediaDictationEnabled` flag.
- Preserve **continuous listening**, shared chat/history, queued consecutive turns, and the full **record‑start/stop/save** lifecycle.
- Ensure the **Preview5 signing identity** remains unchanged throughout the repair.
- Provide a **regression test suite** that validates the new gating logic and the unchanged behavior of existing Bubbles features.
- Build a **signed APK** that includes commit, test, and build evidence; the APK must be verifiable with the existing signing key.

**Implementation Checklist**
1. UI components for enrollment (microphone capture, profile name, visual feedback).
2. Backend module `bubbles/speaker-verifier.js` exposing `enroll(profileId, audioBlob)` and `verify(profileId, audioBlob)`.
3. Extend `bubbles-voice-gate.js` to:
   - Call `verify` before passing transcripts to the chat model.
   - Block Twitter/TV utterances unless `mediaDictationEnabled` is true.
4. Add a persistent store (e.g., IndexedDB) for speaker profiles; no new external credentials are required.
5. Update the job‑runner flow to announce **"UI job started"** once the runner claims a lease and **"UI job finished"** after successful verification and deployment.
6. Write focused tests in `test/bubbles-voice-gate.test.cjs` covering enrollment, verification success/failure, and media‑source gating.
7. Document the regression checklist and APK signing steps in `docs/bubbles-regression.md`.

**Verification Steps**
- Run the new test suite (`npm test`). All existing tests must still pass.
- Deploy to a staging device and confirm the enrollment UI works, speaker verification blocks mismatched audio, and Twitter/TV voices are rejected unless enabled.
- Build the signed APK (`./gradlew assembleRelease`) and verify the signature matches the existing `Preview5` key.

**Deliverables**
- Updated source files under `bubbles/` and `workers/` as described.
- `work-tickets/bubbles-repair.md` (this document).
- Test suite `test/bubbles-voice-gate.test.cjs`.
- Regression checklist `docs/bubbles-regression.md`.
- Signed APK artifact attached to the PR.
