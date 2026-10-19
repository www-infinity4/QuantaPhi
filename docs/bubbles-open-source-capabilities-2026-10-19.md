# Bubbles capability upgrades — 19 October 2026

Gemini consultation: https://gemini.google.com/app/0b700b89e1017f42

Goal: contextual assistance that remembers user-approved preferences, reasons
over current evidence, chooses tools, runs code, and completes useful work.
Repository creation, reviewed pushes and color-bot execution come first.
Software can infer likely needs from shared context; thought reading and
physical housekeeping are not capabilities of this Android/Cloudflare stack.

## Upstream shortlist

These are candidates for reuse, not claims of installed dependencies or
benchmarked speed gains. Prefer maintained upstream releases; no fork was
created in this iteration. Repository metadata and applicable license text
were checked, rather than accepting Gemini's initial blanket license labels.

| Upstream | Useful addition | Runtime and costs | License/status checked |
| --- | --- | --- | --- |
| https://github.com/github/github-mcp-server | Vendor-maintained GitHub tool discovery, repository/PR/workflow operations | Go server/container or supported remote MCP transport; GitHub authorization and limits remain | MIT; active |
| https://github.com/modelcontextprotocol/python-sdk | Python functions and approved CLI tasks as typed MCP tools | Python service/container; environment and task execution still need hosting | MIT in current repository metadata; active |
| https://github.com/modelcontextprotocol/servers/tree/main/src/git | Local checkout inspection, diffs, logs and staging | Existing Linux runner with Git; remote authentication remains separate | Root LICENSE describes Apache-2.0 transition with legacy MIT contributions; inspect pinned code |
| https://github.com/pyodide/pyodide | Browser/Node Python for supported computation | Client CPU, RAM and download cost; not a native OS CLI or standalone security boundary | MPL-2.0; active |
| https://github.com/mem0ai/mem0 | User-scoped memory extraction and retrieval | Memory service, model/embedding calls and storage; D1/Vectorize adapter not established here | Apache-2.0; active |
| https://github.com/BerriAI/litellm | Common provider interface, routing, accounting and fallback policy | Hosted Python gateway/provider credentials; paid model usage remains | Core MIT; enterprise directory has separate terms |

GitHub's official MCP README and the MCP Python SDK README confirm their
respective roles. Pyodide's README targets browser/Node WebAssembly. LiteLLM's
root LICENSE explicitly distinguishes enterprise code. The MCP servers root
LICENSE explicitly describes its ongoing license transition. Gemini's
unverified latency figures, free-compute claims and direct Mem0/D1 assumptions
were not adopted.

## First implemented change

The existing direct GitHub executor now supplies native function schemas for
its authorized task mode. The model can plan with read_repository, read_file,
list_runs, list_workflows, reviewed commit_files/create_pr, explicitly requested
dispatch_workflow and finish. The server fixes repository and task branch;
existing source pins, reviews, bounds, mode checks and receipts remain.

The decoder accepts structured Workers AI, Chat Completions and Responses
envelopes, with compatibility for the existing JSON-only provider. Multiple
simultaneous calls and unknown tools are rejected. Actual operation results
feed the next reasoning step; a failed workflow remains a failure. This is a
native adapter upgrade, not an installation of the upstream MCP server.

Validation: 449 Bubbles checks passed locally, including structured planning,
provider-envelope decoding, actual GitHub adapter receipts, and rejection of
a provider attempting to commit during a read task. The existing eight-step
ceiling remains. A separate live Cloudflare model probe returned HTTP 200 and
a structured list_runs function call (chatcmpl-b485ea27-311c-4352-8e4c-09eece442e94).
That verifies the current provider accepts this schema format; it did not
execute a GitHub operation or establish production deployment of this patch.

## Verified infrastructure evidence

Cloudflare settings show BRAIN/ORACLE/AI/SEARCH bindings for bubbles-tools and
the existing Brain storage/model bindings. No direct GITHUB_TOKEN binding is
listed, but the code supports encrypted credential storage; absence of a
binding does not establish a missing credential.

Moltnook run 39210707311 logged a successful existing-key connection at
2026-10-19T06:34:43.308Z for www-infinity4, source Moltnook Actions GHP:
https://github.com/www-infinity4/Moltnook/actions/runs/39210707311
The same run verified adapter reads, then reported idle. That proves credential
handoff and runner checks, not a new repository creation or bot-written commit.
No credential value was read or placed in this report.

## Next concrete integrations

1. Exercise repository creation and a reviewed push through the authenticated
   Bubbles route; retain GitHub repository/commit/CI receipts and original IDs.
2. Connect a Python MCP service to the existing bounded Linux runner. Discover
   declared schemas, attach owner/job scope, return stdout/stderr/exit status
   and immutable artifacts; do not treat a package install as successful work.
3. Give color-bot jobs the same capability descriptions and actual error
   feedback, preserving the existing parent/job/dependency records. A spawn
   receipt means creation, not execution or reward settlement.
4. Evaluate user-scoped memory and model routing against real Bubbles tasks
   before choosing Mem0 or LiteLLM. Retain existing D1 conversation memory.

Gemini reviewed the native schema implementation description, suggested
bounded evidence and explicit tool-error feedback, and acknowledged the
licensing/runtime corrections. It did not execute our tests or inspect a phone.
