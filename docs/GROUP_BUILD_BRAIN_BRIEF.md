# Owner direction: Group Build and card analytics

Kris requested this direction on October 12, 2026 (America/Chicago).

## Product
Group Build is collective authorship rather than ordinary chat. Participants finish a story idea, opt into a public topic room, and submit a line. AI appends a passage blending that contribution with the prior manuscript. Preserve original submissions, revision history and coauthor pen names. Download the manuscript with attribution. Counts represent real opted-in browser sessions, not verified unique people; typing expires after inactivity. Never invent “1000 typing” or “19 scientists.” Bot turns are marked AI and excluded from human coauthors/typing.

The initial implementation is at `group-story.js`, `group-story.css`, `workers/group-stories/worker.mjs`, and `workers/group-stories/schema.sql`. Rooms are topic + mode, not inferred from private searches. Research mode, e.g. helium, produces working drafts with evidence/hypothesis/test distinctions. Do not promise hidden knowledge, proven breakthroughs, peer review, or verified doctor/scientist credentials. Future expert rooms require actual opt-in verification and evidence-source import. Credentials are never guessed from a query.

## Color specialists
Pink Panther investigates scenarios and uncertainties. Blue imports and reconciles supplied context and sources. Red routes the manuscript and next questions. Green engineers scenes and testable proposals. Purple orchestrates; Yellow verifies real interaction evidence; Black seals only confirmed outcomes. These are specialist contributions grounded in the current situation, not fabricated bot conversations or human attendance. Initial warm-up is four bounded specialist turns and stops when another participant session joins.

## Analytics and daily improvement
The public service is `https://quantaphi-public-trends.marvaseater.workers.dev/summary`; `/daily-review` publishes the latest daily aggregate review. Counts are QuantaPhi instrumentation, not a GA4 import. Collect fixed card IDs and actions, never raw private searches. Per-card tracking starts at launch; click does not prove payment, completed share or wallet settlement.

Daily review must use exposure as well as interaction counts. A card with few views is not demonstrated unpopular. At least 20 views are needed before flagging no interactions. Improve unusually compelling, original, coherent stories: concrete mystery, a vivid scene, meaningful stakes, an unexpected but supportable detail, and an ending that earns interest in the next story. Do not substitute misleading clickbait, fabricated historical facts, charges, or guaranteed revenue. Keep revenue/paywall changes out of routine card tuning. A daily review creates a normal owner-partition work ticket for the existing reviewed writer, not an unrestricted direct deployment.

The leaderboard currently sorts live interaction totals, then views. Future page order experiments must be reversible, preserve anchors, keyboard focus, drafts and wallet behavior, and retain diversity instead of hiding low-exposure cards. Compare exposure-adjusted results over sufficient traffic. User-selected room topics only may be used for recommendations.

## Further work the owner requested
1. The initial opt-in topic typing lobby is implemented. Extend topic recommendations across cards, room discovery and recoverable presence. No transmission of raw unsent ideas.
2. Topic discovery and matching for different specific subjects, with explicit participation consent and accurate attendance.
3. Longer books: chapter continuation, durable full history, stable recovery of coauthor credentials and editorial moderation/version rollback.
4. Scientist/doctor groups: optional verified credentials, source ingestion and citation checking; distinguish unverified research from peer-reviewed output.
5. Daily quality improvements and reversible ordering experiments based on live card analytics.
6. Specialist bots must consume the actual situation, produce distinct contributions, and publish receipts for work. No fake crowd activity.

## Acceptance
Test concurrent authors (no lost update), submission retries (no duplicate passage), typing expiry, room isolation, bot/human credit, failure retention of unsent text, Android layout, source limitations and a real service-bound AI response. Only confirmed runtime outcomes count as completed.
