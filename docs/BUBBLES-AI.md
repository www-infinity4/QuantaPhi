# Bubbles AI: reusable voice messenger

Bubbles AI is QuantaPhi's Oracle-powered messenger at https://quantaphi.org/bubbles.html, with a home-page card beside Media Star. Users can make independent floating assistants for pages they control.

## Put a Bubbles assistant on your page

On the QuantaPhi Bubbles card, choose a role, name, and optional public instructions. Press **Create embed code** to copy a complete script tag into your own HTML. The generated code loads a small floating bubble from the canonical .org domain and expands a sandboxed iframe when clicked.

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

The embed iframe sends only an open/closed resize event with type quantaphi:bubbles:size. The host loader requires the exact https://quantaphi.org origin and the specific iframe's window as event source. It receives no note text, AI conversation data, passwords or account tokens. Embedded widgets do not read the platform-owner work token.

## Observer checklist

Check that bubbles.html and bubbles-embed.js load with appropriate HTML and JS content, and the launcher opens and closes on Android without covering core navigation. Test voice-on/off, note storage and the keyboard fallback. Verify that unrelated message senders and origins cannot resize an embed, that different bubble IDs have separate storage, and that server-confirmed Robot Brain tickets are not called finished GitHub edits. No automatic StarCoin minting is wired to idle chat.
