import { UserRole } from '@prisma/client';
import type { Session } from '@/lib/server/auth';

/**
 * Extended User type that includes additional fields from better-auth configuration
 * This type represents the user object from the session with all custom fields
 */
export type SessionUser = Session['user'] & {
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  profilePhoto?: string | null;
  lastLoginAt?: Date | null;
};

/**
 * Type guard to check if user has extended fields
 */
export function isExtendedUser(user: Session['user']): user is SessionUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    'firstName' in user &&
    'lastName' in user &&
    'role' in user
  );
}

