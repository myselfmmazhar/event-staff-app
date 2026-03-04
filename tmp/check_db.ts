import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const smtpCount = await prisma.smtpConfiguration.count();
    const msgCount = await prisma.messagingConfiguration.count();
    const users = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] }, isActive: true },
        select: { email: true, role: true }
    });

    console.log('SMTP Configs:', smtpCount);
    console.log('Messaging Configs:', msgCount);
    console.log('Internal Team Members:', users);
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
