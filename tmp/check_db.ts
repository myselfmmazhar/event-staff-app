import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const settings = await prisma.organizationSettings.findFirst();
        console.log('Settings found:', settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
