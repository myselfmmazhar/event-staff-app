import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const entry = await prisma.timeEntry.findFirst({
      include: {
        revisions: true
      }
    });
    console.log("Success! Revisions found:", entry?.revisions?.length ?? 0);
  } catch (e: any) {
    console.error("Error! Available fields on include:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
