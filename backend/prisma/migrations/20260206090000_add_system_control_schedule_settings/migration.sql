-- AlterTable
ALTER TABLE "system_control_jobs" ADD COLUMN "scheduleId" TEXT;

-- CreateTable
CREATE TABLE "system_control_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timeOfDay" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "options" TEXT,
    "maxRuntimeSeconds" INTEGER,
    "lastRunAt" DATETIME,
    "lastStatus" TEXT,
    "lastJobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "system_control_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "notifyOnSuccess" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "includeLog" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
