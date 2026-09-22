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
