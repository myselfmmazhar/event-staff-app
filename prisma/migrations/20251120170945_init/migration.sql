/*
  Warnings:

  - You are about to drop the column `budget` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `clientEmail` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `clientName` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `clientPhone` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `eventType` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `specialInstructions` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `venueAddress` on the `events` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventId]` on the table `events` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `room` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timezone` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `events` table without a default value. This is not possible if the table is not empty.
  - Made the column `venueName` on table `events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `city` on table `events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `state` on table `events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `zipCode` on table `events` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CLIENT';

-- AlterTable
ALTER TABLE "events" DROP COLUMN "budget",
DROP COLUMN "clientEmail",
DROP COLUMN "clientName",
DROP COLUMN "clientPhone",
DROP COLUMN "country",
DROP COLUMN "eventType",
DROP COLUMN "name",
DROP COLUMN "specialInstructions",
DROP COLUMN "venueAddress",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "clientId" UUID,
ADD COLUMN     "dailyDigestMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dressCode" TEXT,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "eventId" TEXT NOT NULL,
ADD COLUMN     "fileLinks" JSONB,
ADD COLUMN     "privateComments" TEXT,
ADD COLUMN     "requireStaff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "room" TEXT NOT NULL,
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "startDate" SET DATA TYPE DATE,
ALTER COLUMN "endDate" SET DATA TYPE DATE,
ALTER COLUMN "venueName" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "state" SET NOT NULL,
ALTER COLUMN "zipCode" SET NOT NULL;

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
    "venueName" TEXT,
    "room" TEXT,
    "streetAddress" TEXT NOT NULL,
    "aptSuiteUnit" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "hasLoginAccess" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_clientId_key" ON "clients"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_userId_key" ON "clients"("userId");

-- CreateIndex
CREATE INDEX "clients_createdBy_idx" ON "clients"("createdBy");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_clientId_idx" ON "clients"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "events_eventId_key" ON "events"("eventId");

-- CreateIndex
CREATE INDEX "events_clientId_idx" ON "events"("clientId");

-- CreateIndex
CREATE INDEX "events_eventId_idx" ON "events"("eventId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
