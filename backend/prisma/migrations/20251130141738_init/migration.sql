-- CreateTable
CREATE TABLE "system_control_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "command" TEXT NOT NULL,
    "options" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processId" INTEGER,
    "outputLog" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME
);
