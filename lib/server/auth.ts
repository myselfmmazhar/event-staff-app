import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { APIError } from "better-auth/api";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Using Better Auth's default scrypt hashing (more secure than bcrypt)
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // This hook runs before a session is created (i.e., before login completes)
          // Fetch the user to check their status
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
              role: true,
              isActive: true,
              emailVerified: true,
            },
          });

          if (!user) {
            throw new APIError("NOT_FOUND", {
              message: "User not found",
            });
          }

          // SUPER_ADMIN bypass - always allow login
          if (user.role === "SUPER_ADMIN") {
            return { data: session };
          }

          // Check if user account is inactive
          if (!user.isActive) {
            throw new APIError("FORBIDDEN", {
              message: "Your account is inactive. Please contact an administrator.",
            });
          }

          // Check if user has not verified their email (pending invitation)
          if (!user.emailVerified) {
            throw new APIError("FORBIDDEN", {
              message: "Please accept your invitation to activate your account.",
            });
          }

          return { data: session };
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  user: {
    // Additional user fields beyond better-auth defaults
    additionalFields: {
      firstName: {
        type: "string",
        required: true,
      },
      lastName: {
        type: "string",
        required: true,
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "STAFF",
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
      },
      phone: {
        type: "string",
        required: false,
      },
      profilePhoto: {
        type: "string",
        required: false,
      },
      lastLoginAt: {
        type: "date",
        required: false,
      },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "event-auth",
  },
});

export type Session = typeof auth.$Infer.Session;
// Extract User type from Session
export type User = Session extends { user: infer U } ? U : never;
