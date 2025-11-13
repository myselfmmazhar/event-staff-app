/**
 * Shared Client types - used across backend and frontend
 * Prevents duplication and ensures consistency across the module
 */

/**
 * Full Client type with all fields
 */
export interface Client {
  id: string;
  clientId: string;
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  businessPhone?: string | null;
  details?: string | null;
  venueName?: string | null;
  room?: string | null;
  streetAddress: string;
  aptSuiteUnit?: string | null;
  city: string;
  country: string;
  state: string;
  zipCode: string;
  hasLoginAccess: boolean;
  userId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

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
