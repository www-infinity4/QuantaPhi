# Facebook + Instagram Quick Cards — developer integration

These independent Infinity Cards use the existing Bubbles encrypted per-wallet OAuth connector. Supported scope is Facebook Pages and Facebook-Page-linked Instagram Business/Creator accounts, not personal Facebook feeds or ordinary Instagram consumer accounts. They render **only** Meta Graph API posts with attributed media. There is no scraped website session or fake feed.

## Configure before enabling

1. Register a Meta app at https://developers.facebook.com/apps/ and configure Facebook Login with valid OAuth redirect URI `https://quantaphi.org/api/bubbles/connections/meta/callback`. Authorize the app domain and privacy/data-deletion endpoints as required by Meta.
2. Add the applicable use cases and request/complete App Review and advanced access for `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`. Instagram account must be professional and linked to a Facebook Page the consenting user manages. Test accounts/roles and production access differ.
3. Add Worker secrets `META_CLIENT_ID` and `META_CLIENT_SECRET` to the existing `bubbles-connections` Worker (not to public pages or Git). Preserve `CONNECTION_KEYRING`, Durable Objects, and current OAuth configuration. Register app test users before launch. Real Facebook Login may require Business verification.
4. Deploy the updated Bubbles Connections Worker and website together, test official Facebook login, callback replay denial, wallet isolation, private Page token stripping, Page ownership verification, post reads, opted-in publishing, and disconnect. Do not activate public write interactions before permissions are approved. Tests below are mock API tests, not production Meta authorization proof.
5. The cards use original QuantaPhi controls and authenticated API data. User approval is requested per publication, and captions/photos are never sent without a manual Publish action. Instagram publishes a JPEG/PNG photo only when hosted publicly under quantaphi.org; videos, reels, Stories, private feed reads, messaging, arbitrary following and groups/events are **not implemented**.

Security: Never store Meta user passwords or cookies. Never place access tokens in frontend JS, browser logs, URLs, or public content. Preserve connection revocation and permission audits. Page access tokens are processed only in Worker memory and never returned to browsers.

Local tests: `node --test test/meta-social.test.mjs` and full repository test suite before merge/deploy. Production status needs live API readback; a PR alone is not deployment.
