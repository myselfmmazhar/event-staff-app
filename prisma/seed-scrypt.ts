import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with Better Auth (scrypt)...\n');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists. Skipping seed.');
    console.log('   To recreate, run: docker compose down -v && docker compose up -d\n');
    return;
  }

  // Import Better Auth at runtime to use its sign-up functionality
  const { auth } = await import('../lib/server/auth');

  try {
    // Use Better Auth's sign-up method which handles scrypt hashing
    const result = await auth.api.signUpEmail({
      body: {
        email: 'admin@example.com',
        password: 'admin123',
        name: 'Super Admin',
        firstName: 'Super',
        lastName: 'Admin',
      },
    });

    if (!result || !result.user) {
      throw new Error('Failed to create user via Better Auth');
    }

    // Update user with additional fields after creation
    const admin = await prisma.user.update({
      where: { id: result.user.id },
      data: {
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        phone: '+1234567890',
        address: '123 Admin Street, Admin City, AC 12345',
        emailVerified: true,
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
    console.error('❌ Error during sign-up:', error);
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
