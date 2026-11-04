# Pathways cohort sign-in (#885)

**Date:** 2026-11-03 · **Pod:** Build

The request was `implement`, following a four-ticket value/effort review. This change covers the Pathways sign-in and registration ticket. Preserve classroom access, reject malformed credentials before password work, and keep guessing and registration volume bounded. The regression suite uses the real routes and limiter middleware with synthetic cohorts, learners and addresses. No production credentials or data are used.
