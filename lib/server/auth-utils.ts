import { auth, type Session } from "./auth";
import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import type { SessionUser } from "@/lib/types/auth.types";

/**
 * User Role Enum matching Prisma schema
 */
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
}

/**
 * Role hierarchy levels (higher number = more privileges)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.MANAGER]: 2,
  [UserRole.STAFF]: 1,
};

/**
 * Role groups for common access patterns
 */
export const ADMIN_PLUS = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
export const READ_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER];
export const ALL_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF];

/**
 * Get optional auth session from request headers
 * Returns null if not authenticated
 */
export async function getOptionalAuth(
  requestHeaders?: Headers
): Promise<Session | null> {
  try {
    const headersList = requestHeaders ?? (await headers());
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session;
  } catch (error) {
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getOptionalAuth();

  if (!session || !session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  return session;
}

/**
 * Check if user has specific role
 */
export function hasRole(userRole: string, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole as UserRole);
}

/**
 * Check if user has at least the specified role level
 * (e.g., hasRoleLevel(MANAGER) returns true for MANAGER, ADMIN, and SUPER_ADMIN)
 */
export function hasRoleLevel(userRole: string, minimumRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole];
  return userLevel >= requiredLevel;
}

/**
 * Require specific roles - throws if user doesn't have one of the allowed roles
 */
export async function requireRoles(allowedRoles: UserRole[]): Promise<Session> {
  const session = await requireAuth();
  const user = session.user as SessionUser;
  const userRole = user.role;

  if (!hasRole(userRole, allowedRoles)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Insufficient permissions",
    });
  }

  return session;
}

/**
 * Require admin or higher privileges
 */
export async function requireAdmin(): Promise<Session> {
  return requireRoles(ADMIN_PLUS);
}

/**
 * Require read access (manager or higher)
 */
export async function requireReadAccess(): Promise<Session> {
  return requireRoles(READ_ROLES);
}

/**
 * Check if user is active
 */
export function isUserActive(session: Session): boolean {
  const user = session.user as SessionUser;
  return user.isActive === true;
}

/**
 * Require active user - throws if user is inactive
 */
export async function requireActiveUser(): Promise<Session> {
  const session = await requireAuth();

  if (!isUserActive(session)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User account is inactive",
    });
  }

  return session;
}

/**
 * Check if email is verified
 */
export function isEmailVerified(session: Session): boolean {
  return session.user.emailVerified === true;
}

/**
 * Get user display name
 */
export function getUserDisplayName(session: Session): string {
  const user = session.user as SessionUser;
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  return user.email || "Unknown User";
}

/**
 * Check if user can perform admin actions (write access)
 */
export function hasWriteAccess(userRole: string): boolean {
  return hasRole(userRole, ADMIN_PLUS);
}

/**
 * Check if user can read data
 */
export function hasReadAccess(userRole: string): boolean {
  return hasRole(userRole, READ_ROLES);
}
