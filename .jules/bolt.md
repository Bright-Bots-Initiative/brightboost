# Bolt's Journal - Critical Learnings

## 2024-05-23 - Missing Indexes on Foreign Keys

**Learning:** Prisma does not automatically create indexes on foreign keys that are part of a relation but not part of a unique constraint. This can lead to silent performance degradation on filtering by foreign keys (e.g., finding all classes for a teacher).
**Action:** Always verify if foreign key fields used in `where` clauses have explicit `@@index` in `schema.prisma`.

## 2024-05-24 - Redundant Count Queries
**Learning:** In scenarios where we need both the count of items and the items themselves (e.g., game turns), it is faster to fetch the items first and use `array.length` for the count, rather than issuing a separate `count` query.
**Action:** Before writing `prisma.model.count`, check if you are already fetching, or about to fetch, the data that could provide this information for free.

## 2024-06-25 - Match Queue Scaling
**Learning:** Queues that query by "PENDING" status in a table that accumulates historical data (like `Match`) will suffer from O(N) performance degradation over time as the "completed" set grows.
**Action:** Always add a composite index (e.g., `@@index([status, band])`) for queries that filter by status in append-only logs or historical tables.
