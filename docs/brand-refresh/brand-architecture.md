> **Canonical for:** brand architecture (Bright Bots Initiative, Bright Boost, Pathways) and web-property ownership. Last verified against code: 2026-09-03.

# Brand architecture

## The three names

| Name                       | What it is                                                                                 | Where it lives                                                   | Evidence in this repository                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Bright Bots Initiative** | Nonprofit parent organization                                                              | `brightbots.org` (see below); not this repository                | `package.json` author; `index.html` author meta; `Organization` JSON-LD on the homepage; privacy/terms pages; email footers |
| **Bright Boost**           | The K–8 product                                                                            | This repository; `brightboost.org` → Railway behind Cloudflare   | `EducationalOrganization` JSON-LD; homepage copy "Bright Boost by Bright Bots Initiative"                                   |
| **Bright Boost Pathways**  | Older-youth pathway (ages 14–17, cybersecurity-first), a program of Bright Bots Initiative | Inside this product under `/pathways` (`/pathways/about` public) | `pathways.json` footer key "Bright Boost Pathways — A program of Bright Bots Initiative"                                    |

Decision §3 of [`docs/architecture/brand-refresh-decision.md`](../architecture/brand-refresh-decision.md) fixes this hierarchy for BRAND_R1 copy and schema markup.

## Web properties — what is proven (2026-09-03, read-only probes)

| Property                                | Observed                                                                                                                                                                                                                                                   | Confidence | Source                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| `brightboost.org`                       | `HTTP 200`, `Server: cloudflare`, `x-railway-request-id` present → Cloudflare-proxied to the Railway frontend. Nameservers `leanna.ns.cloudflare.com`, `memphis.ns.cloudflare.com`.                                                                        | High       | `curl -sSI https://brightboost.org/`, `nslookup -type=NS brightboost.org` |
| `www.brightboost.org`                   | Does not resolve (`curl: (6)`)                                                                                                                                                                                                                             | High       | `curl`, `nslookup`                                                        |
| `fe-production-3552.up.railway.app`     | `HTTP 200`, `Server: railway-hikari`, same `index.html` as the apex, no helmet headers → nginx frontend image (`Dockerfile.frontend`), **not** Express `SERVE_FRONTEND`                                                                                    | High       | `curl -sSI`                                                               |
| `brightboost-production.up.railway.app` | `HTTP 200` JSON `{status:"ok",service:"backend"}`, helmet headers; `/health` → `{"status":"ok","sharedEngine":"greatwork-engine-stub-730@0.0.0"}`                                                                                                          | High       | `curl`                                                                    |
| `brightbots.org`                        | `HTTP 200 text/html`, **13,725 bytes**, `Server: AmazonS3`, `Via: … cloudfront.net`, `Last-Modified: Tue, 07 Nov 2023 19:29:47 GMT` → a static site in an S3 bucket behind CloudFront, last changed November 2023. A-records `143.204.204.*` (CloudFront). | High       | `curl -sSI -L https://brightbots.org/`, `nslookup`                        |
| `www.brightbots.org`                    | NXDOMAIN                                                                                                                                                                                                                                                   | High       | `nslookup`                                                                |
| `brightbotsint.com`                     | NXDOMAIN for the apex (A lookup); used as a mailbox domain in-app (`nwalker@brightbotsint.com`) — MX not checked                                                                                                                                           | Medium     | `nslookup`; `src/pages/PrivacyPolicy.tsx`                                 |

## Bright Bots source — status: `HOLD_SOURCE_NOT_FOUND`

What was checked, so the negative is bounded:

- **GitHub organization `Bright-Bots-Initiative`** lists four repositories: `brightboost`, `azure-webapp-quickstart-kit`, `lqm`, `demo-repository`. None is a website or CMS source for `brightbots.org` (`gh repo list Bright-Bots-Initiative --limit 60`).
- **This repository** contains no `brightbots.org` site source: a bounded search for `brightbots` across `*.md, *.ts, *.tsx, *.json, *.html` finds only copy, mailto links, and CSS class names (`bg-brightbots-*` in two legacy components).
- **The live host is S3 + CloudFront**, which means the source of truth is either a local folder someone uploads, a CI job in another account, or a hosted builder exporting to S3. Which one is not knowable from outside the AWS account.

Consequences (decision §8): no Bright Bots repository is invented, no CMS or monorepo choice is made, and BRAND_R1 may not redesign `brightbots.org` until the operator completes section F of the [staging runbook](release-0/staging-runbook.md): identify the AWS account and bucket, export a complete backup, and record forms, donation links, analytics, and redirects in the [evidence register](release-0/evidence-register.md).

Interim safety: a byte-level snapshot of the public HTML can be taken today (`curl -sS https://brightbots.org/ -o brightbots-org-YYYY-MM-DD.html` plus every asset it references) so that a redesign can never lose the current public content. That snapshot is **not** a source backup and must not be mistaken for one.

## Options to decide later (not now)

| Option                            | Fits when                                                                         | Cost                                                                |
| --------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Separate repository (static site) | The site stays a handful of pages with a donation link and forms hosted elsewhere | Lowest; keeps this product's CI unburdened                          |
| Monorepo path in this repository  | Shared tokens/components with Bright Boost matter more than release independence  | Adds a build target to `ci-cd.yml`, the parity runner, `#764` scope |
| Hosted CMS                        | Non-engineers must edit content weekly                                            | Recurring cost; export/backup discipline becomes the risk           |

Selection happens in BRAND_R1_DESIGN only after the source and backup exist.
