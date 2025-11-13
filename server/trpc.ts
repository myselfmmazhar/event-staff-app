import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "@/lib/server/prisma";
import { getOptionalAuth } from "@/lib/server/auth-utils";
import { UserRole, hasRole } from "@/lib/server/auth-utils";
import { ClientService } from "@/services/client.service";
import superjson from "superjson";
import type { Session } from "@/lib/server/auth";
import type { SessionUser } from "@/lib/types/auth.types";
import { ZodError } from "zod";
import { extractZodFieldErrors, mapPrismaError } from "@/lib/utils/error-handler";

/**
 * Create context for each request
 */
export async function createContext() {
  const session = await getOptionalAuth();

  return {
    prisma,
    session,
    userId: session?.user?.id || null,
    userRole: (session?.user as SessionUser | undefined)?.role || null,
    clientService: new ClientService(prisma),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * Initialize tRPC with context
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Extract field-level errors from Zod validation errors
    if (error.cause instanceof ZodError) {
      const fieldErrors = extractZodFieldErrors(error.cause);
      return {
        ...shape,
        data: {
          ...shape.data,
          fieldErrors,
          zodError: error.cause.flatten(),
        },
      };
    }

    // Map Prisma errors to user-friendly messages
    if (error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
      const prismaError = error.cause as { code?: string };
      if (prismaError.code && prismaError.code.startsWith('P')) {
        const mappedError = mapPrismaError(prismaError);
        return {
          ...shape,
          message: mappedError.message,
          data: {
            ...shape.data,
            prismaCode: prismaError.code,
          },
        };
      }
    }

    return shape;
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const middleware = t.middleware;

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session as Session,
      userId: ctx.userId as string,
    },
  });
});

/**
 * Middleware to check if user is active
 */
const isActive = middleware(async ({ ctx, next }) => {
  const user = ctx.session?.user as SessionUser | undefined;

  if (!user?.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User account is inactive",
    });
  }

  return next({ ctx });
});

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure
  .use(isAuthenticated)
  .use(isActive);

/**
 * Create role-based procedure
 */
export function createRoleProcedure(allowedRoles: UserRole[]) {
  const checkRole = middleware(async ({ ctx, next }) => {
    if (!ctx.userRole || !hasRole(ctx.userRole, allowedRoles)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Insufficient permissions",
      });
    }

    return next({ ctx });
  });

  return t.procedure.use(isAuthenticated).use(isActive).use(checkRole);
}

/**
 * Admin-only procedure (SUPER_ADMIN and ADMIN)
 */
export const adminProcedure = createRoleProcedure([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
]);

/**
 * Manager+ procedure (SUPER_ADMIN, ADMIN, MANAGER)
 */
export const managerProcedure = createRoleProcedure([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
]);
