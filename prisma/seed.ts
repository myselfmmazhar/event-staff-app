import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedStaffData } from './seed-staff-data';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database with Better Auth (scrypt)...\n');

  // Get credentials from environment variables or use defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Super';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'Admin';

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists. Skipping admin seed.');
    console.log('   To recreate, run: docker compose down -v && docker compose up -d\n');
  } else {
    // Import Better Auth at runtime to use its sign-up functionality
    const { auth } = await import('../lib/server/auth');

    try {
      // Use Better Auth's sign-up method which handles scrypt hashing automatically
      const result = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: `${adminFirstName} ${adminLastName}`,
          firstName: adminFirstName,
          lastName: adminLastName,
        },
      });

      if (!result || !result.user) {
        throw new Error('Failed to create user via Better Auth');
      }

      // Update user with additional fields after creation
      const admin = await prisma.user.update({
        where: { id: result.user.id },
        data: {
          firstName: adminFirstName,
          lastName: adminLastName,
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
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('\n🔒 Password Security: scrypt (Better Auth default)');
    } catch (error) {
      console.error('❌ Error during sign-up:', error);
      throw error;
    }
  }

  // Seed Staff Data (Positions and Work Types)
  await seedStaffData();

  console.log('\n🎉 Database seeding completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
