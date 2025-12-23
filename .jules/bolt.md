# Bolt's Journal - Critical Learnings

## 2024-05-23 - Missing Indexes on Foreign Keys

**Learning:** Prisma does not automatically create indexes on foreign keys that are part of a relation but not part of a unique constraint. This can lead to silent performance degradation on filtering by foreign keys (e.g., finding all classes for a teacher).
**Action:** Always verify if foreign key fields used in `where` clauses have explicit `@@index` in `schema.prisma`.
