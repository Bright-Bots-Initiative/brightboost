#!/usr/bin/env bash
# Local–CI parity gate. Runs checks in CI order; stops at first failure.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

run() {
  echo "+ $*"
  "$@"
}

run npm run lint
run npm run format:check
run npm run typecheck
echo "+ (cd backend && npm run typecheck)"
(cd backend && npm run typecheck)
run bash scripts/check-prisma-drift.sh
run npm run agent:check
run npm run docs:check
run npm run test:unit
