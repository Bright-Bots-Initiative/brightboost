#!/usr/bin/env sh
set -e

echo "predeploy: prisma generate"
npx prisma generate --schema prisma/schema.prisma

echo "predeploy: seed"
node prisma/seed.cjs

echo "predeploy: done"
