import { prisma } from "./lib/server/prisma";
import { SettingsService } from "./services/settings.service";

async function test() {
    try {
        const settingsService = new SettingsService(prisma);
        const terminology = await settingsService.getTerminology();
        console.log("Terminology:", JSON.stringify(terminology, null, 2));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
