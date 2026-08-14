/*
  Warnings:

  - You are about to drop the column `company` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `Outreach` table. All the data in the column will be lost.
  - You are about to drop the `Employee` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[fileName]` on the table `Resume` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rawJobdata` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `Resume` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Employee" DROP CONSTRAINT "Employee_jobId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Outreach" DROP CONSTRAINT "Outreach_employeeId_fkey";

-- AlterTable
ALTER TABLE "public"."Job" DROP COLUMN "company",
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "dateposted" TEXT,
ADD COLUMN     "experienceRequired" TEXT,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "jobdescription" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "qualifications" TEXT,
ADD COLUMN     "rawJobdata" JSONB NOT NULL,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "skills" TEXT,
ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Outreach" DROP COLUMN "employeeId",
ADD COLUMN     "messageCount" INTEGER;

-- AlterTable
ALTER TABLE "public"."Resume" ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "linkedinAccessToken" TEXT,
ADD COLUMN     "linkedinCookieUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "linkedinJsessionId" TEXT,
ADD COLUMN     "linkedinLiAt" TEXT;

-- DropTable
DROP TABLE "public"."Employee";

-- CreateTable
CREATE TABLE "public"."SkillsMatcher" (
    "id" TEXT NOT NULL,
    "matchingSkills" TEXT NOT NULL,
    "fitScore" TEXT NOT NULL,
    "alignmentSummary" TEXT NOT NULL,
    "referralTalkingPoints" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillsMatcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "cronExpression" TEXT NOT NULL DEFAULT '0 9 * * *',
    "connectionData" TEXT[],
    "targetCompany" TEXT NOT NULL,
    "maxConnections" INTEGER NOT NULL DEFAULT 10,
    "connectionNote" TEXT,
    "nodesJson" JSONB,
    "edgesJson" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resume_fileName_key" ON "public"."Resume"("fileName");

-- AddForeignKey
ALTER TABLE "public"."SkillsMatcher" ADD CONSTRAINT "SkillsMatcher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Workflow" ADD CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
