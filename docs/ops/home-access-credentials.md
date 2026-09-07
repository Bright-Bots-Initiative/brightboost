> **Canonical for:** home-access credential binding (#872): invitation authority, revocation and rollout. Last verified against code: 2026-09-07.

# Home-access credentials (#872)

Classroom (class-code) students have no credentials of their own. A home login (email + password)
is bound once, by proof, and changed afterwards only by the credential holder who re-enters the
current password from a password-provenance session.

## Who may bind

- The **owning teacher** of a class the student is enrolled in invites an adult by email after
  re-entering their own password. The mail carries a single-use token (72 h); only its SHA-256 is
  stored.
- The token binds only a **never-bound** account: no email, no password, `homeAccessEnabled` off,
  role `student`. Email signups and Pathways registrants can never be rebound through this path.
- Every failure leaves the token unused and the account unchanged: one transaction with
  count-guarded writes, the unique-email violation mapped after rollback.

## Invitation authority follows the relationship

Each `HomeAccessInvite` records the exact `Enrollment` row (`enrollmentId`), its `courseId` and
the inviter. Preview and acceptance require that same row to still exist, in that course, owned by
the inviter, who must still be a teacher. Acceptance re-verifies this under `FOR SHARE` row locks
(Enrollment → Course → User) inside its transaction, then claims the invite row with a
compare-and-swap on that provenance.

| Event                                                 | Effect on unused invitations                                                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Enrollment removed                                    | the FK nulls `enrollmentId`: never claimable; a new enrollment is a new row, so an old token never revives                    |
| Class deleted (`DELETE /api/teacher/courses/:id`)     | `revokedAt` set in the deleting transaction (written last, after the enrollment delete, to keep lock order deadlock-free)     |
| Course changes owner, or the inviter is not a teacher | preview/accept answer 410 `invite_revoked`; the token stays unused                                                            |
| A fresh invitation is issued for the student          | every earlier unused token for that student is revoked in the issuing transaction                                             |
| Acceptance racing a removal                           | whichever commits first wins: a removal that commits first prevents the binding; a binding that commits first is never undone |
| Enrollment ends after a binding                       | credentials are never deleted; the used invite merely loses its provenance                                                    |

Rows without provenance (`enrollmentId IS NULL`) are never claimable, in preview or acceptance.
Migration `20260907090000_home_access_invite_relationship` revokes any such pending rows; the
current class owner issues a fresh invitation.

Not built yet: a route to revoke a single invitation or to remove a single enrollment. Today a
teacher supersedes a mis-sent invitation by re-inviting, or ends it by deleting the class. Any
future soft-removal of an enrollment (`status` / `leftAt`) must also revoke its invitations.

Known residuals: the supersede is per student, not per class — a second teacher's invitation
kills the first teacher's unused one (fails closed; the owner should confirm this reach). Two
issuances for the same student that run at the same instant may both leave a live token; both
carry identical authority and the never-bound guard still allows exactly one binding.

## Rollout considerations (owner decisions; nothing here assumes them)

- **SMTP** must be configured for invitation mail. Without delivery the invite route answers 503
  and rolls the invitation back.
- **Legacy tokens** (issued before the `auth` claim) fail closed for credential changes until the
  user signs in again; ordinary learning is unaffected.
- **Guardian control** — `managedByParent`, the parent email, and what a child may change from a
  home session — remain product decisions.
- **Verified legacy enrollments** — nothing pre-existing is trusted implicitly; invitations are
  issued per current enrollment by the current owner, and pre-correction pending invitations are
  revoked by the migration.
