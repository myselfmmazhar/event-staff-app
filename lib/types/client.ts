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
  | 'city'
  | 'state'
  | 'hasLoginAccess'
>;

/**
 * Client fields used in delete confirmation dialog
 */
export type ClientDeleteInfo = Pick<
  Client,
  'businessName' | 'firstName' | 'lastName' | 'hasLoginAccess'
>;
