const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('Attempting to access smtpConfiguration...');
        const count = await prisma.smtpConfiguration.count();
        console.log('Success! Count:', count);
    } catch (err) {
        console.error('FAILED to access smtpConfiguration:');
        console.error(err.message);

        console.log('\nAvailable models on prisma object:');
        const keys = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
        console.log(keys.join(', '));
    } finally {
        await prisma.$disconnect();
    }
}

main();
