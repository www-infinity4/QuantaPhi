# Reads & Realms repair context

Owner report, October 21, 2026: Reads & Realms repeats the bundled story set
instead of serving new stories. Bubbles answered with a model-generated
`githubCreateRepo` draft for “GPT Investigation.” That text is evidence of a
routing failure, not evidence that GitHub created a repository.

Affected project: www-infinity4/QuantaPhi. Relevant files: infinite-book.js,
infinite-book-discovery.js, bubbles-ai.js, workers/bubbles-tools/worker.mjs.
“GPT Investigation” describes the requested investigation context; it is not
an instruction to create a public repository or invent a new target.

Keep the original report, affected component, source paths, diagnosis, tests,
commit and deployment receipts together. Associate any later investigation
archive with this project; do not copy private conversation history publicly.

Confirmed source defects: the fresh-story branch still picked and immediately
displayed catalog stories, including the homepage default; the model-draft
filter omitted githubCreateRepo; the gateway matched create/repository words
anywhere in a repair report, even inside a negation. The scoped repair makes
fresh requests await discovery, rejects those raw drafts and limits creation
routing to a direct instruction. Provider failures must remain visible; no new
story is claimed unless the source-backed writer completes.

Signed Bubbles test: Moltnook run 39630257641, turn 0, returned
github.create_repository / blocked even though the question explicitly forbade
creation. The route worked, but the response was wrong. Its public conversation
scope does not grant private owner history, GitHub writes or Android control.

Gemini was consulted in the cloud browser on October 21. Its useful advice was
to preserve active-project context, validate the proposed action against the
request, and test repairs separately from repository creation. Tests and actual
receipts, rather than the advice alone, establish the result.
