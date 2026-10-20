# Bubbles semantic orchestration — unified QuantaPhi architecture

**Status:** staged design and a small read-only first step; not a deployed, full agent.
**Principle:** a person supplies a goal in natural language. The assistant resolves
meaning, discovers available capabilities, plans steps, enforces permission at
each execution boundary, checks real receipts and responds conversationally.
**Do not:** add one voice regex or visible button for every possible action.

## Preserve the existing Phi lineage

Grammar Phi remains Engine #1: word/concept relationships and grammatical
normalization. QuantaPhi is Engine #2: dynamic semantic reweighting and
source/entity-grounded retrieval. Its readme defines the candidate score:

```
regionPrior + semanticFit + relationshipFit + intentFit
+ evidenceStrength + mediaFit + sourceTrust
- conflictPenalty - repetitionPenalty
```

The color fields are positions in semantic context, not fixed word classes
or a permanent authorization hierarchy. Do not treat a word's QuantaPhi
weight as a security credential, an execution receipt, or proof of physics.

The user's earlier reasoning-dot -> logic-forming-dot concept belongs in
the planning stage: the current utterance activates a weighted set of
related concepts, retrieves grounded context, and determines the next
logical action. The system may plan multiple steps, but must not pretend
an inferred step was executed.

## One semantic execution pipeline

1. **Capture:** keep existing Android voice listening, ONNX/Vosk components,
   typed chat and WebView. Speech-to-text is already a separate concern.
2. **Interpret:** compile a structured semantic frame from the full utterance
   and active conversation: goal, target entity, modifiers, time, relevant
   repository/page/device, requested outcome, prohibited actions,
   unresolved ambiguity, references to prior steps.
3. **Context and provenance:** retrieve scoped Bubbles owner conversation,
   prior receipts, relevant QuantaPhi/Grammar Phi concepts and canonical
   entities. Prefer authoritative live evidence over remembered snippets;
   distinguish proposed, committed, tested and deployed states.
4. **Capability discovery:** query one versioned registry of real adapter
   descriptions, JSON schemas, side effects, required permission scopes,
   availability/health, retry semantics and completion verifiers.
5. **Plan:** use the model to compose a small sequence of typed tool calls
   or a truthful answer. Tools are selected by meaning, not phrase lists.
   Follow-up messages can revise the same goal without repeating all nouns.
6. **Authorize:** a model's chosen capability is never authorization.
   Read-only Bubbles tools have their own allowlist. Native phone capture
   stays behind Android consent. GitHub changes, Cloudflare actions, browser
   control and Robot Brain jobs must go through their existing verified owner
   sessions and per-action policies.
7. **Execute and verify:** each adapter validates arguments, executes at
   most the approved action, and returns a receipt with status, source and
   evidence. Verify postconditions separately. Do not infer tool success,
   a deployment or a token payout from natural-language text.
8. **Respond and learn:** summarize outcomes naturally. Persist scoped,
   relevant context and trusted receipts in D1; use Vectorize for retrieval
   acceleration only. Keep secrets, private chats and wallet authority
   separate. Backups never mint or transfer tokens.

## Concrete repository boundaries

| Stage | Existing source / system | Connection needed |
| --- | --- | --- |
| Spoken and typed request | `android/bubbles-overlay/`, `bubbles-ai.js` | Preserve working mic; pass original goal and thread context |
| Conversation model | `workers/bubbles-tools/worker.mjs` | Use a typed tool catalog in normal model turns |
| Read-only functions | `workers/bubbles-tools/mcp.mjs` | Validated function calls, receipts, no magic MCP phrase |
| Owner action routing | `bubbles-brain-actions.js` | Replace broad keyword-only work inference with validated semantic proposals while keeping explicit owner checks |
| Browser control | `workers/bubbles-tools/browser.mjs`, Bubbles cloud-browser owner bridge | Discover adapter but require owner proof and fresh browser observation |
| Repository edits | `workers/infinity-brain-clock/direct-github.mjs` | Discover authenticated capabilities; preserve branch/PR/test and authorizations |
| Knowledge and memory | QuantaPhi search, owner conversation, `brain-rag-memory.mjs` | Shared scoped semantic frame with evidence and canonical subject |
| Robot execution | `workers/infinity-brain-clock/` | Execute approved plans and verify actual downstream receipts |

## Current phase 1 code in this branch

The existing GPT-OSS conversational turn now advertises the **four existing
read-only MCP tools**. A model can select one through a single structured
function call without hearing literal "MCP" or "use the tools". Strict MCP
schemas are applied before any call. If it selects a tool, a second tool-free
model pass can explain the verified result. Ordinary conversation is still
one model call. No permission escalation or new external tool is introduced.

This phase does **not** enable multi-step execution, semantic cross-repository
writes, production deployment, new provider entitlements, owner approval
or Android permissions. Those require the stages below.

## Next engineering phases (not yet implemented)

1. **Canonical semantic-frame contract** shared by website and APK for
   follow-up resolution; identify subject confusion (e.g. chemical symbols
   and atomic numbers) before planning. Test against real QuantaPhi card
   entity-mixing failures.
2. **Server-side versioned capability registry** that includes browser,
   Github and Cloudflare/Robot Brain adapters with explicit owner-scoped
   permission metadata, adapter health and completion checks. Never publish
   bearer tokens or secrets to the chat frontend.
3. **Bounded multi-step planner** with a typed plan, approval transitions,
   idempotency keys, observation refresh and repair loop. No direct arbitrary
   tool execution from LLM-generated URLs, shell or source code.
4. **Unified semantic memory and state** joining scoped owner conversation,
   source-locked QuantaPhi retrieval and trusted action receipts. Separate
   user instructions from untrusted webpages or repo content.
5. **GitHub code quality gate:** semantic planning improves intent but does
   not itself prevent JavaScript syntax errors. Parse/typecheck/lint/test
   changed code, then review a diff and require commit/deployment receipts.
6. **End-to-end fixtures:** natural-language weather question, canonical
   element research, radio-card embed in chat, owner-approved website fix,
   read-only repository inspection, Android record request with system
   consent, wallet history lookup without fake balances, and blocked
   unauthenticated write attempt.

## Acceptance criteria

- Asking a natural information question can call an existing relevant
  tool without a specific command word and returns source-backed evidence.
- Ordinary conversation does not pay for a preliminary standalone selector.
- The existing quick deterministic tools remain fast and backwards compatible.
- A model's raw prose or JSON and unknown functions never execute.
- A tool result can be summarized without recursively requesting another tool.
- Owner work, browser control, native capture and wallet changes remain
  privileged separate actions requiring correct evidence and consent.
- Source tests and deployment checks distinguish merged code from running
  production. A phone APK build is not proof of installed functionality.
