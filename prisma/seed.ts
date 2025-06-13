import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.user.deleteMany({ where: { role: 'student' } });

        const students = [
            {
                name: 'Sophia Gates',
                email: 'sophiagates@test.com',
                password: 'test1',
                role: 'student',
                xp: 1000,
                level: 'Explorer',
                streak: 5,
            },
            {
                name: 'Glenn Hoffman',
                email: 'glennhoffman@test.com',
                password: 'test2',
                role: 'student',
                xp: 100,
                level: 'Explorer',
                streak: 1,
            },
            {
                name: 'Justine Weiss',
                email: 'justineweiss@test.com',
                password: 'test3',
                role: 'student',
                xp: 500,
                level: 'Explorer',
                streak: 3,
            },
            {
                name: 'Alfonso Randall',
                email: 'alfonsorandall@test.com',
                password: 'test4',
                role: 'student',
                xp: 3000,
                level: 'Explorer',
                streak: 10,
            },
            {
                name: 'Elba Zamora',
                email: 'elbazamora@test.com',
                password: 'test5',
                role: 'student',
                xp: 200,
                level: 'Explorer',
                streak: 2,
            }, 
        ];

        await prisma.user.createMany({ data: students });
        console.log('Seeded 5 sample students successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding sample student data:', (error as Error).message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();