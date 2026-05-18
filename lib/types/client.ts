import type { ClientSelect } from './prisma-types';

/**
 * Shared Client types - used across backend and frontend
 * Prevents duplication and ensures consistency across the module
 */

/**
 * Full Client type with all fields
 * Derived from Prisma-generated ClientSelect type
 */
export type Client = ClientSelect;

/**
 * Subset of Client fields used in table display
 */
export type ClientTableRow = Pick<
  Client,
  | 'id'
  | 'clientId'
  | 'businessName'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'cellPhone'
  | 'businessAddress'
  | 'businessAddressLine2'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'hasLoginAccess'
  | 'userId'
  | 'invitationToken'
> & {
  users_clients_userIdTousers: {
    isActive: boolean;
    lastLoginAt: Date | null;
  } | null;
};

/**
 * Client fields used in delete confirmation dialog
 */
export type ClientDeleteInfo = Pick<
  Client,
  'businessName' | 'firstName' | 'lastName' | 'hasLoginAccess'
>;
