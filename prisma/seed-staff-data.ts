import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Seed Staff Positions
 */
const staffPositions = [
    { name: "Server", description: "Waitstaff serving food and beverages" },
    { name: "Bartender", description: "Prepares and serves alcoholic and non-alcoholic beverages" },
    { name: "Chef", description: "Head cook responsible for kitchen operations" },
    { name: "Host/Hostess", description: "Greets and seats guests" },
    { name: "Manager", description: "Oversees operations and staff" },
    { name: "Cook", description: "Prepares food items" },
    { name: "Dishwasher", description: "Cleans dishes and kitchen equipment" },
    { name: "Busser", description: "Clears and sets tables" },
    { name: "Runner", description: "Delivers food from kitchen to tables" },
    { name: "Barback", description: "Assists bartender with setup and restocking" },
    { name: "Captain", description: "Senior server overseeing service staff" },
    { name: "Sommelier", description: "Wine specialist and advisor" },
    { name: "Line Cook", description: "Prepares food at specific station" },
    { name: "Prep Cook", description: "Prepares ingredients for cooking" },
    { name: "Sous Chef", description: "Second-in-command in the kitchen" },
];

/**
 * Seed Work Types
 */
const workTypes = [
    { name: "Full-Time", description: "Regular full-time employment" },
    { name: "Part-Time", description: "Part-time employment" },
    { name: "On-Call", description: "Available for on-demand work" },
    { name: "Seasonal", description: "Seasonal or temporary work" },
    { name: "Wedding Events", description: "Works at wedding events" },
    { name: "Corporate Events", description: "Works at corporate functions" },
    { name: "Private Parties", description: "Works at private events and parties" },
    { name: "Catering", description: "Catering services" },
    { name: "Banquet Service", description: "Large-scale banquet service" },
    { name: "Restaurant Service", description: "Restaurant dining service" },
    { name: "Bar Service", description: "Bar and beverage service" },
    { name: "Fine Dining", description: "Upscale fine dining service" },
];

export async function seedStaffData() {
    console.log("🌱 Seeding Staff Positions and Work Types...");

    try {
        // Seed Staff Positions
        console.log("  📋 Creating Staff Positions...");
        for (const position of staffPositions) {
            await prisma.staffPosition.upsert({
                where: { name: position.name },
                update: {},
                create: position,
            });
        }
        console.log(`  ✅ Created ${staffPositions.length} staff positions`);

        // Seed Work Types
        console.log("  💼 Creating Work Types...");
        for (const workType of workTypes) {
            await prisma.workType.upsert({
                where: { name: workType.name },
                update: {},
                create: workType,
            });
        }
        console.log(`  ✅ Created ${workTypes.length} work types`);

        console.log("✅ Staff data seeding completed!");
    } catch (error) {
        console.error("❌ Error seeding staff data:", error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    seedStaffData()
        .catch((e) => {
            console.error(e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
            await pool.end();
        });
}
