import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning database...');

    try {
        // Delete all rooms. Cascade delete will handle participants.
        const { count } = await prisma.room.deleteMany({});
        console.log(`✅ Deleted ${count} rooms (and their participants).`);
    } catch (e) {
        console.error('❌ Error cleaning database:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
