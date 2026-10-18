# Bubbles MCP / LLM interface

Bubbles website and Android WebView both use `bubbles-ai.js` -> the existing `bubbles-tools` Cloudflare Worker. This change leaves the original owner-authenticated Robot Brain job flow untouched.

## Connected source paths

- `workers/bubbles-tools/mcp.mjs`: read-only Model Context Protocol (MCP) Streamable HTTP server and optional GPT-OSS structured tool selector. Supports protocol `2025-06-18`, JSON-RPC 2.0, stateless `POST /mcp`.
- `workers/bubbles-tools/worker.mjs`: hosts `/mcp`, dispatches only an explicit allowlist of existing deterministic/source-backed Bubbles tools, and preserves real receipts.
- `bubbles-ai.js`: sets `mcp:true` for ordinary Bubbles Worker messages and offers an **MCP LLM tools** macro button. Explicit requests to use MCP may cause a single Cloudflare GPT-OSS 120B structured function-call decision; unstructured model text and arbitrary tool names never execute.
- `test/bubbles-mcp.test.mjs`: rejects missing auth, arbitrary GitHub actions, unexpected parameters, mismatched protocol versions, and fake model-generated tool JSON.

Available MCP tools: `web_search` (search snippets only), `weather_current` (town-level provider), `resonance_calculate` (mathematical ideal-LC computation), and `news_headlines` (dated sources and labeled fallback). These are **read-only**. The Worker does not accept MCP-supplied network URLs, filesystem paths, shell commands, repository edits or owner permissions.

## Required configuration and deployment

1. Review/merge the branch after GitHub Actions tests pass. CI confirms source checks, not live deployment.
2. Provision a unique **server-only**, high-entropy `BUBBLES_MCP_TOKEN` secret (at least 32 characters) on the `bubbles-tools` Cloudflare Worker. Do not put it in website JavaScript, Android resources, GitHub repository files, conversation history, or publicly accessible configuration. Rotate or revoke it if leaked.
3. Deploy `workers/bubbles-tools/wrangler.toml` to the existing `bubbles-tools` Worker. Confirm the deployed Worker version corresponds to the reviewed commit.
4. Verify `GET /health`, `POST /mcp` with a configured authorized **server-side** MCP client, and a Bubbles chat request `Show the MCP tools connected to Bubbles`. Confirm an actual tool receipt for an LC resonance call. Check `/mcp` rejects unauthenticated requests and the public frontend does not expose the secret.
5. Check Android and website chat independently. The native ChatGPT-account path is separate from the Cloudflare Workers AI model; this change does **not** connect a paid ChatGPT subscription to MCP.

Example MCP request for a trusted server client (credentials supplied by secret manager, never by a public browser):

```http
POST /mcp
Content-Type: application/json
Accept: application/json, text/event-stream
Authorization: Bearer <server-secret>
MCP-Protocol-Version: 2025-06-18

{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
```

## Permissions and evidence

MCP `tools/call` responses carry the tool output and the existing Bubbles receipt. A model's claimed tool call is not proof of execution. Robot Brain owner jobs, GitHub writes, Cloudflare token creation, bulk owner approvals, device recording, and any visitor-owned website editing still require their own verified authentication, scope and execution adapter. Remote third-party MCP server connections are **not** enabled by this patch; they must be explicitly configured and reviewed per provider.

Status: **source implementation**. Mark production connected only after authenticated live endpoint and phone checks, not on PR creation or passing CI alone.
