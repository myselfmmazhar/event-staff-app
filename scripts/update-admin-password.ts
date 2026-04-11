import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function updatePassword() {
  console.log('🔄 Updating admin password...\n');

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
    include: { accounts: true },
  });

  if (!admin) {
    console.log('❌ Admin user not found');
    return;
  }

  // Hash password with 10 rounds to match Better Auth config
  const hashedPassword = await hash('admin123', 10);

  // Update user password
  await prisma.user.update({
    where: { id: admin.id },
    data: { password: hashedPassword },
  });

  // Update account password
  const credentialAccount = admin.accounts.find(
    (acc) => acc.providerId === 'credential'
  );

  if (credentialAccount) {
    await prisma.account.update({
      where: { id: credentialAccount.id },
      data: { password: hashedPassword },
    });
  }

  console.log('✅ Admin password updated successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Email: admin@example.com');
  console.log('   Password: admin123');
}

updatePassword()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
