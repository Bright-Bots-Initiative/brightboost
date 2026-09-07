> **Canonical for:** staff (admin) capability grant. Last verified against code: 2026-09-06.

# Staff capability (admin role)

Some surfaces are global: one change affects every learner or every teacher. They require the
explicit **staff** capability, which is the `admin` value of `User.role`.

| Surface                                                                                     | Guard                                                                 |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET/POST /api/experiments`, `PUT /api/experiments/:id`, `GET /api/experiments/:id/results` | `requireStaff` (`backend/src/utils/staff.ts`) — **#873**              |
| `GET /api/admin/metrics`                                                                    | `requireRole("admin")`                                                |
| Frontend `/admin/experiments`, `/admin/metrics`                                             | `ProtectedRoute requiredRole="admin"` (display only; the API decides) |

Learner-facing experiment routes (`GET /api/experiments/:slug/variant`, `POST /api/experiments/:slug/event`)
stay open to every authenticated user.

## Properties

- No signup path issues `admin`; `POST /signup/teacher` and `POST /signup/student` hardcode
  their roles. No request field, header or body value can grant the capability.
- `requireStaff` re-reads `User.role` from the database on every call, so demoting an account
  takes effect immediately rather than when its 7-day JWT expires.
- Owning a record (for example `Experiment.createdBy`) grants nothing.

## Granting or revoking

There is no UI. An operator with database access runs, against the target environment:

```sql
-- grant
UPDATE "User" SET role = 'admin' WHERE email = 'person@brightboost.org' AND role = 'teacher';
-- revoke
UPDATE "User" SET role = 'teacher' WHERE email = 'person@brightboost.org' AND role = 'admin';
```

Grant only to Bright Bots staff accounts, never to partner or pilot teacher accounts. The user
must sign in again to receive a token that carries the new role (the database check above
still applies to old tokens). Record the grant in the team's ops log; there is no audit row for
a direct SQL change.

Local development: the seed does not create an admin. Promote `teacher@school.com` with the
grant statement above against the local Postgres (port 5435) when the experiments dashboard is
needed.
