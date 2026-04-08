export async function register() {
  // Only run in Node.js runtime (not Edge), and only when seeding is enabled
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.SEED_ADMIN_ON_BOOT !== "true"
  ) {
    return;
  }

  try {
    const { prisma } = await import("@/lib/server/prisma");
    const { UserRole } = await import("@prisma/client");

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
    const { randomUUID } = await import("crypto");

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
  } catch (e) {
    // Log but don't crash the server — a pre-existing unique constraint
    // violation just means another instance already seeded.
    console.error("[instrumentation] Seed error (non-fatal):", e);
  }
}
