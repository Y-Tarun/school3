-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('Applied', 'Pending', 'Admitted', 'Rejected');

-- CreateEnum
CREATE TYPE "StudentLifecycleStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "ContactClassOfInterest" AS ENUM ('Playway', 'Nursery', 'LKG', 'UKG');

-- CreateEnum
CREATE TYPE "ContactNotificationStatus" AS ENUM ('Pending', 'Sent', 'Failed');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "currentRevisionId" UUID NOT NULL,
    "currentApplicationNumber" VARCHAR(100) NOT NULL,
    "lifecycleStatus" "StudentLifecycleStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_revisions" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "basedOnRevisionId" UUID,
    "applicationNumber" VARCHAR(100) NOT NULL,
    "parentId" UUID,
    "dateOfAdmission" DATE,
    "admissionSoughtIn" VARCHAR(100),
    "class" VARCHAR(100),
    "section" VARCHAR(100),
    "rollNumber" VARCHAR(100),
    "firstName" VARCHAR(200) NOT NULL,
    "surname" VARCHAR(200),
    "nameUsedAtHome" VARCHAR(200),
    "gender" VARCHAR(100),
    "dateOfBirth" DATE,
    "languageSpokenAtHome" VARCHAR(200),
    "address" TEXT,
    "fatherName" VARCHAR(300),
    "fatherEducationQualification" VARCHAR(300),
    "fatherOccupation" VARCHAR(300),
    "fatherMobileNumber" VARCHAR(32),
    "motherName" VARCHAR(300),
    "motherEducationQualification" VARCHAR(300),
    "motherOccupation" VARCHAR(300),
    "motherMobileNumber" VARCHAR(32),
    "previousSchooling" BOOLEAN,
    "previousSchoolingDetails" TEXT,
    "toiletTrained" BOOLEAN,
    "brothersCount" INTEGER,
    "sistersCount" INTEGER,
    "photoLocator" VARCHAR(1024),
    "status" "AdmissionStatus" NOT NULL DEFAULT 'Applied',
    "createdOn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByAdminId" UUID NOT NULL,

    CONSTRAINT "student_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "replacedByTokenId" UUID,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_enquiries" (
    "id" UUID NOT NULL,
    "parentName" VARCHAR(100) NOT NULL,
    "phoneNumber" VARCHAR(32) NOT NULL,
    "classOfInterest" "ContactClassOfInterest" NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationStatus" "ContactNotificationStatus" NOT NULL DEFAULT 'Pending',
    "notificationErrorCode" VARCHAR(100),

    CONSTRAINT "contact_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_currentApplicationNumber_key" ON "students"("currentApplicationNumber");

-- CreateIndex
CREATE INDEX "students_lifecycleStatus_currentApplicationNumber_idx" ON "students"("lifecycleStatus", "currentApplicationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "students_currentRevisionId_id_currentApplicationNumber_key" ON "students"("currentRevisionId", "id", "currentApplicationNumber");

-- CreateIndex
CREATE INDEX "student_revisions_studentId_createdOn_idx" ON "student_revisions"("studentId", "createdOn");

-- CreateIndex
CREATE INDEX "student_revisions_createdByAdminId_idx" ON "student_revisions"("createdByAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "student_revisions_studentId_revisionNumber_key" ON "student_revisions"("studentId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "student_revisions_id_studentId_key" ON "student_revisions"("id", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_revisions_id_studentId_applicationNumber_key" ON "student_revisions"("id", "studentId", "applicationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replacedByTokenId_key" ON "refresh_tokens"("replacedByTokenId");

-- CreateIndex
CREATE INDEX "refresh_tokens_adminId_expiresAt_idx" ON "refresh_tokens"("adminId", "expiresAt");

-- CreateIndex
CREATE INDEX "contact_enquiries_createdAt_idx" ON "contact_enquiries"("createdAt");

-- CreateIndex
CREATE INDEX "contact_enquiries_notificationStatus_createdAt_idx" ON "contact_enquiries"("notificationStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_currentRevisionId_id_currentApplicationNumber_fkey" FOREIGN KEY ("currentRevisionId", "id", "currentApplicationNumber") REFERENCES "student_revisions"("id", "studentId", "applicationNumber") ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;

-- AddForeignKey
ALTER TABLE "student_revisions" ADD CONSTRAINT "student_revisions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_revisions" ADD CONSTRAINT "student_revisions_basedOnRevisionId_studentId_fkey" FOREIGN KEY ("basedOnRevisionId", "studentId") REFERENCES "student_revisions"("id", "studentId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_revisions" ADD CONSTRAINT "student_revisions_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replacedByTokenId_fkey" FOREIGN KEY ("replacedByTokenId") REFERENCES "refresh_tokens"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Counts, revision ordering, and lineage have domain-level bounds.
ALTER TABLE "student_revisions"
    ADD CONSTRAINT "student_revisions_brothersCount_nonnegative" CHECK ("brothersCount" IS NULL OR "brothersCount" >= 0),
    ADD CONSTRAINT "student_revisions_sistersCount_nonnegative" CHECK ("sistersCount" IS NULL OR "sistersCount" >= 0),
    ADD CONSTRAINT "student_revisions_revisionNumber_positive" CHECK ("revisionNumber" > 0),
    ADD CONSTRAINT "student_revisions_basedOn_not_self" CHECK ("basedOnRevisionId" IS NULL OR "basedOnRevisionId" <> "id");
