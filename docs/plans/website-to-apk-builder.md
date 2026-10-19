# Website-to-APK builder: research and implementation plan

Status: researched plan, not a finished builder or verified APK download.
Owner outcome: an Oracle-style page with a webpage address box. Enter starts one
build request automatically. Bubbles coordinates the bot work and returns a real
APK download that can be linked from the original website.

## Source-backed implementation choices

- Android WebView can display website content inside an Android app. Reuse the
  existing `android/bubbles-overlay/` Android build toolchain, but create a separate
  minimal wrapper template without Bubbles overlay, microphone, recorder, or
  JavaScript-to-native control privileges.
  https://developer.android.com/develop/ui/views/layout/webapps/webview
- Bubblewrap is an alternative for owned Progressive Web Apps using Trusted Web
  Activities. It needs a web manifest and a verified website/application
  relationship through Digital Asset Links. A random URL alone does not establish
  that relationship. Do not silently label an ordinary WebView build a TWA.
  https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities
  https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli
- Android compilation and packaging run remotely using the existing authorized
  repository runner. A website textbox cannot compile an APK by itself.
  https://developer.android.com/build/building-cmdline
- Verify APK signatures with Android SDK `apksigner verify`, compute SHA-256,
  inspect the manifest, and retain the real workflow run, source commit, byte
  length, package name and signing-certificate fingerprint with the artifact.
  https://developer.android.com/tools/apksigner

## Work and dependencies

1. Red and Yellow inspect the existing repository, these Android documents,
   supported owner website origins, website metadata and current build scripts.
   Save source URLs, commit pins and extracted requirements.
2. Blue and Purple save the wrapper choice, inputs, file list, build contract,
   signing-key ownership, artifact retention and acceptance plan. Use reversible
   existing project defaults; ask the owner only for a genuinely missing
   authorization or product choice.
3. Green builds the Oracle URL form and build-status view. In parallel, a separate
   source branch can prepare the minimal Android wrapper and remote workflow.
   These tasks can share the saved contract; repository writes and merge order
   must remain protected by their existing leases and reviews.
4. Pink tests input validation, duplicate submission, failed/slow build recovery,
   navigation, signing and artifact access. Red/Yellow source research is context,
   not permission to execute code obtained from a webpage.
5. Black verifies the actual packaged file and download. Bubbles reports finished
   only after the file is built, its signature/hash are verified, and the download
   works. Attaching a link to an owned source page is a separate reviewed edit.

## Build request and delivery contract

Input: verified owner session, HTTPS webpage URL, stable request ID, application
name and target repository. Derive routine package/configuration defaults from
verified metadata and the saved plan. Keep production signing material in the
existing protected backend/runner store; never put it in generated web or APK
source. Development builds must be labeled as such.

The backend records one parent request with dependent jobs and immediately asks
the runner to start. A timeout is unconfirmed, not permission to submit a second
build. Poll the same parent request and reconcile the original workflow run.
Runner concurrency may delay the start; do not display a fake percentage.

Output is a verified artifact record and a working download URL. Do not display
an enabled Download APK button for a queued build, generated source, an HTML
preview, or a missing/expired Actions artifact. Provide a clear rebuilding or
retention message when a download is no longer available.

Validate HTTPS origins and any server-side metadata fetch against the approved
owner website catalog, including redirect targets. Do not fetch local/private
network addresses. Keep external navigation outside the privileged wrapper; do
not inject credentials, transfer browser cookies, or add a native bridge to
untrusted website content.

## Acceptance gates

- Enter submits once, creates ready jobs and requests execution without Run All.
- Duplicate delivery reuses the parent request and does not create another build.
- Planned, waiting, running, failed, source committed and download verified states
  remain distinct and readable.
- UI generation and template generation have independent tests against the same
  saved input/output contract; compile only after both are reviewed.
- Remote compilation, signature verification, file hash and download checks have
  actual receipts. A physical Android install is a separate final device test.
