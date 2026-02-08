import { UserRole } from '@prisma/client';
import { prisma } from '../lib/server/prisma';
import { hashPassword } from 'better-auth/crypto';
import { nanoid } from 'nanoid';

async function main() {
  console.log('🌱 Seeding database with Better Auth (scrypt)...\n');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists. Skipping seed.');
    console.log('   To recreate, run: npx prisma db push --force-reset\n');
    return;
  }

  try {
    // Hash password using Better Auth's scrypt hashing
    const hashedPassword = await hashPassword('admin123');
    const userId = nanoid();

    // Create user directly with all fields set correctly
    const admin = await prisma.user.create({
      data: {
        id: userId,
        email: 'admin@example.com',
        name: 'Super Admin',
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        emailVerified: true, // Set verified so login works
        phone: '+1234567890',
        password: hashedPassword,
      },
    });

    // Create account record for Better Auth (credential provider)
    await prisma.account.create({
      data: {
        id: nanoid(),
        userId: admin.id,
        accountId: admin.email,
        providerId: 'credential',
        password: hashedPassword,
      },
    });

    console.log('✅ Super admin user created:', {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    console.log('\n📋 Login credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('\n🔒 Password Security: scrypt (Better Auth default)');
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
