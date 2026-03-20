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
    requirements: true;
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
 * Includes nested services and company relationships
 */
export type StaffSelect = Prisma.StaffGetPayload<{
  select: {
    id: true;
    staffId: true;
    accountStatus: true;
    staffType: true;
    staffRole: true;
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
    companyId: true;
    hasLoginAccess: true;
    userId: true;
    invitationToken: true;
    invitationExpiresAt: true;
    createdBy: true;
    createdAt: true;
    updatedAt: true;
    // Custom fields
    customField1: true;
    customField2: true;
    customField3: true;
    // Documents
    documents: true;
    // Team Details (for TEAM role)
    teamEntityName: true;
    teamEmail: true;
    teamPhone: true;
    teamAddressLine1: true;
    teamAddressLine2: true;
    teamCity: true;
    teamState: true;
    teamZipCode: true;
    services: {
      select: {
        id: true;
        staffId: true;
        serviceId: true;
        assignedAt: true;
        service: {
          select: {
            id: true;
            title: true;
            description: true;
            isActive: true;
            createdAt: true;
            updatedAt: true;
          };
        };
      };
    };
    company: {
      select: {
        id: true;
        staffId: true;
        firstName: true;
        lastName: true;
        teamEntityName: true;
        teamEmail: true;
        teamPhone: true;
      };
    };
    // Team members (for TEAM role)
    teamMembers: {
      select: {
        id: true;
        staffId: true;
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
        staffType: true;
        accountStatus: true;
        services: {
          select: {
            serviceId: true;
            service: {
              select: {
                id: true;
                title: true;
              };
            };
          };
        };
      };
    };
    // Tax details (1:1 relation)
    taxDetails: {
      select: {
        id: true;
        staffId: true;
        taxFilledBy: true;
        taxName: true;
        businessName: true;
        businessStructure: true;
        llcClassification: true;
        exemptPayeeCode: true;
        fatcaExemptionCode: true;
        taxAddress: true;
        taxCity: true;
        taxState: true;
        taxZip: true;
        accountNumbers: true;
        signatureUrl: true;
        certificationDate: true;
        createdAt: true;
        updatedAt: true;
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
    isArchived: true;
    archivedAt: true;
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
    // Billing & Rate Settings
    estimate: true;
    taskRateType: true;
    commission: true;
    commissionAmount: true;
    commissionAmountType: true;
    approveForOvertime: true;
    overtimeRate: true;
    overtimeRateType: true;
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
    callTimes: {
      select: {
        id: true;
        numberOfStaffRequired: true;
        service: {
          select: {
            id: true;
            title: true;
          };
        };
        invitations: {
          select: {
            id: true;
            status: true;
            isConfirmed: true;
            staff: {
              select: {
                id: true;
                firstName: true;
                lastName: true;
              };
            };
          };
        };
      };
    };
  };
}>;

/**
 * Call Time Select Type
 * Used by CallTimeService for all query return types
 * Includes service and event relationships
 */
export type CallTimeSelect = Prisma.CallTimeGetPayload<{
  select: {
    id: true;
    callTimeId: true;
    serviceId: true;
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
    service: {
      select: {
        id: true;
        title: true;
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

export type CallTimeWithDetails = Prisma.CallTimeGetPayload<{
  include: {
    service: true;
    event: {
      select: {
        id: true;
        eventId: true;
        title: true;
        createdBy: true;
        venueName: true;
        city: true;
        state: true;
        latitude: true;
        longitude: true;
        description: true;
        requirements: true;
        preEventInstructions: true;
        privateComments: true;
      };
    };
    invitations: {
      select: {
        id: true;
        staffId: true;
        status: true;
        isConfirmed: true;
      };
    };
  };
}>;

export type CallTimeWithDetailsAndConfirmedCount = CallTimeWithDetails & {
  confirmedCount: number;
};

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
 * Service Select Type
 * Used by ServiceService for all query return types
 */
export type ServiceSelect = Prisma.ServiceGetPayload<{
  select: {
    id: true;
    serviceId: true;
    title: true;
    costUnitType: true;
    description: true;
    cost: true;
    price: true;
    minimum: true;
    expenditure: true;
    expenditureAmount: true;
    expenditureAmountType: true;
    travelInMinimum: true;
    isActive: true;
    createdBy: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

/**
 * Contact Select Type
 * Used by ContactService for all query return types
 */
export type ContactSelect = Prisma.ContactGetPayload<{
  select: {
    id: true;
    contactId: true;
    firstName: true;
    lastName: true;
    email: true;
    phone: true;
    dateOfBirth: true;
    transactionType: true;
    ricsSurveyAccount: true;
    correspondingAddress: true;
    contactSource: true;
    contactType: true;
    createdBy: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

/**
 * Product Select Type
 * Used by ProductService for all query return types
 */
export type ProductSelect = Prisma.ProductGetPayload<{
  select: {
    id: true;
    productId: true;
    title: true;
    description: true;
    priceUnitType: true;
    minimumPurchase: true;
    trackInventory: true;
    supplier: true;
    brand: true;
    category: true;
    cost: true;
    price: true;
    isActive: true;
    createdBy: true;
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
