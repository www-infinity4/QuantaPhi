# Bubbles AI collaboration — Gemini first, evidence before execution

Owner goal: make Bubbles ask Gemini first, use Claude/ChatGPT for independent review, use GitHub Copilot/Robot Brain for approved engineering, and reuse successful answers rather than repeated general searching. One Bubbles interface governs the work; source quick cards must also be usable by regular QuantaPhi visitors.

## Implemented in this patch
- Official Gemini / Claude / GitHub Copilot quick cards on QuantaPhi, with original host identity and responsive in-card question forms. Public visitor cards open the real provider; account authentication is not implied by a website card.
- Main Bubbles chat accepts **Ask Gemini: question**, **Ask Gemini then Claude: question**, **Ask Claude: question**. Card buttons send the same question through a local event handled by Bubbles when its verified owner session is active.
- `infinity-rogers /v1/ai/collaborate` checks the owner Bearer with the existing BRAIN service before touching server-only Gemini and Anthropic API keys. It sends Gemini first, and then Claude only when explicitly asked for review and Gemini returned a response. It never sends wallet tokens, whole chat archives or Cloudflare keys to an AI provider.
- Results carry provider names, models, error status and a read-only receipt, never a claim of a GitHub commit, completed bot job, test or deployment. They enter existing Bubbles owner-scoped conversational memory through `persistChat`, only when chat retention is enabled.
- Official Cloud Chrome links to Gemini, Claude and Copilot let the user sign in interactively. A browser website session does not give Robot Brain the site's private API.
- GitHub Copilot is accessed through GitHub's supported agent/issue workflow and requires the repository/plan to permit it; this release does not silently assign issues or claim a Copilot chat API. The `Lee_key` secret exists on bubbles-tools, but no provider identity or supported contract has been verified, so it is not used.

## Integration states
1. **Provider available**: provider endpoint and secret binding are present.
2. **Owner authorized**: BRAIN owner session confirms the request.
3. **Provider response**: live Gemini/Claude API returned an answer; independent model output is untrusted planning content.
4. **Robot Brain job**: separately authorized, sandboxed job submission with GitHub/Cloudflare receipts; a plan is never authority by itself.
5. **Verified change**: CI + actual deployment readback; don't infer from dispatch.

## Next phase (not claimed in this PR)
- Attach the Gemini-first review to engineering intent classification with a stored plan artifact and opt-in model-budget policy, preserving manual fallback when model limits are hit.
- Build a typed Copilot issue-assignment adapter with GitHub App repository authorization, PR review, CI gates and a receipt.
- Confirm what “Lee” refers to before wiring the existing opaque secret.
- Verify live Gemini and Claude API success with an owner-authenticated phone action after staging/deploy.
- Provider advice may guide a draft PR, but no provider may approve its own privileged deployment or use credentials from card HTML.

Privacy: Keep keys in encrypted Cloudflare bindings, not JavaScript. Never make model text executable shell commands. Remember only conversations with user-selected retention; never store silent background observations or credentials.
