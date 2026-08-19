> **Canonical for:** performance learnings (migrated from `.jules/bolt.md`). Last verified against code: 2026-08-10.

# Performance learnings

## Missing indexes on foreign keys

Prisma does not automatically create indexes on foreign keys that are part of a relation but not part of a unique constraint. Filtering by those FKs can degrade silently.

**Action:** Verify FK fields used in `where` clauses have explicit `@@index` in `schema.prisma`.

## Redundant count queries

When you need both items and a count, fetch the items and use `array.length` instead of a separate `count` query when the set is already loaded.

**Action:** Before `prisma.model.count`, check whether the data is already fetched (or about to be).

## Match queue scaling

Queues that query by `"PENDING"` status in tables that accumulate history degrade as O(N) as completed rows grow.

**Action:** Add a composite index (e.g. `@@index([status, band])`) for status filters on append-only / historical tables.

## Parallelize independent DB queries

Sequential `await` for independent queries increases latency.

**Action:** Use `Promise.all([query1, query2])` for independent fetches.

## Payload size with Prisma `select`

Fetching full objects when only a subset is needed inflates payloads (e.g. large progress lists).

**Action:** Use `select` in `findMany` to retrieve only required fields.

## Redundant service fetches

Services that re-fetch entities the route already has cause duplicate queries.

**Action:** Allow services to accept optional preloaded entities. Fetch in parallel in the route and pass down.

## Module structure vs full content

`getModule` historically fetched heavy content when dashboards only needed structure.

**Action:** Prefer structure-only APIs / query params when content is unused.

## AuthContext over-fetching

Fetching all progress via `/get-progress` when only the profile is needed wastes DB and bandwidth.

**Action:** Scope "me" / profile endpoints to auth-needed fields; make heavy includes optional.

## Prefer `findUnique` for unique lookups

`findFirst` on unique fields is functionally similar but `findUnique` communicates intent and uses the unique index clearly.

**Action:** Prefer `findUnique` for compound unique indexes such as `@@unique([studentId, activityId])`.
