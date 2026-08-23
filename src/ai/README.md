# AI runtime

The core AI runtime is provider-neutral and server-only.

Flow:

`user/webhook → trusted tenant context → business/clinic/patient/conversation context → modular safety prompt → provider → fixed tool allow-list → Zod validation → tenant/ownership checks → bounded execution → sanitized result → final response → interaction log`

Providers:

- `mock` — default local development path; no paid provider required.
- `openai` — OpenAI-compatible HTTP API through `OPENAI_BASE_URL`.
- `anthropic` — Anthropic Messages-compatible HTTP API through `ANTHROPIC_BASE_URL`.

The eight core tools are fixed in `src/ai/tools/index.ts`. `organizationId` is supplied by the server to the executor and is never accepted from model arguments.

AI calls are bounded to four orchestration loops and eight tool calls per interaction and use database-backed rate limiting.
