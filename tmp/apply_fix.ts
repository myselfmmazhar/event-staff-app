import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
    console.log('Applying targeted database fix...');
    try {
        // Check if column already exists to avoid errors
        const checkResult = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='messaging_configurations' AND column_name='from';
    `);

        if (Array.isArray(checkResult) && checkResult.length > 0) {
            console.log('✅ Column "from" already exists in "messaging_configurations".');
        } else {
            console.log('Adding column "from" to "messaging_configurations"...');
            await prisma.$executeRawUnsafe('ALTER TABLE "messaging_configurations" ADD COLUMN "from" TEXT;');
            console.log('✅ Column added successfully.');
        }
    } catch (error) {
        console.error('❌ Error applying fix:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

run();
