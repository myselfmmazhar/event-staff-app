-- CreateTable
CREATE TABLE "shift_sessions" (
    "id" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "callTimeId" UUID NOT NULL,
    "clockIn" TIMESTAMP(6) NOT NULL,
    "clockOut" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "shift_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_sessions_invitationId_idx" ON "shift_sessions"("invitationId");

-- CreateIndex
CREATE INDEX "shift_sessions_staffId_idx" ON "shift_sessions"("staffId");

-- CreateIndex
CREATE INDEX "shift_sessions_callTimeId_idx" ON "shift_sessions"("callTimeId");

-- AddForeignKey
ALTER TABLE "shift_sessions" ADD CONSTRAINT "shift_sessions_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "call_time_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_sessions" ADD CONSTRAINT "shift_sessions_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_sessions" ADD CONSTRAINT "shift_sessions_callTimeId_fkey" FOREIGN KEY ("callTimeId") REFERENCES "call_times"("id") ON DELETE CASCADE ON UPDATE CASCADE;
