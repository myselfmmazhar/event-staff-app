import { prisma } from './lib/server/prisma';

async function test() {
    console.log('Prisma keys:', Object.keys(prisma).filter(k => !k.startsWith('_')));
    try {
        const configs = await (prisma as any).smtpConfiguration.findMany();
        console.log('SMTP Configs:', configs.length);
    } catch (e) {
        console.error('Error accessing smtpConfiguration:', (e as any).message);
    }
}

test();
