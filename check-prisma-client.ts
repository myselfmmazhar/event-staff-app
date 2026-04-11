
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking SmtpConfiguration model...');
    try {
        // Check if the property exists on the model definition
        const model = (prisma as any)._dmmf?.modelMap?.SmtpConfiguration;
        if (model) {
            const field = model.fields.find((f: any) => f.name === 'security');
            console.log('Security field in DMMF:', field ? 'Found' : 'NOT FOUND');
        } else {
            console.log('SmtpConfiguration model not found in DMMF');
        }

        // Check the actual instance
        const fields = Object.keys((prisma as any).smtpConfiguration || {});
        console.log('SmtpConfiguration fields:', fields);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
