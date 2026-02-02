import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Create pg pool for the adapter
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL for Prisma seed');
}

const pool = new pg.Pool({ connectionString });
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
    // Use Better Auth's password hashing utility
    const { hashPassword } = await import('better-auth/crypto');
    const hashedPassword = await hashPassword(adminPassword);

    try {
      // Generate unique IDs
      const { randomUUID } = await import('crypto');
      const userId = randomUUID();
      const accountId = randomUUID();

      // Create user directly in database
      const admin = await prisma.user.create({
        data: {
          id: userId,
          email: adminEmail,
          name: `${adminFirstName} ${adminLastName}`,
          firstName: adminFirstName,
          lastName: adminLastName,
          role: UserRole.SUPER_ADMIN,
          isActive: true,
          emailVerified: true,
          phone: '+1234567890',
        },
      });

      // Create account with hashed password
      await prisma.account.create({
        data: {
          id: accountId,
          userId: admin.id,
          accountId: admin.id,
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
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('\n🔒 Password Security: scrypt');
    } catch (error) {
      console.error('❌ Error during user creation:', error);
      throw error;
    }
  }

  // Seed Organization Settings (Terminology)
  console.log('\n📝 Seeding organization settings...');
  const existingSettings = await prisma.organizationSettings.findFirst();

  if (existingSettings) {
    console.log('✅ Organization settings already exist. Skipping settings seed.');
  } else {
    const settings = await prisma.organizationSettings.create({
      data: {
        staffTermSingular: 'Staff',
        staffTermPlural: 'Staff',
        eventTermSingular: 'Event',
        eventTermPlural: 'Events',
      },
    });

    console.log('✅ Organization settings created:', {
      id: settings.id,
      staffTerm: `${settings.staffTermSingular}/${settings.staffTermPlural}`,
      eventTerm: `${settings.eventTermSingular}/${settings.eventTermPlural}`,
    });
  }

  console.log('\n🎉 Database seeding completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
