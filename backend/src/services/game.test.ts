
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist prismaMock so it's available for the mock factory
const prismaMock = vi.hoisted(() => ({
    progress: {
        count: vi.fn(),
    },
    avatar: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    ability: {
        findMany: vi.fn(),
    },
    unlockedAbility: {
        findMany: vi.fn(),
        createMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
    },
}));

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(() => prismaMock),
    MatchStatus: {},
}));

// Import after mock
import { checkUnlocks } from './game';

describe('checkUnlocks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should unlock new abilities when leveling up using batch operations', async () => {
        const studentId = 'student-1';
        const avatarId = 'avatar-1';

        // Mock progress count to trigger level up (e.g., 10 items / 2 = level 6)
        prismaMock.progress.count.mockResolvedValue(10);

        prismaMock.avatar.findUnique.mockResolvedValue({
            id: avatarId,
            studentId,
            archetype: 'AI',
            level: 1,
        });

        const abilities = [
            { id: 'ab-1', archetype: 'AI', reqLevel: 1 },
            { id: 'ab-2', archetype: 'AI', reqLevel: 2 },
            { id: 'ab-3', archetype: 'AI', reqLevel: 6 },
        ];
        prismaMock.ability.findMany.mockResolvedValue(abilities);

        // Simulate no existing unlocks for the optimized implementation
        prismaMock.unlockedAbility.findMany.mockResolvedValue([]);

        await checkUnlocks(studentId);

        // Verify avatar updated
        expect(prismaMock.avatar.update).toHaveBeenCalledWith({
            where: { id: avatarId },
            data: { level: 6, xp: { increment: 100 } }
        });

        // Optimization check: findFirst and create should NOT be called
        expect(prismaMock.unlockedAbility.findFirst).not.toHaveBeenCalled();
        expect(prismaMock.unlockedAbility.create).not.toHaveBeenCalled();

        // createMany should be called once with 3 items
        expect(prismaMock.unlockedAbility.createMany).toHaveBeenCalledTimes(1);
        expect(prismaMock.unlockedAbility.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ avatarId: avatarId, abilityId: 'ab-1' }),
                expect.objectContaining({ avatarId: avatarId, abilityId: 'ab-2' }),
                expect.objectContaining({ avatarId: avatarId, abilityId: 'ab-3' }),
            ])
        });
    });

    it('should only create unlocks for abilities not already unlocked', async () => {
        const studentId = 'student-1';
        const avatarId = 'avatar-1';

        prismaMock.progress.count.mockResolvedValue(10);

        prismaMock.avatar.findUnique.mockResolvedValue({
            id: avatarId,
            studentId,
            archetype: 'AI',
            level: 1,
        });

        const abilities = [
            { id: 'ab-1', archetype: 'AI', reqLevel: 1 },
            { id: 'ab-2', archetype: 'AI', reqLevel: 2 },
        ];
        prismaMock.ability.findMany.mockResolvedValue(abilities);

        // Simulate ab-1 already unlocked
        prismaMock.unlockedAbility.findMany.mockResolvedValue([{ abilityId: 'ab-1' }]);

        await checkUnlocks(studentId);

        // createMany should be called with only ab-2
        expect(prismaMock.unlockedAbility.createMany).toHaveBeenCalledWith({
            data: [expect.objectContaining({ avatarId: avatarId, abilityId: 'ab-2' })]
        });
    });
});
