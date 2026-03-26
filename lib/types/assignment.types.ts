/**
 * Assignment Types
 *
 * Type definitions for the event assignment system.
 * Assignments can be either Product or Service based.
 */

import type { CostUnitType, PriceUnitType, ExperienceRequirement, StaffRating, RateType, AmountType } from '@prisma/client';

/**
 * Assignment type discriminator
 */
export type AssignmentType = 'PRODUCT' | 'SERVICE';

/**
 * Service item data from the service selector
 */
export interface ServiceItem {
  id: string;
  serviceId: string;
  title: string;
  cost: number | null;
  price: number | null;
  costUnitType: CostUnitType | null;
  description: string | null;
  isActive: boolean;
}

/**
 * Product item data from the product selector
 */
export interface ProductItem {
  id: string;
  productId: string;
  title: string;
  cost: number | null;
  price: number | null;
  priceUnitType: PriceUnitType | null;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

/**
 * Base assignment fields shared by both Product and Service assignments
 */
export interface BaseAssignment {
  /** Temporary UUID for UI tracking (before save to backend) */
  id: string;
  /** Discriminator for assignment type */
  type: AssignmentType;
  /** Quantity needed */
  quantity: number;
  /** Whether commission applies to this assignment */
  commission: boolean;
  /** Commission amount (if commission is enabled) */
  commissionAmount?: number | null;
  /** Commission amount type (e.g. PERCENTAGE, FLAT) */
  commissionAmountType?: AmountType | null;
  /** Whether expenditure applies to this assignment */
  expenditure: boolean;
  /** Expenditure cost (paid to talent) */
  expenditureCost?: number | null;
  /** Expenditure price (billed to client) */
  expenditurePrice?: number | null;
  /** Legacy expenditure amount */
  expenditureAmount?: number | null;
  /** Expenditure amount type (e.g. FLAT) */
  expenditureAmountType?: AmountType | null;
}

/**
 * Product assignment - attaching a product to an event
 */
export interface ProductAssignment extends BaseAssignment {
  type: 'PRODUCT';
  /** Product UUID */
  productId: string;
  /** Full product data (for display) */
  product: ProductItem | null;
  /** Product description (prefilled from product, can be edited) */
  description: string | null;
  /** Special instructions for this product */
  instructions: string | null;
}

/**
 * Service assignment - attaching a service to an event
 */
export interface ServiceAssignment extends BaseAssignment {
  type: 'SERVICE';
  /** Service UUID */
  serviceId: string;
  /** Full service data (for display) */
  service: ServiceItem | null;
  /** Assignment start date (YYYY-MM-DD format) */
  startDate: string | null;
  /** Whether start date is UBD (Until Better Defined) */
  startDateUBD?: boolean;
  /** Assignment start time (HH:MM format) */
  startTime: string | null;
  /** Whether start time is TBD (To Be Determined) */
  startTimeTBD?: boolean;
  /** Assignment end date (YYYY-MM-DD format) */
  endDate: string | null;
  /** Whether end date is UBD (Until Better Defined) */
  endDateUBD?: boolean;
  /** Assignment end time (HH:MM format) */
  endTime: string | null;
  /** Whether end time is TBD (To Be Determined) */
  endTimeTBD?: boolean;
  /** Required experience level */
  experienceRequired: ExperienceRequirement;
  /** Required rating level */
  ratingRequired: StaffRating | 'ANY';
  /** Whether overtime is approved */
  approveOvertime: boolean;
  /** Overtime rate (if overtime is approved) */
  overtimeRate?: number | null;
  /** Overtime rate type (e.g. PERCENTAGE, FLAT) */
  overtimeRateType?: AmountType | null;
  /** Pay rate for staff */
  payRate: number | null;
  /** Bill rate for client */
  billRate: number | null;
  /** Rate type (PER_HOUR, PER_SHIFT, PER_DAY, PER_EVENT) */
  rateType: RateType | null;
  /** Internal notes */
  notes: string | null;
  /** Special instructions for staff */
  instructions: string | null;
}

/**
 * Union type for all assignment types
 */
export type Assignment = ProductAssignment | ServiceAssignment;

/**
 * Assignment form data for creating/editing
 */
export interface AssignmentFormData {
  type: AssignmentType;
  productId?: string;
  serviceId?: string;
  quantity: number;
  commission: boolean;
  commissionAmount?: number | null;
  commissionAmountType?: AmountType | null;
  // Product-specific
  description?: string | null;
  instructions?: string | null;
  // Service-specific
  startDate?: string | null;
  startDateUBD?: boolean;
  startTime?: string | null;
  startTimeTBD?: boolean;
  endDate?: string | null;
  endDateUBD?: boolean;
  endTime?: string | null;
  endTimeTBD?: boolean;
  experienceRequired?: ExperienceRequirement;
  ratingRequired?: StaffRating | 'ANY';
  approveOvertime?: boolean;
  overtimeRate?: number | null;
  overtimeRateType?: AmountType | null;
  payRate?: number | null;
  billRate?: number | null;
  rateType?: RateType | null;
  notes?: string | null;
  expenditure?: boolean;
  expenditureCost?: number | null;
  expenditurePrice?: number | null;
  expenditureAmount?: number | null;
  expenditureAmountType?: AmountType | null;
}

/**
 * Save action type for the assignment form
 */
export type AssignmentSaveAction = 'close' | 'new' | 'repeat';

/**
 * Extended JSON data stored in EventProduct notes field
 */
export interface ProductAssignmentExtendedData {
  description?: string | null;
  instructions?: string | null;
  commission?: boolean;
  commissionAmount?: number | null;
  commissionAmountType?: string | null;
}
