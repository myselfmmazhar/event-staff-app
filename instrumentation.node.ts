import { prisma } from "@/lib/server/prisma";
import { UserRole } from "@prisma/client";
import { randomUUID } from "crypto";

async function seedAdmin() {
  if (process.env.SEED_ADMIN_ON_BOOT !== "true") return;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log("[instrumentation] Admin user already exists, skipping seed.");
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@123!";
  const adminFirstName = process.env.ADMIN_FIRST_NAME ?? "Admin";
  const adminLastName = process.env.ADMIN_LAST_NAME ?? "User";

  const { hashPassword } = await import("better-auth/crypto");
  const hashedPassword = await hashPassword(adminPassword);
  const userId = randomUUID();

  await prisma.user.create({
    data: {
      id: userId,
      email: adminEmail,
      name: `${adminFirstName} ${adminLastName}`,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: hashedPassword,
    },
  });

  console.log(`[instrumentation] Admin user created: ${adminEmail}`);
}

seedAdmin().catch((e) => {
  console.error("[instrumentation] Seed error (non-fatal):", e);
});
