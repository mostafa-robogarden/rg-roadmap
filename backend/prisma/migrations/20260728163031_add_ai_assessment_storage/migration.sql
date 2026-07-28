/*
  Warnings:

  - A unique constraint covering the columns `[savedRoadmapId,publicLessonId]` on the table `SavedMilestone` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AiGenerationKind" AS ENUM ('QUESTIONNAIRE', 'ROADMAP');

-- CreateEnum
CREATE TYPE "RoadmapGenerationSource" AS ENUM ('AI', 'RULE_BASED_FALLBACK');

-- CreateEnum
CREATE TYPE "LessonProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "learnerGoal" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "targetMonths" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "weeklyHours" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "SavedMilestone" ADD COLUMN     "children" JSONB,
ADD COLUMN     "lessonOrder" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "moduleDescription" TEXT,
ADD COLUMN     "moduleId" TEXT NOT NULL DEFAULT 'legacy_module',
ADD COLUMN     "moduleName" TEXT NOT NULL DEFAULT 'Roadmap',
ADD COLUMN     "moduleOrder" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "publicLessonId" TEXT,
ADD COLUMN     "status" "LessonProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "xpReward" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SavedRoadmap" ADD COLUMN     "roadmapJson" JSONB,
ADD COLUMN     "source" "RoadmapGenerationSource" NOT NULL DEFAULT 'RULE_BASED_FALLBACK',
ADD COLUMN     "summary" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "AssessmentOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "kind" "AiGenerationKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "draftPayload" JSONB,
    "finalPayload" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentQuestion_assessmentId_idx" ON "AssessmentQuestion"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_sortOrder_key" ON "AssessmentQuestion"("assessmentId", "sortOrder");

-- CreateIndex
CREATE INDEX "AssessmentOption_questionId_idx" ON "AssessmentOption"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentOption_questionId_sortOrder_key" ON "AssessmentOption"("questionId", "sortOrder");

-- CreateIndex
CREATE INDEX "AssessmentResponse_assessmentId_idx" ON "AssessmentResponse"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentResponse_questionId_idx" ON "AssessmentResponse"("questionId");

-- CreateIndex
CREATE INDEX "AssessmentResponse_optionId_idx" ON "AssessmentResponse"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResponse_assessmentId_questionId_key" ON "AssessmentResponse"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "AiGeneration_kind_createdAt_idx" ON "AiGeneration"("kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiGeneration_assessmentId_kind_key" ON "AiGeneration"("assessmentId", "kind");

-- CreateIndex
CREATE INDEX "Assessment_trackId_startedAt_idx" ON "Assessment"("trackId", "startedAt");

-- CreateIndex
CREATE INDEX "AssessmentAnswer_assessmentId_idx" ON "AssessmentAnswer"("assessmentId");

-- CreateIndex
CREATE INDEX "SavedMilestone_savedRoadmapId_moduleOrder_lessonOrder_idx" ON "SavedMilestone"("savedRoadmapId", "moduleOrder", "lessonOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SavedMilestone_savedRoadmapId_publicLessonId_key" ON "SavedMilestone"("savedRoadmapId", "publicLessonId");

-- CreateIndex
CREATE INDEX "SavedRoadmap_trackId_idx" ON "SavedRoadmap"("trackId");

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentOption" ADD CONSTRAINT "AssessmentOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AssessmentOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
