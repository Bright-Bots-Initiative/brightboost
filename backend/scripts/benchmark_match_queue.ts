
import { PrismaClient, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("⚡ Bolt: Benchmarking Match Queue Performance");

  // 1. Cleanup existing matches (optional, but keeps benchmark clean)
  // await prisma.match.deleteMany();

  // 2. Seed 'completed' matches to simulate a mature production DB
  const MATCH_COUNT = 10000;
  console.log(`🌱 Seeding ${MATCH_COUNT} completed matches...`);

  // Create a dummy user to be the player
  const player = await prisma.user.create({
    data: {
      name: "BenchBot",
      email: `bench-${Date.now()}@test.com`,
      password: "hashedpassword",
      role: "student",
      avatar: {
        create: {
            archetype: "AI",
            level: 1
        }
    }
    },
    include: { avatar: true }
  });

  const avatarId = player.avatar!.id;

  // Batch insert is faster for setup
  const datas = Array.from({ length: MATCH_COUNT }).map((_, i) => ({
    player1Id: avatarId,
    player2Id: avatarId, // Self-play for seeding speed
    status: MatchStatus.COMPLETED,
    band: "K2",
    winnerId: avatarId
  }));

  // Chunking to avoid parameter limits
  const chunkSize = 1000;
  for (let i = 0; i < datas.length; i += chunkSize) {
      await prisma.match.createMany({
          data: datas.slice(i, i + chunkSize)
      });
      if (i % 5000 === 0) process.stdout.write('.');
  }
  console.log("\n✅ Seeding complete.");

  // 3. Create ONE pending match at the very end (worst case for full scan)
  await prisma.match.create({
      data: {
          player1Id: avatarId,
          status: MatchStatus.PENDING,
          band: "K2"
      }
  });

  // 4. Measure Query Time
  console.log("⏱️  Measuring lookup time for PENDING match...");

  const start = performance.now();

  // This matches the exact query in `backend/src/routes/match.ts`
  const match = await prisma.match.findFirst({
    where: {
      status: MatchStatus.PENDING,
      band: "K2",
      // We simulate a different user searching, so we don't exclude the creator
      // NOT: { player1Id: "some-other-id" }
    }
  });

  const end = performance.now();
  const duration = end - start;

  console.log(`🔍 Found Match ID: ${match?.id}`);
  console.log(`⚡ Query Duration: ${duration.toFixed(3)}ms`);

  if (duration > 50) {
      console.log("⚠️  SLOW! This query likely performed a full table scan.");
  } else {
      console.log("🚀 FAST! Index likely engaged.");
  }

  // Cleanup
  await prisma.match.deleteMany({ where: { player1Id: avatarId } });
  await prisma.user.delete({ where: { id: player.id } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
