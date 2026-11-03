# Infinity Stay In & Vote — community ballots, not certified elections

## User contract
- On-site visitors can view verified aggregate community ballot totals.
- A vote requires an independently verified StarQuest account via existing QuantaCloudConnection.authenticatedFetch; the server checks the credential, hashes the account ID using a private HMAC salt, and stores one current vote per member per poll in isolated D1. The voter can change their choice while the poll is open. No wallet mutation or reward per vote.
- **Infinity College** is a separately labeled, owner-reviewed editorial selection. **Bubbles** is a separately labeled, source-cited research assessment. Neither overrides a visitor ballot, declares an official winner, or counts as a U.S. Electoral College vote.
- Only actual election authorities can certify real election results. QuantaPhi cannot appoint public officials or install Bubbles into an office by polling or editorial decisions.
- Never prefill ballots, invent candidates, assign unsupported vote counts, buy ads targeted to politics, or use private user identity/activity for political persuasion. No false reports that an editorial pick is a certified officeholder.

## Source
Worker: `workers/stay-in-vote/worker.mjs`, schema: `workers/stay-in-vote/migrations/0001_votes.sql`; dedicated D1:
`quantaphi-stay-in-vote`, ID `f67e6066-f449-4be0-b544-380d5a584d36`.
Homepage original card: `#stayInVoteCard`, with source image, `stay-in-vote.mjs` and `stay-in-vote.css`. It appears in the existing Public / For You / Following Oracle viewer; personalization is disabled for this civic card.

## Activation gate
1. Run focused node test `node --test test/stay-in-vote.test.mjs` and full site regression checks. Validate mobile display at 320/360/393/720px and keyboard navigation.
2. Apply D1 migration to the *dedicated database only*. The seed is an actual **community feature-priority question**, not a made-up government election or preexisting vote. Review the public text and validate all choices.
3. Deploy the isolated Worker with existing `VOTES_DB` binding. Provision `VOTER_PEPPER` only as a private Worker secret (32+ cryptographically random characters) and never commit/paste it. A secret rotation would change pseudonymous voter keys and requires audited migration or a new poll season.
4. Test two distinct verified StarQuest accounts, repeat/change vote behavior, failed credential, wrong Origin, closed poll, wrong option, D1 readback, aggregate counts, race conditions, and rate limits. Verify public GET `/api/stay-in-vote` plus post back to exactly the same site origin. Do not expose ballot service when these gates fail.
5. Only a properly authorized maintainer can add verified candidate/race questions and source-backed editorial assessments directly to D1 under review. No public vote route accepts write access to polls, candidates, Infinity recommendations, Bubbles recommendations, or official election outcomes.
6. Preserve official government election result sourcing as a future read-only field with direct .gov/state-source citation and a certification status. Never let a QuantaPhi poll or AI editorial update those fields.

## Status
The repository implementation is not equivalent to production deployment or working user ballot receipts. The public card must visibly say voting is unavailable until Worker, secret, and multiuser acceptance are verified. If the API is down, no phantom votes appear.
