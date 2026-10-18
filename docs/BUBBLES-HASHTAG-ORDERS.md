# Bubbles #bubbles order discovery — source-first implementation

Status: draft feature on a GitHub branch. No claim of deployment, configured X credentials, continuous polling, or discovered live posts.

## Use

Publish a post from the configured owner X account:

    #bubbles Fix Infinity Radio playback on Android and Chrome; report tests and actual release status.

In the QuantaPhi Bubbles conversation, open **Robot Brain notifications** and select **Scan #bubbles on X**. The control requires the existing, verified Robot Brain owner session.

The new server route `POST /work/social/bubbles/scan` requests posts from X's official `GET /2/users/{id}/tweets` API with a server-side bearer token. It validates each post's **numeric author_id**, numeric post ID, literal standalone hashtag, length and X provenance. It checks up to two recent timeline pages and deduplicates across pages. Repeated imports deduplicate through the existing Robot Brain `submission_id` and request fingerprint. It **only creates draft tickets**; no GitHub writes, owner approvals, runner dispatches or wallet changes occur.

## Required configuration

- `X_OWNER_USER_ID`: Numeric X user ID for the owner's account, verified through the official X API. **Do not substitute the handle** `@YahooPingcwlz` as an ID.
- `X_API_BEARER_TOKEN`: Server-side official X API credential with permitted read access to that timeline. Store as a protected Cloudflare Worker secret; never embed in the APK, site JavaScript, chat, GitHub commits, or ticket instructions.
- Existing Cloudflare `WORK_DB` and `WRITER_OWNER_HASH` bindings, Robot Brain authenticated session and route deployment.

Without valid credentials the endpoint returns an explicit unavailable/error status and creates nothing. X API access can involve usage limits or charges. No live access or budget was verified when this source was authored. Test on a separate, authorized X test account before owner rollout. Keep service quotas bounded.

The current integration is on-demand owner-only **X-account** discovery, not continuous social monitoring, full-history collection, global web search, private-message access, or verification of arbitrary websites. Web-wide discovery will require approved search providers and source ownership proof, then explicit owner approval before any command may become runnable. It must not treat a hashtag alone as authorization, nor execute instructions imported from snippets/quoted text.

## Trust and data

- Source text and URLs are untrusted job context. Never interpret discovered text as token grants, wallet permissions, or permission to access someone else's phone.
- For cross-site wallet enrollment, offer a user-chosen, revocable identity, optional verified phone number, and separate, visible grants for any shared address/activity records. A page visit never exposes somebody's SIM phone number, private address book, messages, cross-site activity, or device contents.
- No mechanism here bypasses Android permission controls, VPN protections, or the Infinity Platinum APK security hold.
- An X post/import receipt proves only discovery and draft creation; completion requires separate authenticated commit, test, runner and deployment receipts.

## Validation

Run:

    node --test test/bubbles-social-orders.test.mjs

Review the new GitHub Actions hashtag workflow and existing Bubbles checks. Then confirm protected Cloudflare configuration and the public endpoint's owner-auth responses before considering rollout.
