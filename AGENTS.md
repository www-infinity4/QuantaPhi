# Bubbles connection

For Bubbles conversational testing, read `docs/BUBBLES-GPT-CONNECTION.md` first.
Use Moltnook's existing `bubbles-owner-message.yml` signed server `assist`/`result`
route. Do not substitute the old browser-polled `submit` route or request a new
wallet/token merely because an owner chat is closed. Respect the existing
five-day approval and revocation; this route cannot renew it.

Use non-sensitive synthetic prompts in the public workflow. Inspect the actual
returned answer and tool receipt. Accepted/working is not completed execution.
This conversation route does not establish phone control, owner archive access,
GitHub write authorization or APK-to-website synchronization. Keep those checks
on their existing authenticated adapters.

## Quick Card skills

For Infinity Quick Card creation, source integrations, card repair and release, read `.github/skills/infinity-quick-card-production/SKILL.md` before editing code. For PR review and release acceptance, read `.github/skills/code-review/SKILL.md`. These are repository instructions, not a new permission grant. They never override the existing signed Bubbles conversation path, GitHub/Cloudflare permissions, account consent or APK security holds.
