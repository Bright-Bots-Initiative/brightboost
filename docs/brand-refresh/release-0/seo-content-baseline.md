> **Canonical for:** BRAND_R0 SEO and content baseline. Last verified against code: 2026-09-03.

# SEO and content baseline (BRAND_R0)

Captured 2026-09-03T01:02Z against `brightboost.org` (production SHA `91e4071`, see [`baseline.md`](baseline.md) for the SHA caveat).

## Initial HTML versus hydrated content

`curl -sS https://brightboost.org/` returns the 20-line Vite shell: `<title>BrightBoost</title>`, `description` "Bilingual K-8 STEM learning platform", `author` "Bright Bots Initiative", `og:image /og-image.png`, script/modulepreload tags, empty `#root`. Everything visible to a person is client-rendered. Consequences recorded for BRAND_R1: crawlers that do not execute JavaScript see one title and one description for every route; social previews on non-home routes fall back to the shell.

Reproduce:

```bash
curl -sS https://brightboost.org/ > initial.html
# hydrated: open the route in a browser, wait for #hero-heading, and save document.documentElement.outerHTML
```

The Cypress shell smoke (`cypress/e2e/smoke.cy.ts`) is the repository's hydrated-render proof for `/`: it asserts `nav[aria-label="Homepage"]`, the wordmark link, and `#hero-heading` "Build STEM confidence through playful learning".

## Public route and metadata inventory

| Route                                                                                               | Client `document.title`                                                   | Meta/OG                                                                                 | JSON-LD                                                                                | Notes                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------- |
| `/`                                                                                                 | "Bright Boost — Free K-8 STEM Learning for Students, Teachers & Families" | description, `og:title/description`, `twitter:title/description` (upserted client-side) | `Organization` (Bright Bots Initiative), `EducationalOrganization` (Bright Boost, K-8) | `src/pages/Index.tsx`             |
| `/try`                                                                                              | shell                                                                     | shell                                                                                   | none                                                                                   | anonymous demo funnel             |
| `/plans/:plan`                                                                                      | shell                                                                     | shell                                                                                   | none                                                                                   | three Always-Free plans           |
| `/students`, `/teachers`, `/organizations`                                                          | shell                                                                     | shell                                                                                   | none                                                                                   | `AudiencePlaceholder`             |
| `/parents`, `/parents/guide`                                                                        | `parents.docTitle` / `parentGuide.docTitle` (i18n)                        | shell                                                                                   | none                                                                                   |                                   |
| `/teacher/signup`, `/student/signup`                                                                | `<pageTitle> · Bright Boost` (i18n, restored on unmount)                  | shell                                                                                   | none                                                                                   |                                   |
| `/showcase`, `/for-reviewers`, `/waterworks`, `/pathways/about`, `/privacy`, `/terms`, login routes | shell                                                                     | shell                                                                                   | none                                                                                   |                                   |
| `/feedback`, `/donate`                                                                              | —                                                                         | —                                                                                       | —                                                                                      | scroll-redirect into `/` sections |

## Canonical, robots, sitemap, hreflang, schema

| Item            | State                                                                                             | BRAND_R1 note                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `rel=canonical` | none anywhere                                                                                     | The apex and `fe-production-3552.up.railway.app` serve identical content → duplicate host; canonical to `https://brightboost.org` |
| `robots.txt`    | none; `GET /robots.txt` → `200 text/html` (SPA fallback)                                          | Add a real file; keep `/api/` and `/admin/` disallowed                                                                            |
| `sitemap.xml`   | none; same SPA fallback                                                                           | Generate from the public route list                                                                                               |
| `hreflang`      | none; `<html lang="en">` static; language toggle persists to `localStorage` (`preferredLanguage`) | Locale is not URL-addressable; hreflang needs a URL strategy first (#632)                                                         |
| Structured data | `/` only, injected after hydration                                                                |                                                                                                                                   |
| `X-Robots-Tag`  | none before BRAND_R0; after: `noindex, nofollow` on non-production only                           | Verified by `scripts/verify-deploy-target.mjs`                                                                                    |
| `www` host      | `www.brightboost.org` does not resolve                                                            | Decide redirect policy in Cloudflare (staging runbook E)                                                                          |

Reproduce:

```bash
for p in / /robots.txt /sitemap.xml; do curl -sS -o /dev/null -w "%{http_code} %{content_type} $p\n" "https://brightboost.org$p"; done
curl -sSI https://brightboost.org/ | grep -i -E "x-robots-tag|link:|cache-control"
```

## Current public claims (content-evidence register seed)

Claims the homepage and public pages make today, with the evidence that backs them. BRAND_R1 copy must keep each row true or remove the claim. Full register: [`evidence-register.md`](evidence-register.md).

| Claim (where)                                                | Evidence                                                                                                        | Status                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------- |
| "Free" / "Always Free" (hero badge, plan cards)              | No pricing or payment code in the repository; plans are content only                                            | Supported                   |
| "Bilingual" / K-8 (title, description)                       | EN/ES locale files complete for the app; marketing surface is hardcoded English (#632); vi/zh-CN partial (#678) | Supported with caveat       |
| "Bright Boost by Bright Bots Initiative" (footer, JSON-LD)   | `package.json` author, privacy policy contact                                                                   | Supported                   |
| "Join our first 1,000 users" (early-access section)          | Real-count endpoint is admin-only; page must not show a fake number (spec rule)                                 | Supported (no number shown) |
| "Title I classrooms and after-school programs" (root README) | Not on the public site; program claim                                                                           | README only                 |
| Donation copy "optional and never required"                  | `VITE_DONATION_URL` unset → "coming soon"; no tax-deductibility claim in code                                   | Supported                   |
| Contact `hello@brightbots.org`                               | Mailbox deliverability not verified                                                                             | `PENDING_EXTERNAL_READ`     |
