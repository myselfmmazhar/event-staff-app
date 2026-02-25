-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('EMAIL', 'SMS', 'MESSAGE');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED', 'PENDING', 'TERMINATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('OPEN_TO_OFFERS', 'BUSY', 'TIME_OFF');

-- CreateEnum
CREATE TYPE "CallTimeInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('STAFF_INVITATION', 'CLIENT_INVITATION', 'CALL_TIME_INVITATION', 'CALL_TIME_CONFIRMATION', 'CALL_TIME_WAITLISTED', 'STAFF_CREDENTIALS', 'USER_INVITATION');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestMethod" AS ENUM ('EMAIL', 'TEXT_SMS', 'PHONE_CALL');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CALL_TIME_INVITATION', 'INVITATION_RESPONSE', 'INVITATION_CONFIRMED', 'WAITLIST_UPDATE', 'EVENT_UPDATE', 'EVENT_CANCELLED', 'SHIFT_REMINDER', 'STAFF_INVITATION', 'GENERAL');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('PER_HOUR', 'PER_SHIFT', 'PER_DAY', 'PER_EVENT');

-- CreateEnum
CREATE TYPE "AmountType" AS ENUM ('MULTIPLIER', 'FIXED');

-- CreateEnum
CREATE TYPE "CostUnitType" AS ENUM ('HOURLY', 'ASSIGNMENT', 'SHIFT', 'DAY', 'JOB');

-- CreateEnum
CREATE TYPE "PriceUnitType" AS ENUM ('UNIT', 'PACK', 'WEIGHT');

-- CreateEnum
CREATE TYPE "ExperienceRequirement" AS ENUM ('ANY', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "MinimumPurchase" AS ENUM ('ANY', 'ONE', 'TWO_TO_FIVE', 'SIX_TO_TEN');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "SmsTemplateType" AS ENUM ('STAFF_INVITATION', 'CLIENT_INVITATION', 'CALL_TIME_INVITATION', 'CALL_TIME_CONFIRMATION', 'CALL_TIME_WAITLISTED', 'STAFF_CREDENTIALS', 'USER_INVITATION');

-- CreateEnum
CREATE TYPE "StaffRating" AS ENUM ('NA', 'A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('EMPLOYEE', 'CONTRACTOR', 'COMPANY', 'FREELANCE');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('INDIVIDUAL', 'TEAM');

-- CreateEnum
CREATE TYPE "BusinessStructure" AS ENUM ('INDIVIDUAL', 'LLC', 'CORPORATION', 'PARTNERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'CLIENT');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('AMOUNT', 'PERCENT');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(6),
    "password" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_time_invitations" (
    "id" UUID NOT NULL,
    "callTimeId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "status" "CallTimeInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(6),
    "declineReason" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "call_time_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_times" (
    "id" UUID NOT NULL,
    "callTimeId" TEXT NOT NULL,
    "serviceId" UUID,
    "numberOfStaffRequired" INTEGER NOT NULL DEFAULT 1,
    "skillLevel" "SkillLevel" NOT NULL DEFAULT 'BEGINNER',
    "startDate" DATE,
    "startTime" TEXT,
    "endDate" DATE,
    "endTime" TEXT,
    "payRate" DECIMAL(10,2) NOT NULL,
    "payRateType" "RateType" NOT NULL,
    "billRate" DECIMAL(10,2) NOT NULL,
    "billRateType" "RateType" NOT NULL,
    "notes" TEXT,
    "eventId" UUID NOT NULL,
    "customCost" DECIMAL(10,2),
    "customPrice" DECIMAL(10,2),
    "ratingRequired" "StaffRating",
    "approveOvertime" BOOLEAN NOT NULL DEFAULT false,
    "commission" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "call_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cellPhone" TEXT NOT NULL,
    "businessPhone" TEXT,
    "details" TEXT,
    "requirements" TEXT,
    "businessAddress" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "ccEmail" TEXT,
    "billingFirstName" TEXT,
    "billingLastName" TEXT,
    "billingEmail" TEXT,
    "billingPhone" TEXT,
    "hasLoginAccess" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "invitationExpiresAt" TIMESTAMP(6),
    "invitationToken" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_locations" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "venueName" VARCHAR(200) NOT NULL,
    "meetingPoint" VARCHAR(300),
    "venueAddress" VARCHAR(300) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(50) NOT NULL,
    "zipCode" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "client_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_branding_settings" (
    "id" UUID NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#667eea',
    "secondaryColor" TEXT NOT NULL DEFAULT '#764ba2',
    "buttonStyle" TEXT NOT NULL DEFAULT 'gradient',
    "buttonBorderRadius" TEXT NOT NULL DEFAULT '8px',
    "fontFamily" TEXT NOT NULL DEFAULT 'system-ui',
    "headerBackground" TEXT NOT NULL DEFAULT 'gradient',
    "footerText" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "email_branding_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "type" "EmailTemplateType" NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "privateComments" TEXT,
    "venueName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "startDate" DATE,
    "startTime" TEXT,
    "endDate" DATE,
    "endTime" TEXT,
    "timezone" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "fileLinks" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(6),
    "requestMethod" "RequestMethod",
    "requestorName" VARCHAR(200),
    "requestorPhone" VARCHAR(50),
    "requestorEmail" VARCHAR(255),
    "poNumber" VARCHAR(100),
    "preEventInstructions" TEXT,
    "eventDocuments" JSONB,
    "customFields" JSONB,
    "meetingPoint" VARCHAR(300),
    "onsitePocName" VARCHAR(200),
    "onsitePocPhone" VARCHAR(50),
    "onsitePocEmail" VARCHAR(255),
    "estimate" BOOLEAN,
    "taskRateType" "AmountType",
    "commission" BOOLEAN,
    "commissionAmount" DECIMAL(10,2),
    "commissionAmountType" "AmountType",
    "approveForOvertime" BOOLEAN,
    "overtimeRate" DECIMAL(10,2),
    "overtimeRateType" "AmountType",
    "createdBy" TEXT NOT NULL,
    "clientId" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "geocodedAt" TIMESTAMP(6),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "title" VARCHAR(200),
    "eventDescription" TEXT,
    "requirements" VARCHAR(200),
    "privateComments" TEXT,
    "venueName" VARCHAR(200),
    "address" VARCHAR(300),
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "zipCode" VARCHAR(20),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "startDate" DATE,
    "startTime" VARCHAR(5),
    "endDate" DATE,
    "endTime" VARCHAR(5),
    "timezone" VARCHAR(50),
    "fileLinks" JSONB,
    "requestMethod" "RequestMethod",
    "requestorName" VARCHAR(200),
    "requestorPhone" VARCHAR(50),
    "requestorEmail" VARCHAR(255),
    "poNumber" VARCHAR(100),
    "preEventInstructions" TEXT,
    "eventDocuments" JSONB,
    "customFields" JSONB,
    "meetingPoint" VARCHAR(300),
    "onsitePocName" VARCHAR(200),
    "onsitePocPhone" VARCHAR(50),
    "onsitePocEmail" VARCHAR(255),
    "clientId" UUID,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "event_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "serviceId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "costUnitType" "CostUnitType",
    "description" VARCHAR(1000),
    "cost" DECIMAL(10,2),
    "price" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "productId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "priceUnitType" "PriceUnitType" NOT NULL DEFAULT 'UNIT',
    "minimumPurchase" "MinimumPurchase",
    "trackInventory" BOOLEAN NOT NULL DEFAULT false,
    "supplier" VARCHAR(200),
    "brand" VARCHAR(200),
    "category" VARCHAR(200),
    "cost" DECIMAL(10,2),
    "price" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_products" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "customPrice" DECIMAL(10,2),
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "event_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailCallTimeInvitations" BOOLEAN NOT NULL DEFAULT true,
    "emailEventUpdates" BOOLEAN NOT NULL DEFAULT true,
    "emailShiftReminders" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" UUID,
    "batchKey" TEXT,
    "batchCount" INTEGER NOT NULL DEFAULT 1,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(6),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" UUID NOT NULL,
    "staffTermSingular" TEXT NOT NULL DEFAULT 'Staff',
    "staffTermPlural" TEXT NOT NULL DEFAULT 'Staff',
    "eventTermSingular" TEXT NOT NULL DEFAULT 'Event',
    "eventTermPlural" TEXT NOT NULL DEFAULT 'Events',
    "roleTermSingular" TEXT NOT NULL DEFAULT 'Role',
    "roleTermPlural" TEXT NOT NULL DEFAULT 'Roles',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "globalLabels" JSONB NOT NULL DEFAULT '{}',
    "pageLabels" JSONB NOT NULL DEFAULT '{}',
    "companyAddress" TEXT,
    "companyLogoUrl" TEXT,
    "companyName" TEXT,
    "companyPhone" TEXT,
    "companyTagline" TEXT,
    "companyWebsite" TEXT,
    "companyTimezone" TEXT NOT NULL DEFAULT 'UTC',

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smtp_configurations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "user" TEXT NOT NULL,
    "pass" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "security" TEXT NOT NULL DEFAULT 'TLS',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "smtp_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messaging_configurations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'BIRD',
    "apiKey" TEXT NOT NULL,
    "workspaceId" TEXT,
    "channelId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "messaging_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" UUID NOT NULL,
    "type" "MessageType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "senderId" TEXT NOT NULL,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "fileLinks" JSONB,
    "metadata" JSONB,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "contactId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ricsSurveyAccount" BOOLEAN DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "contactSource" TEXT,
    "contactType" TEXT,
    "correspondingAddress" TEXT,
    "dateOfBirth" DATE,
    "transactionType" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_templates" (
    "id" UUID NOT NULL,
    "type" "SmsTemplateType" NOT NULL,
    "body" TEXT NOT NULL,
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "staffId" TEXT NOT NULL,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "staffType" "StaffType" NOT NULL DEFAULT 'EMPLOYEE',
    "staffRole" "StaffRole" NOT NULL DEFAULT 'INDIVIDUAL',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "skillLevel" "SkillLevel" NOT NULL DEFAULT 'BEGINNER',
    "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'OPEN_TO_OFFERS',
    "timeOffStart" DATE,
    "timeOffEnd" DATE,
    "streetAddress" TEXT NOT NULL DEFAULT '',
    "aptSuiteUnit" TEXT,
    "city" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "zipCode" TEXT NOT NULL DEFAULT '',
    "experience" TEXT,
    "staffRating" "StaffRating" NOT NULL DEFAULT 'NA',
    "internalNotes" TEXT,
    "invitationToken" TEXT,
    "invitationExpiresAt" TIMESTAMP(6),
    "hasLoginAccess" BOOLEAN NOT NULL DEFAULT false,
    "companyId" UUID,
    "userId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "customField1" TEXT,
    "customField2" TEXT,
    "customField3" TEXT,
    "documents" JSONB,
    "teamEntityName" TEXT,
    "teamEmail" TEXT,
    "teamPhone" TEXT,
    "teamAddressLine1" TEXT,
    "teamAddressLine2" TEXT,
    "teamCity" TEXT,
    "teamState" TEXT,
    "teamZipCode" TEXT,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_service_assignments" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_service_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_tax_details" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "collectTaxDetails" BOOLEAN NOT NULL DEFAULT false,
    "trackFor1099" BOOLEAN NOT NULL DEFAULT false,
    "businessStructure" "BusinessStructure" NOT NULL DEFAULT 'INDIVIDUAL',
    "businessName" TEXT,
    "ssn" TEXT,
    "ein" TEXT,
    "identificationFrontUrl" TEXT,
    "identificationBackUrl" TEXT,
    "electronic1099Consent" BOOLEAN NOT NULL DEFAULT false,
    "signatureUrl" TEXT,
    "consentDate" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "staff_tax_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "profilePhoto" TEXT,
    "lastLoginAt" TIMESTAMP(6),
    "invitationToken" TEXT,
    "invitationExpiresAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "clientId" UUID NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceDate" DATE NOT NULL,
    "dueDate" DATE,
    "terms" TEXT,
    "customField1" TEXT,
    "customField2" TEXT,
    "customField3" TEXT,
    "discountType" "DiscountType",
    "discountValue" DECIMAL(10,2),
    "depositAmount" DECIMAL(10,2),
    "shippingAmount" DECIMAL(10,2),
    "salesTaxAmount" DECIMAL(10,2),
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "paymentDetails" TEXT,
    "fileLinks" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(6),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "date" DATE,
    "productId" UUID,
    "serviceId" UUID,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimates" (
    "id" UUID NOT NULL,
    "estimateNo" TEXT NOT NULL,
    "clientId" UUID NOT NULL,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "estimateDate" DATE NOT NULL,
    "expirationDate" DATE,
    "approvedBy" TEXT,
    "approvedDate" DATE,
    "terms" TEXT,
    "customField1" TEXT,
    "customField2" TEXT,
    "customField3" TEXT,
    "discountType" "DiscountType",
    "discountValue" DECIMAL(10,2),
    "depositAmount" DECIMAL(10,2),
    "shippingAmount" DECIMAL(10,2),
    "salesTaxAmount" DECIMAL(10,2),
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "paymentDetails" TEXT,
    "fileLinks" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(6),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_items" (
    "id" UUID NOT NULL,
    "estimateId" UUID NOT NULL,
    "date" DATE,
    "productId" UUID,
    "serviceId" UUID,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "estimate_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "call_time_invitations_callTimeId_idx" ON "call_time_invitations"("callTimeId");

-- CreateIndex
CREATE INDEX "call_time_invitations_staffId_idx" ON "call_time_invitations"("staffId");

-- CreateIndex
CREATE INDEX "call_time_invitations_status_idx" ON "call_time_invitations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "call_time_invitations_callTimeId_staffId_key" ON "call_time_invitations"("callTimeId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "call_times_callTimeId_key" ON "call_times"("callTimeId");

-- CreateIndex
CREATE INDEX "call_times_callTimeId_idx" ON "call_times"("callTimeId");

-- CreateIndex
CREATE INDEX "call_times_eventId_idx" ON "call_times"("eventId");

-- CreateIndex
CREATE INDEX "call_times_serviceId_idx" ON "call_times"("serviceId");

-- CreateIndex
CREATE INDEX "call_times_startDate_idx" ON "call_times"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "clients_clientId_key" ON "clients"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_userId_key" ON "clients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_invitationToken_key" ON "clients"("invitationToken");

-- CreateIndex
CREATE INDEX "clients_clientId_idx" ON "clients"("clientId");

-- CreateIndex
CREATE INDEX "clients_createdBy_idx" ON "clients"("createdBy");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "client_locations_clientId_idx" ON "client_locations"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_type_key" ON "email_templates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "events_eventId_key" ON "events"("eventId");

-- CreateIndex
CREATE INDEX "events_clientId_idx" ON "events"("clientId");

-- CreateIndex
CREATE INDEX "events_createdBy_idx" ON "events"("createdBy");

-- CreateIndex
CREATE INDEX "events_eventId_idx" ON "events"("eventId");

-- CreateIndex
CREATE INDEX "events_startDate_idx" ON "events"("startDate");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_isArchived_idx" ON "events"("isArchived");

-- CreateIndex
CREATE INDEX "event_templates_createdBy_idx" ON "event_templates"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "services_serviceId_key" ON "services"("serviceId");

-- CreateIndex
CREATE INDEX "services_serviceId_idx" ON "services"("serviceId");

-- CreateIndex
CREATE INDEX "services_title_idx" ON "services"("title");

-- CreateIndex
CREATE INDEX "services_isActive_idx" ON "services"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "products_productId_key" ON "products"("productId");

-- CreateIndex
CREATE INDEX "products_productId_idx" ON "products"("productId");

-- CreateIndex
CREATE INDEX "products_title_idx" ON "products"("title");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "products"("isActive");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "event_products_eventId_idx" ON "event_products"("eventId");

-- CreateIndex
CREATE INDEX "event_products_productId_idx" ON "event_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "event_products_eventId_productId_key" ON "event_products"("eventId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notifications_batchKey_userId_idx" ON "notifications"("batchKey", "userId");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_isArchived_idx" ON "notifications"("userId", "isRead", "isArchived");

-- CreateIndex
CREATE INDEX "communication_logs_senderId_idx" ON "communication_logs"("senderId");

-- CreateIndex
CREATE INDEX "communication_logs_type_idx" ON "communication_logs"("type");

-- CreateIndex
CREATE INDEX "communication_logs_status_idx" ON "communication_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_contactId_key" ON "contacts"("contactId");

-- CreateIndex
CREATE INDEX "contacts_createdBy_idx" ON "contacts"("createdBy");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sms_templates_type_key" ON "sms_templates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "staff_staffId_key" ON "staff"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitationToken_key" ON "staff"("invitationToken");

-- CreateIndex
CREATE UNIQUE INDEX "staff_userId_key" ON "staff"("userId");

-- CreateIndex
CREATE INDEX "staff_accountStatus_idx" ON "staff"("accountStatus");

-- CreateIndex
CREATE INDEX "staff_availabilityStatus_idx" ON "staff"("availabilityStatus");

-- CreateIndex
CREATE INDEX "staff_companyId_idx" ON "staff"("companyId");

-- CreateIndex
CREATE INDEX "staff_createdBy_idx" ON "staff"("createdBy");

-- CreateIndex
CREATE INDEX "staff_email_idx" ON "staff"("email");

-- CreateIndex
CREATE INDEX "staff_staffId_idx" ON "staff"("staffId");

-- CreateIndex
CREATE INDEX "staff_staffRole_idx" ON "staff"("staffRole");

-- CreateIndex
CREATE INDEX "staff_service_assignments_serviceId_idx" ON "staff_service_assignments"("serviceId");

-- CreateIndex
CREATE INDEX "staff_service_assignments_staffId_idx" ON "staff_service_assignments"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_service_assignments_staffId_serviceId_key" ON "staff_service_assignments"("staffId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_tax_details_staffId_key" ON "staff_tax_details"("staffId");

-- CreateIndex
CREATE INDEX "staff_tax_details_staffId_idx" ON "staff_tax_details"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_invitationToken_key" ON "users"("invitationToken");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_identifier_value_key" ON "verifications"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNo_key" ON "invoices"("invoiceNo");

-- CreateIndex
CREATE INDEX "invoices_clientId_idx" ON "invoices"("clientId");

-- CreateIndex
CREATE INDEX "invoices_invoiceNo_idx" ON "invoices"("invoiceNo");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_createdBy_idx" ON "invoices"("createdBy");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_items_productId_idx" ON "invoice_items"("productId");

-- CreateIndex
CREATE INDEX "invoice_items_serviceId_idx" ON "invoice_items"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "estimates_estimateNo_key" ON "estimates"("estimateNo");

-- CreateIndex
CREATE INDEX "estimates_clientId_idx" ON "estimates"("clientId");

-- CreateIndex
CREATE INDEX "estimates_estimateNo_idx" ON "estimates"("estimateNo");

-- CreateIndex
CREATE INDEX "estimates_status_idx" ON "estimates"("status");

-- CreateIndex
CREATE INDEX "estimates_createdBy_idx" ON "estimates"("createdBy");

-- CreateIndex
CREATE INDEX "estimate_items_estimateId_idx" ON "estimate_items"("estimateId");

-- CreateIndex
CREATE INDEX "estimate_items_productId_idx" ON "estimate_items"("productId");

-- CreateIndex
CREATE INDEX "estimate_items_serviceId_idx" ON "estimate_items"("serviceId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_time_invitations" ADD CONSTRAINT "call_time_invitations_callTimeId_fkey" FOREIGN KEY ("callTimeId") REFERENCES "call_times"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_time_invitations" ADD CONSTRAINT "call_time_invitations_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_times" ADD CONSTRAINT "call_times_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_times" ADD CONSTRAINT "call_times_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_locations" ADD CONSTRAINT "client_locations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_templates" ADD CONSTRAINT "event_templates_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_templates" ADD CONSTRAINT "event_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_products" ADD CONSTRAINT "event_products_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_products" ADD CONSTRAINT "event_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_service_assignments" ADD CONSTRAINT "staff_service_assignments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_service_assignments" ADD CONSTRAINT "staff_service_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_tax_details" ADD CONSTRAINT "staff_tax_details_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

