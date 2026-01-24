import type { Prisma } from '@prisma/client';

/**
 * Prisma Type Utilities
 *
 * This file defines all service return types using Prisma.ModelGetPayload.
 * This ensures types stay in sync with the database schema and provides
 * a single source of truth for type definitions.
 */

/**
 * Client Location Select Type
 */
export type ClientLocationSelect = Prisma.ClientLocationGetPayload<{
  select: {
    id: true;
    venueName: true;
    meetingPoint: true;
    venueAddress: true;
    city: true;
    state: true;
    zipCode: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

/**
 * Client Select Type
 * Used by ClientService for all query return types
 */
export type ClientSelect = Prisma.ClientGetPayload<{
  select: {
    id: true;
    clientId: true;
    businessName: true;
    firstName: true;
    lastName: true;
    email: true;
    cellPhone: true;
    businessPhone: true;
    details: true;
    businessAddress: true;
    city: true;
    state: true;
    zipCode: true;
    ccEmail: true;
    billingFirstName: true;
    billingLastName: true;
    billingEmail: true;
    billingPhone: true;
    hasLoginAccess: true;
    userId: true;
    invitationToken: true;
    invitationExpiresAt: true;
    createdBy: true;
    createdAt: true;
    updatedAt: true;
    locations: {
      select: {
        id: true;
        venueName: true;
        meetingPoint: true;
        venueAddress: true;
        city: true;
        state: true;
        zipCode: true;
        createdAt: true;
        updatedAt: true;
      };
    };
  };
}>;

/**
 * Staff Select Type
 * Used by StaffService for all query return types
 * Includes nested positions and contractor relationships
 */
export type StaffSelect = Prisma.StaffGetPayload<{
  select: {
    id: true;
    staffId: true;
    accountStatus: true;
    staffType: true;
    firstName: true;
    lastName: true;
    phone: true;
    email: true;
    dateOfBirth: true;
    skillLevel: true;
    availabilityStatus: true;
    timeOffStart: true;
    timeOffEnd: true;
    streetAddress: true;
    aptSuiteUnit: true;
    city: true;
    country: true;
    state: true;
    zipCode: true;
    experience: true;
    staffRating: true;
    internalNotes: true;
    contractorId: true;
    hasLoginAccess: true;
    userId: true;
    invitationToken: true;
    invitationExpiresAt: true;
    createdBy: true;
    createdAt: true;
    updatedAt: true;
    positions: {
      select: {
        id: true;
        staffId: true;
        positionId: true;
        assignedAt: true;
        position: {
          select: {
            id: true;
            name: true;
            description: true;
            isActive: true;
            createdAt: true;
            updatedAt: true;
          };
        };
      };
    };
    contractor: {
      select: {
        id: true;
        staffId: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

/**
 * Event Select Type
 * Used by EventService for all query return types
 * Includes client relationship
 */
export type EventSelect = Prisma.EventGetPayload<{
  select: {
    id: true;
    eventId: true;
    title: true;
    description: true;
    requirements: true;
    privateComments: true;
    venueName: true;
    address: true;
    city: true;
    state: true;
    zipCode: true;
    startDate: true;
    startTime: true;
    endDate: true;
    endTime: true;
    timezone: true;
    status: true;
    fileLinks: true;
    // Request Information
    requestMethod: true;
    requestorName: true;
    requestorPhone: true;
    requestorEmail: true;
    poNumber: true;
    // Event Instructions & Documents
    preEventInstructions: true;
    eventDocuments: true;
    // Onsite Contact & Meeting Point
    meetingPoint: true;
    onsitePocName: true;
    onsitePocPhone: true;
    onsitePocEmail: true;
    createdBy: true;
    clientId: true;
    createdAt: true;
    updatedAt: true;
    client: {
      select: {
        id: true;
        clientId: true;
        businessName: true;
        firstName: true;
        lastName: true;
        email: true;
      };
    };
  };
}>;

/**
 * Call Time Select Type
 * Used by CallTimeService for all query return types
 * Includes position and event relationships
 */
export type CallTimeSelect = Prisma.CallTimeGetPayload<{
  select: {
    id: true;
    callTimeId: true;
    positionId: true;
    numberOfStaffRequired: true;
    skillLevel: true;
    startDate: true;
    startTime: true;
    endDate: true;
    endTime: true;
    payRate: true;
    payRateType: true;
    billRate: true;
    billRateType: true;
    notes: true;
    eventId: true;
    createdAt: true;
    updatedAt: true;
    position: {
      select: {
        id: true;
        name: true;
        description: true;
        isActive: true;
      };
    };
    event: {
      select: {
        id: true;
        eventId: true;
        title: true;
        startDate: true;
        startTime: true;
        endDate: true;
        endTime: true;
        timezone: true;
        status: true;
      };
    };
    _count: {
      select: {
        invitations: true;
      };
    };
  };
}>;

/**
 * User Select Type
 * Used by UserService for all query return types
 */
export type UserSelect = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    emailVerified: true;
    name: true;
    firstName: true;
    lastName: true;
    role: true;
    isActive: true;
    phone: true;
    profilePhoto: true;
    lastLoginAt: true;
    invitationToken: true;
    invitationExpiresAt: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

/**
 * Staff Position Select Type
 * Used by SettingsService for position queries
 */
export type StaffPositionSelect = Prisma.StaffPositionGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    isActive: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

/**
 * Generic Paginated Response Type
 * Used across all services for paginated queries
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
