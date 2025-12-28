-- CreateTable
CREATE TABLE "audio_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "displayName" TEXT,
    "category" TEXT NOT NULL DEFAULT 'BGM',
    "sampleRate" INTEGER,
    "channels" INTEGER,
    "duration" REAL,
    "bitrate" INTEGER,
    "encoding" TEXT,
    "sourcePath" TEXT NOT NULL,
    "outputPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "streamCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "convertedAt" DATETIME
);

-- CreateTable
CREATE TABLE "audio_streams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audioFileId" TEXT NOT NULL,
    "streamIndex" INTEGER NOT NULL,
    "name" TEXT,
    "duration" REAL,
    "sampleRate" INTEGER,
    "channels" INTEGER,
    "outputPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "convertedAt" DATETIME,
    CONSTRAINT "audio_streams_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "audio_files" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversion_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'SINGLE_FILE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourcePath" TEXT NOT NULL,
    "targetPath" TEXT NOT NULL,
    "options" TEXT,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "processedFiles" INTEGER NOT NULL DEFAULT 0,
    "failedFiles" INTEGER NOT NULL DEFAULT 0,
    "logs" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "audio_files_filename_key" ON "audio_files"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "audio_streams_audioFileId_streamIndex_key" ON "audio_streams"("audioFileId", "streamIndex");
