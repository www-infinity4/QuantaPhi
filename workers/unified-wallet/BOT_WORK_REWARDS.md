Bot work credits use policy bot-work-v1: one Quant for a recorded tested repair,
or one StarCoin when the verified commit adds an index.html of at least twenty
lines. These are internal platform credits; this policy assigns no dollar value.

The owner connects an authenticated device wallet through the owner-gated Robot
Brain card. Only the account ID is retained. The device token is used in memory
to verify identity and is not stored in the bot system. Changing the recipient
after connection is rejected.

The brain reads authenticated job Quant records and immutable GitHub commits.
Blocked work and fixture images do not earn credits. A repository and commit
hash identify a payout; duplicate jobs and repeated settlement cannot credit
that same commit twice. The wallet endpoint requires a shared Worker secret.

Quant credits enter quant_ledger_entries, unified_token_records and wallet
history. StarCoin credits update the existing StarQuest account and its ledger;
the corresponding work data is also cataloged in unified_token_records. No
existing balance is replaced. D1 transaction tests exercise repeated credits.

Prior pending work is settled in bounded batches after wallet connection.
Future runner results trigger settlement, with the durable alarm retrying unpaid
records. Live wallet connection and a paid ledger receipt are required before
claiming a real deposit. Source-verified repairs can earn while their separate
deployment/browser verification remains pending; the receipt retains that state.


## Automatic owner connection
The owner-authenticated Robot Brain page now connects the existing device wallet automatically. No separate Connect button is required. If the wallet identity is not ready, the page retries while visible. Pending work remains retained. The Retry button is only a recovery control. A server-side authenticated wallet handshake supplies the account ID; usernames are never guessed as payout destinations.
