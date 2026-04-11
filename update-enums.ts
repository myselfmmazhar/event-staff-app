import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Adding CALL_INVITATION_BATCH to EmailTemplateType enum...');
    await prisma.$executeRawUnsafe(`ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'CALL_INVITATION_BATCH'`);
    console.log('Successfully added to EmailTemplateType');

    console.log('Adding CALL_INVITATION_BATCH to SmsTemplateType enum...');
    await prisma.$executeRawUnsafe(`ALTER TYPE "SmsTemplateType" ADD VALUE IF NOT EXISTS 'CALL_INVITATION_BATCH'`);
    console.log('Successfully added to SmsTemplateType');
  } catch (error) {
    console.error('Error updating enums:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
