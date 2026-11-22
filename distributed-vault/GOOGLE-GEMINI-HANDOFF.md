# Issue #2110 — Google/Gemini user-controlled backup and handoff

## Supported workflow, not an automatic Gemini database

Google's Gemini Apps currently allow a **person to import chat-history ZIPs** from supported AI platforms and to **manually attach documents**, including text files. That does **not** imply QuantaPhi has a documented third-party API to write its users' search/chat history into their Gemini conversation history.

Google's Drive API Terms of Service restrict using Drive to back up content from other applications **without Google's express prior written consent**. They also restrict Drive storage sharding to evade quotas. This project therefore **does not** create a Drive API uploader, use Gemini as a database, forge a native ChatGPT/Gemini ZIP, silently collect outside-app Google searches, or make claims about unlimited free storage.

Source references (verified November 22, 2026):
- https://support.google.com/gemini/answer/16868299
- https://support.google.com/gemini/answer/14903178
- https://developers.google.com/workspace/drive/api/terms

## What the new Bubbles controls do

In Bubbles **Privacy**, a user with an existing verified Bubbles wallet session and enabled chat memory sees:

- **Download encrypted account backup**: Generates JSON encrypted locally in the browser with AES-256-GCM, a fresh 16-byte salt and 12-byte IV, PBKDF2-SHA256 at 250,000 iterations. The user chooses a passphrase of at least 16 characters. The passphrase and unencrypted archive are never sent to Google.
- **Download Gemini handoff text**: Prepares a plaintext `.txt` for the user to **inspect** and optionally attach inside their own Gemini account. It is **not** imported into Gemini conversation history automatically, nor a Gemini sync.
- **Include QuantaPhi searches** (on by default): Reads the current verified wallet's search journal, **only after validating the same bearer credential** with the Bubbles memory profile. The remote endpoint currently limits responses to **1,000 most recent searches**. If that limit is reached, or the endpoint is unavailable, the export fails closed instead of claiming that every search was included. The user can uncheck searches to download chats only.
- **Open Gemini for manual file attachment**: A normal link to the user's own Gemini interface. QuantaPhi never sends a file, token, or chat to Gemini by itself.

No passive app scanning, personal browser history, unrelated Google searches, wallet balances, token values, passwords, other people's chats, voice clips, or microphone data are included. The archived Bubbles turns are those currently **indexed under the verified wallet profile in local BubblesMemory**, not guaranteed to be the user's entire historical Bubbles or ChatGPT archive. Private notes are excluded. The user has to press a button and explicitly confirm. Existing cloud D1, wallet, identity, DNS and provider bindings remain unchanged.

## Using the files

1. While signed in to the correct Bubbles wallet, open **Privacy**. Verify that the existing wallet-scoped conversation memory connection is active; if it's offline, the export correctly refuses rather than switching to an anonymous account.
2. To create a private encrypted backup, enter a unique passphrase and click **Download encrypted account backup**. Save the file safely on your device. Optionally **manually** upload that encrypted file to a storage location you personally choose, including your own Google Drive through its normal user interface; this project does not automate Drive API storage. The encryption password must remain separate; without it, restoration isn't possible.
3. For a Gemini-readable **plaintext** copy, choose **Download Gemini handoff text**. Review the text before sharing, since it can contain personal conversations or search terms. Open Gemini, attach the `.txt` file to an ordinary chat, and ask Gemini to summarize or work with it. This does **not** create an automatic personal Gemini-history import. The native Gemini chat-history importer supports ZIPs from supported AI platforms; this project's TXT is not mislabeled as that format.
4. Gemini's privacy and activity terms apply once the user sends content to Gemini. Do not upload raw private backups as plain text without deliberate user consent. A free plan may impose usage/storage limits; none is promised to be unlimited.

## Security and completeness limits

- The BubblesMemory read requires `cloudConnected` and a 64-hex-character wallet profile. Its export refuses records from another profile and does not export internal fields such as sync metadata.
- Search journal requests first recheck that **the exact same bearer token** resolves to the same Bubbles profile, then read the Quanta journal using that token, not an unrelated cached account. Any unavailable identity or inconsistent token stops the combined export.
- All deduplicated events are bounded; oversized, corrupted or cross-account records fail closed. Exported copies contain chat/search text only and a double-hashed pseudonymous account binding.
- The encrypted archive is a restorable, integrity-authenticated artifact in source code (`openUserArchive`). A future user-facing restore wizard must require a matching profile and explicit confirmation before saving events or changing any Bubbles memory.
- This is a manual handoff of the available **current verified records**, not automatic Google or Gemini backup, nor comprehensive cross-device history. To export all searches beyond the existing `LIMIT 1000`, add a secure owner-scoped paginated journal export with replay/coverage checks; do not loosen account partitioning or exhaust D1 quota.


## Native Android free Google backup — separate future implementation

Android's **Auto Backup for Apps** is a real Google-managed free backup path of
up to **25 MB per app user**. It uses the Android system backup transport under
the user's Google account; it is **not** the Google Drive developer API and
not Gemini history import. Android users choose device backup settings; the
system controls backup timing and may skip a backup. Source:
https://developer.android.com/identity/data/autobackup

The current native Bubbles manifest at
`android/bubbles-overlay/app/src/main/AndroidManifest.xml` explicitly declares
`android:allowBackup="false"`. **Do not blindly enable it**: the app includes
WebView, credentials, microphone and recording state. A safe native feature
requires an APK change that first stores *only the user's explicitly selected
encrypted export* in a dedicated app-private backup directory, plus carefully
scoped Android 12+ `dataExtractionRules` and older `fullBackupContent`
exclusions. It must exclude credentials, provider tokens, caches, ephemeral
fragments, Android Keystore references and unrelated WebView data. Only after
signed APK build, permission/privacy review and a real Android backup/restore
test may the application claim Google Auto Backup for this archive. No such
change is deployed or enabled by this PR.

## Verification

```bash
node --test test/distributed-vault-google-handoff.test.mjs test/bubbles-google-wallet-export.test.mjs test/bubbles-google-handoff-ui.test.mjs
```

The existing distributed-vault CI now also runs these tests. Passing Node/CI tests does not establish real wallet sign-in, Google import acceptance, physical Android file download, provider policy approval for automatic backup, or a new server deployment. The owner-controlled phone backup and D1 migration require separate acceptance.
