# Classroom access and assessment integrity

**Author:** Nathaniel Walker with Codex
**Date:** 2026-10-12
**Pod:** Build / Experience

## Intent

Implement the four value/effort recommendations: #900, #898, #889 and #886.

## Prompt

> implement

Context: the accepted recommendations were assignment-aware module cards,
course-cache refresh after enrollment, PRE-before-POST assessment enforcement,
and spreadsheet-safe roster CSV exports.

## Changes and evidence

- Module cards use the shared access policy and identify teacher picks. Hidden,
  unpublished, grade-ineligible and specialty-only content retains its gates.
- Successful class joins invalidate course data and refresh mounted consumers.
  Timed revalidation keeps confirmed content mounted while checking freshness;
  obsolete requests cannot restore invalidated membership.
- Assessment listing, question retrieval and submission share a scoped PRE lookup.
  A missing or unfinished PRE blocks POST; a completed, closed PRE still counts.
- Roster CSV output quotes fields and marks formula-shaped values as text while
  preserving the existing facilitator visibility rules.
- Before the fixes, 19 relevant regression assertions failed and 13 healthy
  assertions passed. Afterward, the focused ten-file suite passed 96 tests,
  including additional cache cancellation and background-refresh cases.
- The real CSV encoder's output was imported into LibreOffice Calc with formula
  evaluation enabled and quoted-field-as-text disabled: all 11 sample names were
  text, numeric columns remained numeric, and CSV save/reopen preserved that result.
  Excel was not available for direct verification; CSV behavior is importer-specific.
- Full repository and hosted CI results are recorded in the implementation PR.
