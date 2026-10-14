# Bubbles Android — Sign in with ChatGPT

The native open-source Bubbles companion supports direct, per-device Sign in
with ChatGPT, separate from QuantaPhi's hosted website and its private owner
Robot Brain. Users explicitly tap **Continue with ChatGPT**, authorize the
permissions in their system browser, and return to the Android app. No API key
or client secret is needed for the OSS dynamic registration flow.

## How it works

- Fresh OAuth state, OIDC nonce, and PKCE S256; a local socket on 127.0.0.1
  listens only for `/auth/callback`. The callback is state-checked, and a
  returning registration cannot be swapped to a different client.
- Dynamic first-time `client_id=dynamic_agent_client`; the issued client ID
  is saved after token exchange. The host has a stable `urn:uuid:` identifier.
- Fetch OpenAI discovery/JWKS over HTTPS; verify ID-token RS256 signature,
  issuer, nonce, audience, expiration, and subject. Reject account-subject
  changes without signing out.
- Access and rotating refresh tokens, account metadata, and issued client ID
  are stored as one AES-GCM encrypted credential record protected by Android
  Keystore. Tokens never go to any QuantaPhi Worker, robot, embed, or analytics.
- Plan usage is enabled only when the token response grants
  `chatgpt.tokens.use.direct` and `resource.invoke`. Identity-only sign-in
  does not enable ChatGPT inference.
- Pick an available `visibility: list` model from `GET /v1/models`, then
  send `store:false`, `stream:true` to `POST /v1/responses` directly from
  Android. Do not treat an interrupted or failed stream as a reply. Tokens are
  refreshed under a lock before expiry.
- **Disconnect ChatGPT** clears the local account. A failed remote revocation
  is labeled; users can separately disconnect in ChatGPT settings.

Voice still uses bundled Vosk speech recognition and Android TTS, not
ChatGPT Live voice. This gives Bubbles ChatGPT plan **text inference** only.
ChatGPT sign-in does not transfer ChatGPT memory, conversation history, tools,
or owner Robot Brain access.

## Test

Install the debug APK from the GitHub Actions `Bubbles Android overlay APK`
artifact. Press **Continue with ChatGPT**. Approve sign-in and optional plan
permission; the native status should show the account and chosen model.
Speak a short question after activating Bubbles. Verify that no OAuth tokens
are present in browser URLs, app diagnostics, Cloudflare logs, QuantaPhi
requests, or repository files. Test permission denial, timeout, wrong callback
state, account switch, reconnect, token refresh, revoked permission, interrupted
stream, and sign-out on an actual Android device.

This feature **does not** enable ChatGPT plan use for website visitors; the
hosted commercial Bubbles embed needs separate OpenAI partner authorization.
It also does not grant payments, shopping, calendars, or automated repairs.
