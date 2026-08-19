> **Canonical for:** MCP / external agent tooling notes. Last verified against code: 2026-08-10.

# MCP and external tooling

- MCP server configuration is **machine-local**. It is not part of the Bright Boost product contract.
- No task, skill, or check in this repo may **require** an MCP server to pass.
- Prefer in-repo commands (`npm run agent:check`, `npm run verify`, Vitest) over tool-specific side channels.
- If an MCP tool is available in a contributor's environment, treat it as optional acceleration — never as the source of truth over code and `docs/agents/`.
- Do not commit MCP auth tokens, server URLs with secrets, or personal MCP configs into the repository.
