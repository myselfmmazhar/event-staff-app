import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmin() {
  console.log('🔍 Checking admin account...\n');

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
    include: { accounts: true },
  });

  if (!admin) {
    console.log('❌ Admin user not found');
    return;
  }

  console.log('User:', {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    passwordLength: admin.password?.length || 0,
    passwordPrefix: admin.password?.substring(0, 10) || 'none',
  });

  console.log('\nAccounts:', admin.accounts.map(acc => ({
    id: acc.id,
    providerId: acc.providerId,
    accountId: acc.accountId,
    passwordLength: acc.password?.length || 0,
    passwordPrefix: acc.password?.substring(0, 10) || 'none',
  })));
}

checkAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
