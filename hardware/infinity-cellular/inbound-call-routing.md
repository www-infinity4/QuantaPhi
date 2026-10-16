# Infinity Phone: receiving real phone calls safely

**Status:** design and provider-integration contract only; no live PSTN webhook, carrier transfer, Bubbles audio bridge, SIM provisioning or wallet mapping has been activated by this document.

## Main architecture

Existing personal number on current carrier -> **opt-in call forwarding or approved port** -> verified provider-controlled inbound destination -> signed provider webhook -> Infinity Switchboard -> provisioned Bubbles real-time media bridge -> authenticated Bubbles session.

A number provided in chat does not establish control of that number, subscribe it to a carrier platform, or authorize automatic forwarding. **Never put the user's literal telephone number in a public GitHub repository, URL path, plain log, public card, wallet key or D1 seed.** Activation requires the owner to complete carrier/provider authorization. Porting can interrupt existing phone service and should not be initiated without separate informed user approval. Forwarding can retain normal service but may need a separate provider number and can incur carrier charges.

## Carrier registration and private verified binding

A protected tenant account may hold a user-verified telephone number. Use E.164 validation. Record provider account and verified destination separately from the user's currently assigned telephone number. Never assume both are the same when a call is forwarded. Do **not** disclose phone or SIP identifiers via the public phone-number web routes.

Suggested *private* database metadata (not subscriber authentication secrets):

```sql
CREATE TABLE IF NOT EXISTS carrier_voice_bindings (
  binding_id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  number_digest TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('twilio','telnyx')),
  provider_destination_id TEXT NOT NULL,
  proof_method TEXT NOT NULL CHECK (proof_method IN ('provider_port','authorized_forward','provider_verification')),
  verified_at TEXT,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  consent_at TEXT,
  expires_at TEXT,
  updated_at TEXT NOT NULL
);
```

`number_digest` must be computed server-side with a secret pepper, using HMAC-SHA-256 of the normalized E.164 number; the pepper belongs in secrets management, not D1 or client JS. `owner_account_id` refers to a separately authenticated owner account. Public D1 reads, row export from an anonymous endpoint, and lookups by unverified incoming Caller ID are prohibited. Number assignment/recycling requires periodic re-verification and revocation controls.

## Call routing acceptance contract

1. Default configuration is **DISABLED**; expose no functioning PSTN endpoint until there is a real provider and private webhook signing credentials.
2. Incoming POST must be verified with the provider's **official signature validation library**, the configured exact HTTPS callback URL and the *complete raw request* fields; reject missing signatures, wrong account, mismatched destination, invalid callback IDs, oversized bodies, and replays. Treat all caller-supplied data, including Caller ID, as untrusted.
3. Match the **provider-verified called destination** to a previously enabled number-binding receipt, not `From` or public account text. Store receipt IDs idempotently with limited TTL, no raw audio, SMS OTPs or personal number logs by default.
4. When the real-time voice bridge is healthy, issue provider-approved call-control instructions that explicitly connect the media stream to Bubbles. The bridge must independently authenticate the user's account before providing personal memory, wallet, robot, email or repository powers.
5. If audio transport is absent, return a transparent unavailable response. A webhook acknowledgement, locally generated ringtone or saved web-page URL is **not** evidence that the phone rang or Bubbles answered.
6. Never treat incoming Caller ID as a master password, proof of possession of the SIM, or wallet authorization. Incoming calls may use spoofed/withheld/forwarded Caller IDs.
7. Never ingest or forward unrelated SMS verification codes, passwords or other people's personal messages to AI without authenticated account authorization and explicit consent.
8. Keep 911 and other emergency call handling with a functioning existing carrier until proper telecom compliance and emergency-support infrastructure is in place.

## What remains to enable live voice

- User must decide **keep current carrier + authorized forwarding** or **port** (do not do either automatically).
- Provision supported voice provider account, an assigned inbound destination and verified number-control receipt.
- Configure Cloudflare secrets for inbound verification, durable call-ID replay defense, and an authenticated Bubbles real-time audio service. Cloudflare Workers do not themselves provide a PSTN gateway.
- Test inbound call start, voice streaming, explicit account login/challenge, hangup, replay rejection, carrier failure, emergency exclusions and recovery.
- Only afterward turn on any "Bubbles answers conventional calls" indicator on QuantaPhi.

Official provider documents:
- Twilio webhook verification: https://www.twilio.com/docs/usage/webhooks/webhooks-security
- Twilio porting vs hosting: https://www.twilio.com/docs/numbers-and-senders/port-host
- Twilio voice webhook request/response: https://www.twilio.com/docs/usage/webhooks/webhooks-faq

**Privacy boundary:** QuantaPhi's web owner key, telecom SIM credentials, customer caller number, and wallet authentication are four distinct systems. No caller-number matching must ever unlock a wallet or Robot Brain.
