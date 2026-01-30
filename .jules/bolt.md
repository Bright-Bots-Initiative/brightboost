## 2024-05-23 - Missing Indexes on Foreign Keys

**Learning:** Prisma does not automatically create indexes on foreign keys that are part of a relation but not part of a unique constraint. This can lead to silent performance degradation on filtering by foreign keys (e.g., finding all classes for a teacher).
**Action:** Always verify if foreign key fields used in `where` clauses have explicit `@@index` in `schema.prisma`.

## 2024-05-24 - Redundant Count Queries

**Learning:** In scenarios where we need both the count of items and the items themselves (e.g., game turns), it is faster to fetch the items first and use `array.length` for the count, rather than issuing a separate `count` query.
**Action:** Before writing `prisma.model.count`, check if you are already fetching, or about to fetch, the data that could provide this information for free.

## 2024-06-25 - Match Queue Scaling

**Learning:** Queues that query by "PENDING" status in a table that accumulates historical data (like `Match`) will suffer from O(N) performance degradation over time as the "completed" set grows.
**Action:** Always add a composite index (e.g., `@@index([status, band])`) for queries that filter by status in append-only logs or historical tables.

## 2024-05-30 - Parallelizing Independent DB Queries

**Learning:** Sequential await calls (e.g., `await query1; await query2`) for independent data increase total latency. For example, fetching user progress and module structure separately doubled the time for the module detail view.
**Action:** Use `Promise.all([query1, query2])` to execute independent queries concurrently.

## 2026-01-11 - Optimizing Payload Size with Prisma Select

**Learning:** Fetching full objects (all columns) when only a subset is needed (e.g., for status checks) significantly inflates payload size, especially for large lists like user progress. Prisma `select` can reduce this by >50%.
**Action:** Use `select` in `findMany` queries to retrieve only the fields required by the frontend.

## 2026-05-24 - Redundant Service Fetches

**Learning:** Service functions often fetch their own data (e.g., `resolveTurn` fetching `Match`), leading to redundant queries when the caller (Route) could have fetched it efficiently in parallel with other data.
**Action:** Allow service functions to accept optional "preloaded" data entities. Use `Promise.all` in the route to fetch all necessary data (including what the service needs) and pass it down.

## 2024-05-24 - Optimizing Module Structure Fetch

**Learning:** `getModule` was fetching full content (including heavy JSON/HTML) even when only the structure (titles, IDs) was needed for navigation in Dashboard and Module Detail pages.
**Action:** Implemented a `structureOnly` option in `api.getModule` and a corresponding query param in the backend to use `getModuleStructure` (which excludes content) instead of `getModuleWithContent`.

## 2026-01-26 - AuthContext Over-fetching

**Learning:** `AuthContext` was fetching all user progress records via `/get-progress` but only using the user profile, causing unnecessary DB load and large payloads on every session check.
**Action:** Ensure "me" or "profile" endpoints are scoped strictly to the data needed for authentication/context, or use optional parameters to include heavy related data only when necessary.

## 2026-05-24 - Optimized Progress Lookup

**Learning:** `findFirst` on unique fields is functionally equivalent to `findUnique`, but `findUnique` explicitly communicates the intent to the database and ORM, ensuring optimal index usage (O(1) lookup).
**Action:** Replaced `prisma.progress.findFirst` with `prisma.progress.findUnique` in `complete-activity` handler, utilizing the compound unique index `@@unique([studentId, activityId])`.
