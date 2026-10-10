# QuantaPhi

QuantaPhi is Phi search engine experiment **#2**. Grammar Phi is preserved unchanged as Engine #1.

## What changes in Engine #2

Grammar Phi proved the basic search → semantic field → overview path. QuantaPhi keeps the five-color field but adds **live contextual ranking and media extension**. The query is treated as buyer/searcher intent. Retrieved knowledge, images, video, sound and commercial opportunities are candidate matches competing for useful placement.

The colors are semantic positions, not fixed parts of speech: **RED** seed/root field, **BLUE** inner field, **YELLOW** finer semantic object, and **GREEN/PURPLE** interaction/grammar positions. A color does not permanently determine importance.

### Weighting

QuantaPhi does not give a word one permanent score. Candidate evidence is reweighted against the active query. The first implementation combines query-anchor overlap, source/search position, semantic specificity and diversity. The intended progression is:

```
liveWeight(candidate,state) =
  regionPrior
  + semanticFit
  + relationshipFit
  + intentFit
  + evidenceStrength
  + mediaFit
  + sourceTrust
  - conflictPenalty
  - repetitionPenalty
```

Each selected/landed candidate changes the state available to the next selection. Later engines should improve these terms rather than restart the experiment.

## Search & Deploy

A search deploys a small mobile website, not merely a result list:

- a concise knowledge overview;
- semantic knowledge cards;
- image cards;
- video/media extension cards when available;
- generator-extension controls;
- a verified-source opportunity card when retrieval supports one.

Visible cards are capped at **100 words**. Media must be semantically connected to the card. Commercial cards must come from an actual retrieved source; a marketplace claim is not automatically evidence of quality, rarity or value.

## Buyer ↔ seller superposition

“Superposition” is the product metaphor for QuantaPhi's matchmaking layer: the searcher supplies intent while many candidate knowledge/media/product states remain possible. Ranking collapses that candidate set into the most useful cards. This is an information-retrieval architecture, not a claim that the browser is performing physical quantum computation.

## Engine lineage

1. **Grammar Phi** — semantic field + overview experiment. Preserve it.
2. **QuantaPhi** — contextual weights + semantic matchmaking + media/card deployment.
3. Future Phi engines should document only their new weighting/retrieval/generation capability so the lineage compounds instead of repeating itself.

## Moltnook agent iteration and learning card (October 10, 2026)

The QuantaPhi home page embeds a compact, phone-first **Live Agent Iteration Machine** directly below the research overview and above Reads & Realms. Implementation: `quanta-agent-iterations.js`, `quanta-agent-iterations.css`, and `#quantaAgentIterations` in `index.html`.

### Actual execution and evidence
- The card reads live published `activity/iterations.json` and `activity/repair-report.json` from `https://quantaphi.org/moltnook/`; a GitHub Pages host uses the public Moltnook repository JSON fallback.
- Moltnook's GitHub Actions reads prioritized owner jobs, README files, commits, and workflow results, then publishes evidence-backed robot handoffs approximately every ten minutes. The QuantaPhi card rechecks the feed every 45 seconds while visible, without inventing intermediate events or claiming repairs merely because a repository was read.
- Evidence links open the owning GitHub commit, run, or issue. This is a truthful activity reader: a GitHub Actions scan is not proof that a GPT/Claude/Gemini developer agent wrote or deployed application code.
- Additional scoped auto-repair jobs exist in Moltnook. Cross-repository code writers still require per-repository authorization, acceptance tests, independent verification and actual commit receipts.

### How the card learns what a user does
- When the viewer searches with QuantaPhi or activates a Story Writer, Image Builder, Reads & Realms, radio, or wallet control, only **categories** and their counts are saved on that viewer's device in `quantaphi:agent-learning-local:v1`. Raw searches, names, account IDs, keys and conversations are not saved or transmitted by this feature.
- Repeated category sequences (e.g., Story Writer → Image Builder, chemistry research → illustration) produce proposed reusable skills, with the proper color agent and concrete acceptance criteria. The proposal link opens an actual GitHub issue draft for the authorized owner to submit; it is not a completed skill or automatic deployment.
- The card has visible monitoring and deletion controls. `Learn from QuantaPhi activity` can be switched off; `Clear learned activity` deletes the browser's aggregate watcher state.
- Do not insert private ChatGPT/Gemini conversation text, credentials, wallet data, or search histories into public agent logs. Separate connected, authorized sources are needed to read conversations.

See `.github/workflows/moltnook-card.yml` and `test/agent-iteration-card.test.cjs` for source-validation, DOM and safety regression tests.

### Conversation-only robot brain — story-first display

The owner-facing QuantaPhi home page now **keeps Reads & Realms before Moltnook**. Under the story card, `#quantaAgentIterations` presents a compact robot-conversation log. Every ten seconds while the page is visible, the log displays one more **recorded** source-backed event, retaining at most three conversation bubbles on screen. It combines real project commits from Moltnook's `activity/feed.json` and source-linked agent READMEs, CI inspections and repair receipts from `activity/iterations.json` and `activity/repair-report.json`. Old evidence is marked as replay; moving the UI clock never creates a real agent action.

**Default view is only the conversations.** The original jobs, full evidence timeline, tools and device-local learning widgets remain in `#qai-dashboard`, hidden until the visitor opens **View jobs, tools and learning**. Automatic polling continues even when that dashboard is closed. Browser animations are disabled for visitors requesting reduced motion. GitHub metadata remains the source of truth for commits and check results; a recorded comment does not itself certify a deployed wallet fix.

Browser cadence: 10-second event playback, 45-second public-evidence checks. Backend: Moltnook's separately scheduled GitHub Actions source inspections; no claim of ten-second real GitHub writes or access to private conversation content.
