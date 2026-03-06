import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Database Check ---');

        // Check if the table exists and how many records
        // We use try-catch for each in case the model name is slightly different
        const models = [
            'messagingConfiguration',
            'MessagingConfiguration',
            'messaging_configuration',
            'messagingConfigurations'
        ];

        for (const model of models) {
            try {
                const count = await (prisma as any)[model].count();
                console.log(`Model [${model}] exists. Count: ${count}`);
                if (count > 0) {
                    const records = await (prisma as any)[model].findMany();
                    console.log(`Records for [${model}]:`, JSON.stringify(records, null, 2));
                }
            } catch (e) {
                // console.log(`Model [${model}] does not exist or failed.`);
            }
        }

        // Check OrganizationSettings just in case
        const settings = await prisma.organizationSettings.findFirst();
        console.log('Organization Settings:', JSON.stringify(settings, null, 2));

    } catch (err) {
        console.error('Fatal error in script:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
