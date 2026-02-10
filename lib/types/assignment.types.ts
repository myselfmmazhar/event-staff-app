/**
 * Assignment Types
 *
 * Type definitions for the event assignment system.
 * Assignments can be either Product or Service based.
 */

import type { CostUnitType, PriceUnitType, ExperienceRequirement, StaffRating } from '@prisma/client';

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
  /** Custom cost override (null = use base cost from product/service) */
  customCost: number | null;
  /** Custom price override (null = use base price from product/service) */
  customPrice: number | null;
  /** Cost/price unit type label */
  costUnitType: string | null;
  /** Whether commission applies to this assignment */
  commission: boolean;
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
  /** Assignment start time (HH:MM format) */
  startTime: string | null;
  /** Assignment end date (YYYY-MM-DD format) */
  endDate: string | null;
  /** Assignment end time (HH:MM format) */
  endTime: string | null;
  /** Required experience level */
  experienceRequired: ExperienceRequirement;
  /** Required rating level */
  ratingRequired: StaffRating | 'ANY';
  /** Whether overtime is approved */
  approveOvertime: boolean;
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
  customCost: number | null;
  customPrice: number | null;
  costUnitType: string | null;
  commission: boolean;
  // Product-specific
  description?: string | null;
  instructions?: string | null;
  // Service-specific
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  experienceRequired?: ExperienceRequirement;
  ratingRequired?: StaffRating | 'ANY';
  approveOvertime?: boolean;
}

/**
 * Save action type for the assignment form
 */
export type AssignmentSaveAction = 'close' | 'new' | 'repeat';

/**
 * Extended JSON data stored in EventService notes field
 */
export interface ServiceAssignmentExtendedData {
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  experienceRequired?: ExperienceRequirement;
  ratingRequired?: StaffRating | 'ANY';
  approveOvertime?: boolean;
  commission?: boolean;
}

/**
 * Extended JSON data stored in EventProduct notes field
 */
export interface ProductAssignmentExtendedData {
  description?: string | null;
  instructions?: string | null;
  commission?: boolean;
}
