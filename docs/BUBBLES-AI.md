# Bubbles AI: reusable voice messenger

Bubbles AI is QuantaPhi's Oracle-powered messenger at https://quantaphi.org/bubbles.html, with a home-page card beside Media Star. Users can make independent floating assistants for pages they control.

## Put a Bubbles assistant on your page

On the QuantaPhi Bubbles card, choose a role, name, and optional public instructions. Press **Create embed code** to copy a complete script tag into your own HTML. The generated code loads a glass-like, audio-reactive floating bubble from the canonical .org domain and opens a sandboxed transcript/programming drawer when requested. A user gesture grants microphone permission once; while the page is active, saying “Bubbles” addresses the assistant without pressing Talk for every turn.

Example (assign a distinct ID to every bubble):

    <script async src="https://quantaphi.org/bubbles-embed.js" data-bubble-id="music-helper" data-bubble-role="singer" data-bubble-name="Song Helper" data-bubble-instructions="Write original song verses."></script>

Available roles: assistant, singer/songwriter, supportive listener (not a licensed therapist), specialist, and GitHub helper.

The embed's role, name and instructions appear in its HTML and URL. Do not put passwords, account tokens, or private notes into the public instructions. Notes and settings are per-bubble and local to that browser, and may not persist where third-party storage is restricted. Important notes should also be saved by their owner.

## Connections and authorization boundaries

**Live:** Oracle Cloudflare Workers AI chat at /v1/chat, optional user-initiated Web Speech Recognition and speech synthesis, and local notes. Verified platform-owner sessions on the QuantaPhi home page may explicitly submit one Robot Brain ticket; a saved ticket is not a GitHub commit.

**Not connected:** visitors' ChatGPT or Claude subscriptions and their GitHub repository-write access. Opening a sign-in website cannot automatically connect these accounts.

OpenAI's Sign in with ChatGPT website integration requires registered/authorized partner OAuth client metadata, an exact callback, PKCE and OIDC verification, and separate consent for any plan usage. Plan tokens must remain under the user-controlled runtime according to the provider terms.

Anthropic third-party app requests require approved Claude API authentication, not copying Claude browser cookies. GitHub visitor write access requires that visitor's approved GitHub App installation or suitable authorized OAuth scope and verifiable API result; never share the platform owner's credentials.

Provider secrets must never appear in public page HTML, URLs, notes, or embed snippets.

## Verified embed message model

The embed iframe sends only open/closed resize events with type quantaphi:bubbles:size and small finite drag deltas with type quantaphi:bubbles:move. The host loader requires the exact https://quantaphi.org origin and the specific iframe's window as event source. It receives no note text, AI conversation data, passwords or account tokens. Embedded widgets do not read the platform-owner work token.

## Observer checklist

Check that bubbles.html and bubbles-embed.js load with appropriate HTML and JS content, and the literal glass bubble moves on Android without covering core navigation. Test voice permission, wake phrase, consecutive follow-ups, background pause, mute command, microphone glow, note storage and keyboard fallback. Verify that unrelated message senders and origins cannot resize an embed, that different bubble IDs have separate storage, and that server-confirmed Robot Brain tickets are not called finished GitHub edits. No automatic StarCoin minting is wired to idle chat.

## Embedded visitor controls and private memory

Inside the floating chat, open **Program this bubble** to customize its role and name. A saved visitor choice takes priority over the site's public default on reload. This cannot change server-side model entitlements or GitHub permissions.

AI replies offer **Save note** (a deliberate browser-local note), **Make work draft** (fills the reviewable Robot Brain field without sending anything), and **Read aloud** (an explicit playback button). The owner must separately approve any available Robot Brain submission. Third-party embeds have no owner submit control.

Recent conversation history is **off by default**; enabling **Keep recent chat on this device** saves only the last 12 messages to local browser storage under the bubble ID. Turning it off deletes that local chat copy. **Clear chat** removes the current conversation while preserving separately saved private notes. The AI receives only the conversation context needed for the current response, not the private notes unless the user explicitly pastes them.

## Voice-first Bubbles — October 11, 2026

The floating orb is the primary interface. On a compatible browser, touch the
orb to grant microphone permission, then say **“Bubbles, ...”**. Speech recognition
continues while the page is visible. Non-addressed transcripts are dropped
unless Bubbles is within a short 30-second follow-up conversation window.
**“Bubbles go quiet”** releases browser audio resources. Closing the transcript
drawer does **not** stop the authorized voice session. The orb's glow changes
with measured microphone amplitude, and replies prefer an installed
British-English voice. The existing Oracle Cloudflare chat route is reused.

This uses Web Speech API support provided by the browser; speech recognition
may use a remote speech provider. No microphone permission is requested
automatically when a webpage loads. Background capture is stopped when the
page becomes hidden; browsers cannot offer an overlay above unrelated apps.

For a real cross-app overlay, the **native Android Bubbles companion project**
lives in [android/bubbles-overlay/](../android/bubbles-overlay/README.md).
Its Android foreground service requires explicit microphone, overlay and
notification permissions, remains visibly indicated while active, has an
ongoing stop notification, and calls the existing Oracle chat endpoint.
This native project is an initial test build, not a completed production app
or a replica of a proprietary GPT model. Provider access and tools require
proper credentials and separately authorized adapters.

## Owner-only spoken jobs

Only the verified platform owner may create Robot Brain jobs. Public Bubbles embeds cannot use the owner's session. Spoken jobs receive server-confirmed ticket receipts; a queued job is not a completed repair.
