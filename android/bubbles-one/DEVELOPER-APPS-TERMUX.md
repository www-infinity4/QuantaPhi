# Bubbles One: Apps, Termux and language skills

## Native integration

The floating chat supports natural-language app discovery, opening installed Termux, downloading an explicit HTTPS file to Android Downloads/Bubbles, and requesting the Android file picker for a local file. Play Store discovery **does not** give Bubbles an app's binaries, installation privileges, private data, or code. Android must confirm app installation separately. The imported media/file bytes stay in Bubbles private storage; never send them to the AI unless separately authorized.

Termux is another installed Android app. Its documented `com.termux.RUN_COMMAND` interface supports remote command execution and a completion callback via `PendingIntent` (Termux 0.109+). Bubbles requests `com.termux.permission.RUN_COMMAND` in the manifest, and the owner must grant it under Android's additional permissions. Termux must independently have `allow-external-apps=true` in its own `~/.termux/termux.properties`. Bubbles cannot silently edit that file or grant permissions. Source: https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent

### Conversational phrases

- "Bubbles, open Termux" launches installed Termux, or reports absent.
- "Find [app name] on Google Play" opens the store search, not an install.
- "Import a file" opens Android document chooser; the selected file is copied to a private inbox and gets a chat receipt.
- "Download https://example.org/guide.pdf" asks for a confirmation and queues an Android DownloadManager job into Downloads/Bubbles. It does **not** install an APK.
- "Bubbles, run python: print(2 + 2)" opens a code review/approval prompt before dispatch. Use the equivalent for JavaScript, Bash, Ruby, PHP, Perl or Lua. A runner exists only if installed inside Termux. **Request sent** and **process completed** are different phases; Bubbles accepts the actual return bundle with stdout/stderr, process exit code and Termux error code. Output stays local and is not forwarded to a cloud model.
- "How do I build a Python script for..." uses Bubbles AI to explain or draft source; it does not execute imagined commands.

### Mini reference: development languages

| Language | Termux executable | Example |
|---|---|---|
| Python | python | `print(sum([1, 2, 3]))` |
| JavaScript | node | `console.log([1,2,3].reduce((a,b)=>a+b,0))` |
| Bash | bash | `printf 'hello\\n'` |
| Ruby | ruby | `puts 2 + 2` |
| PHP | php | `echo 2 + 2;` |
| Perl | perl | `print 2+2;` |
| Lua | lua | `print(2+2)` |

The term "all languages" cannot mean every language works before its compiler/interpreter is present. Never install packages automatically from generated model instructions.

### GitHub, Cloudflare, and tokens

Use an authenticated **server-side** credential vault or GitHub App installation for repository writes, Cloudflare Worker deployments, and scoped access. Do **not** compile PATs, API tokens, bearer headers, user sessions, GitHub or Cloudflare secrets into Android source, code snippets, console output or prompts. A Termux script can work on local code without possessing a cloud API token. A chat reply or a local Termux execution does not itself prove a GitHub commit, Cloudflare deployment, source access, or five-day owner grant. Each action requires a real authenticated operation and actual result receipt.

This first integration adds local execution and file transfer, not persistent authorized Cloudflare/GitHub writing. That is a separate owner-authenticated bridge.

### Phone acceptance

With Bubbles One and supported Termux installed on Android 12: grant Android's extra Termux permission, enable Termux external apps, run Python print, read callback output in Bubbles, deny one execution, test missing Python and absent Termux, open store search, import file from Android picker, queue an HTTPS download, ensure a queued transfer is not falsely called complete, and confirm the old chat/overlay continues functioning. No successful compile can substitute for this physical-phone check.
