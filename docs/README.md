> **Canonical for:** documentation map. Last verified against code: 2026-08-10.

# Docs map

Start at the repo [`README.md`](../README.md). From there, every canonical topic below is reachable in ≤ 2 hops.

## Directories under `docs/`

| Directory                        | What lives here                                                    |
| -------------------------------- | ------------------------------------------------------------------ |
| [`agents/`](agents/)             | Agent bootstrap, always-on rules, skills, learned notes, MCP notes |
| [`guides/`](guides/)             | Human deep-dives: local-dev, parallel clones, AI coding practices  |
| [`ops/`](ops/)                   | CI jobs, branch protection, deployment pipeline inventory          |
| [`pilot/`](pilot/)               | Partner / evaluator / pilot readiness material and demo accounts   |
| [`frontend/`](frontend/)         | Frontend dashboard and accessibility notes                         |
| [`games/`](games/)               | Game design notes                                                  |
| [`audits/`](audits/)             | Experience / localization audits                                   |
| [`architecture/`](architecture/) | Legacy architecture diagrams                                       |
| [`azure/`](azure/)               | Remaining Azure IaC (e.g. `.bicep`); markdown runbooks removed     |
| _(root of `docs/`)_              | Topic docs (i18n, testing, staging, API, design, etc.)             |

## Canonical documents

| Topic                       | Canonical                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| What the project is         | [`README.md`](../README.md)                                                                                          |
| Zero-to-running setup       | [`SETUP.md`](../SETUP.md)                                                                                            |
| Human contribution workflow | [`CONTRIBUTING.md`](../CONTRIBUTING.md)                                                                              |
| Agent context               | [`docs/agents/agent.md`](agents/agent.md) → overview                                                                 |
| Deployment                  | [`DEPLOYMENT.md`](../DEPLOYMENT.md)                                                                                  |
| CI jobs & parity            | [`docs/ops/ci.md`](ops/ci.md) (parity table in [`agents/rules/60-verification.md`](agents/rules/60-verification.md)) |
| Security policy             | [`SECURITY.md`](../SECURITY.md)                                                                                      |
| This map                    | [`docs/README.md`](README.md)                                                                                        |

## Guides

| Guide                                                            | Purpose                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| [`guides/local-dev.md`](guides/local-dev.md)                     | Troubleshooting companion to SETUP                     |
| [`guides/parallel-agents.md`](guides/parallel-agents.md)         | Multiple local clones without editing tracked ports    |
| [`guides/ai-coding-practices.md`](guides/ai-coding-practices.md) | Scaffolding, test layers, Cypress, manual walkthroughs |

## Integrity

```bash
npm run docs:check
```

See also `npm run agent:check` and `npm run verify`.
