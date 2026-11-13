# Public-site privacy truth and share previews

**Author:** Nathaniel Walker (implementation assisted by Codex)
**Date:** 2026-11-13
**Pod:** Build / Experience

## Intent

Correct public-site analytics behavior, disclosures, evaluator access, share previews,
and headline layout. Keep infrastructure settings and production data owner-managed.

## Prompt

The owner's request is recorded below. The illustrative dashboard/replay URL has
been omitted; no credentials or project identifiers are included.

> Privacy-truth and share-preview fixes for the public site (brightboost.org)
>
> Context: a live check of production on 2026-11-12 (commit 80d989e, "Launch
> redesigned Bright Boost public website and playable demo") found the issues
> below. If the code contradicts this brief, trust the code and tell me where.
>
> WORKFLOW
>
> 1. Plan-only first pass. Read the files named below, then give me: the exact
>    files you will touch, the tests you will add, and every place the code
>    contradicts this brief. Stop and wait for "go".
> 2. After "go": one branch, one PR, one conventional commit per task.
> 3. Do not touch environment variables, Railway, PostHog project settings or
>    any production database. Those are mine.
> 4. This repo is public. Never write a password, API key, PostHog project id or
>    replay link into code, tests, docs, commit messages or prompts/.
>
> WHAT PRODUCTION DOES TODAY (measured in a browser, not inferred)
>
> - VITE_POSTHOG_HOST was built with a PostHog dashboard link [URL example omitted],
>   not the ingestion host. Events still arrive because posthog-js infers the US
>   region. initAnalytics() prints the raw value to every visitor's console.
> - On every public page, including /student/signup, PostHog sends pageviews,
>   web vitals, heatmap data and a session replay with console logs. Text and
>   inputs are masked.
> - Finishing the public demo sends demo_game_completed with game_id, score,
>   stars and time_spent_seconds.
> - home.demo.staysLocal ("This practice stays on this device...") renders on
>   the /try results screen, and the evaluator guide says "no third-party
>   tracking". Neither is true while the above runs. Google Fonts (App.css
>   @import) and Cloudflare Web Analytics also load.
> - The old public share image is a screenshot of the Lovable template.
>   index.html carries only a relative og:image; og:title, og:description,
>   twitter:\* and canonical are added after hydration in src/pages/Index.tsx,
>   so link-preview crawlers never see them.
> - At a 1366px viewport the first line of #hero-heading ends at x=602. Its
>   column ends at 565 and the demo panel starts at 597, so the headline runs
>   into the panel.
> - src/pages/ForReviewers.tsx prints a demo teacher login and a demo student
>   login, says "BrightBoost", and says grades 3-5 are planned while the
>   homepage says they are available.
>
> DECISIONS ALREADY MADE
> D1. No session replay, heatmaps or console-log capture for anonymous visitors
> or students. Replay may start only after identifyUser() with role
> "teacher" or "admin", and must stop on resetAnalytics().
> D2. Keep the anonymous demo funnel events. Fix the copy so it is true.
> D3. Demo logins come off the public evaluator page.
>
> TASKS
>
> T1. Analytics host guard - src/lib/analytics.ts
>
> - Accept VITE_POSTHOG_HOST only if it is an https origin with no path, query
>   or hash. Otherwise warn once, naming the variable but not its value, and use
>   the default host.
> - The init log line prints the host origin only.
> - Accept: unit tests for a valid host, a dashboard link, an http URL and an
>   unset value. This is a silent-logic guard: show RED before GREEN
>   (docs/agents/rules/10-testing.md).
>
> T2. Replay policy (D1) - src/lib/analytics.ts, docs/analytics.md
>
> - Check every option name against the installed posthog-js types before using
>   it. Do not rely on memory or on this prompt for option names.
> - Accept: with a key set, init starts no recording for an anonymous visitor or
>   a student; identifying a teacher or admin starts it; reset stops it.
>   Heatmaps, dead-click capture and surveys are off in config. The comment
>   above session_recording and docs/analytics.md say what the code now does.
>
> T3. True copy (D2) - src/locales
>
> - Rewrite home.demo.staysLocal and the evaluator guide's "no third-party
>   tracking" line to describe what happens: the demo collects no name and no
>   account, and anonymous play counts go to our analytics provider. K-2
>   vocabulary for the demo line.
> - Change every locale that has the key (docs/agents/skills/i18n-strings).
>   Flag vi and zh-CN strings for human review if you translate them.
> - Search the locales for other "on this device" and "no tracking" claims. In
>   the plan, list each with whether it is true. Change only the false ones.
>
> T4. Evaluator guide (D3) - src/pages/ForReviewers.tsx,
> docs/pilot/pilot-quickstart.md
>
> - Remove both logins from the page and from the pilot doc. Replace them with a
>   way to request access. Ask me which contact address to use: the footer and
>   the privacy page disagree.
> - Use "Bright Boost". Make grade availability match the home copy: K-2 and
>   3-5 available, 6-8 coming soon.
> - Move any hardcoded string you touch to i18n keys.
> - In the plan, tell me whether the seed can create these two accounts outside
>   local and test environments. Do not change the seed.
>
> T5. Share preview - index.html, public/, src/pages/Index.tsx,
> src/components/home/publicEntry
>
> - Add static tags to index.html: og:title, og:description, og:url, og:type,
>   og:image (absolute https://brightboost.org URL, plus width, height and alt),
>   twitter:card=summary_large_image, twitter:image, and a canonical link.
> - Keep the static title and description byte-identical to home.meta.title and
>   home.meta.description in English, as the header comment in Index.tsx
>   requires. Update that comment, usePublicPageMeta and the Index and
>   publicEntry tests so hydration updates the static tags and never duplicates
>   them.
> - Replace the share image with a 1200x630 image built from existing brand
>   assets and tokens (mascot, name, the h1 line). Use a new filename: the
>   current file is served with a ten-year cache lifetime. Delete the old file.
>   Show me the image before committing it.
> - Accept: the built dist/index.html contains every tag above with absolute
>   URLs, and nothing references the old image.
>
> T6. Hero headline - src/pages/Index.tsx
>
> - The two whitespace-nowrap lines of #hero-heading must never extend past
>   their grid column.
> - Accept: at viewport widths 1024, 1100, 1280, 1366, 1440 and 1920, in English
>   and Spanish, the rendered text's right edge is at or left of the column's
>   right edge; no horizontal scroll at 320 and 375. Prove it in a real browser
>   with the repo's existing browser harness, not jsdom. Do not shrink the
>   heading below the display line above it.
>
> T7. Privacy policy draft - src/pages/PrivacyPolicy.tsx
>
> - Add a short "Analytics and service providers" section naming each third
>   party the frontend contacts after T2. Derive the list from the code and the
>   built bundle, and say what each one receives. No new legal claims.
> - Own commit, labelled "needs owner and legal review" in the PR. Do not change
>   the "Last updated" date; I will.
>
> PLAN ONLY, NO CODE
> P1. /student/signup is a live child-facing form (name, email, password) while
> the homepage says children never sign up for themselves. List every link
> and redirect that reaches it, and propose the smallest change that makes
> the homepage sentence true.
> P2. The demo's level 3 "Finish" leads to a score screen with a second
> "Finish". Say whether that can change for the public demo without touching
> the in-app game flow.
> P3. Whether Montserrat can be self-hosted with the build as it is.
>
> DONE MEANS
>
> - npm run verify -- --skip-install --allow-skips passes, and you name every
>   skipped step.
> - The PR description lists, per task: what changed, the test that proves it,
>   and anything you could not verify.
> - This prompt is logged under prompts/ per CONTRIBUTING.md, with nothing from
>   Workflow item 4 in it.

## Approval and scope

After reviewing the plan, the owner supplied the evaluator-access contact:
`fenixvisions@gmail.com`, followed by "for now. go".

The approved plan also corrects the Biome Buddy blanket transmission claim,
qualifies SparBots' incomplete saved-data description, updates the browser
provider expectation, and qualifies the privacy policy's conflicting educational-only
usage sentence. P1–P3 remain proposals, not implementation work.

## Outcome

The PR records the seven task commits, verification results, skipped checks,
translation review needs, and the privacy draft's owner/legal review requirement.
