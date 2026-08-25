# Ticket #670 — protect student names in group galleries

**Author:** Nathaniel Walker with Codex
**Date:** 2026-08-25
**Sprint:** Post-program maintenance
**Pod:** Build

## Intent

Prevent kid-editable profile text from being displayed to student peers in the group gallery, while preserving useful first-name context for the author and adult viewers.

## Prompt

```
start work on #670
```

The prompt continued an owner-operated repository thread that required live-state verification, current canonical documentation, narrow branches from `main`, exact-head CI, and preservation of former contributor credit.

## What Claude Code Did

- Files modified: gallery API serialization and tests, gallery UI and tests, four locale files
- File created: this prompt log
- Verification: exact-head GitHub checks are required before merge because the sandbox could not complete a dependency install

## What Worked

Tracing the value from `POST /api/edit-profile` through `User.name`, the creation DTO, and `GroupGallery` showed that the safest small fix belongs at the read boundary. Masking peer names protects existing data and signup-provided names without a schema migration or a brittle profanity list.

## What Needed Editing

The issue's original options assumed either a reliable content filter or an authoritative roster-name field. The repository has neither, so the implementation uses viewer-aware disclosure and fails closed for unknown roles.

## Lessons

For child-facing shared surfaces, validate both the write path and every read projection. Output minimization can close historical and future exposure at once when the authoritative moderated source does not yet exist.

## Rating

5/5
