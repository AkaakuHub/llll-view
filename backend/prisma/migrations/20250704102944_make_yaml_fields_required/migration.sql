/*
  Warnings:

  - Made the column `apIncrement` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `beatPointCoefficient` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `centerCharacterId` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `description` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `endTime` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `experienceType` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `feverSectionNo` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `generationsId` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isVideoMode` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `jacketId` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `maxAp` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `musicId` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `musicScoreReleaseTime` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `musicType` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `orderId` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `playTime` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `previewEndTime` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `previewFadeInTime` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `previewFadeOutTime` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `previewStartTime` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `releaseConditionDetail` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `releaseConditionText` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `releaseConditionType` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `singerCharacterId` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `songTime` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `songType` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `soundId` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `startTime` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `supportCharacterId` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `titleFurigana` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `unitId` on table `audio_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `videoBgId` on table `audio_files` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audio_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "displayName" TEXT,
    "category" TEXT NOT NULL DEFAULT 'BGM',
    "sampleRate" INTEGER,
    "channels" INTEGER,
    "duration" REAL,
    "bitrate" INTEGER,
    "encoding" TEXT,
    "musicId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleFurigana" TEXT NOT NULL,
    "jacketId" INTEGER NOT NULL,
    "soundId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "generationsId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "centerCharacterId" INTEGER NOT NULL,
    "singerCharacterId" TEXT NOT NULL,
    "supportCharacterId" TEXT NOT NULL,
    "musicType" INTEGER NOT NULL,
    "experienceType" INTEGER NOT NULL,
    "beatPointCoefficient" INTEGER NOT NULL,
    "apIncrement" INTEGER NOT NULL,
    "songTime" INTEGER NOT NULL,
    "playTime" INTEGER NOT NULL,
    "feverSectionNo" INTEGER NOT NULL,
    "previewStartTime" INTEGER NOT NULL,
    "previewEndTime" INTEGER NOT NULL,
    "previewFadeInTime" INTEGER NOT NULL,
    "previewFadeOutTime" INTEGER NOT NULL,
    "releaseConditionType" INTEGER NOT NULL,
    "releaseConditionDetail" INTEGER NOT NULL,
    "releaseConditionText" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "maxAp" INTEGER NOT NULL,
    "isVideoMode" INTEGER NOT NULL,
    "videoBgId" INTEGER NOT NULL,
    "songType" INTEGER NOT NULL,
    "musicScoreReleaseTime" DATETIME NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "outputPath" TEXT,
    "thumbnailPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "streamCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "convertedAt" DATETIME
);
INSERT INTO "new_audio_files" ("apIncrement", "beatPointCoefficient", "bitrate", "category", "centerCharacterId", "channels", "convertedAt", "createdAt", "description", "displayName", "duration", "encoding", "endTime", "experienceType", "feverSectionNo", "filename", "generationsId", "id", "isVideoMode", "jacketId", "maxAp", "musicId", "musicScoreReleaseTime", "musicType", "orderId", "outputPath", "playTime", "previewEndTime", "previewFadeInTime", "previewFadeOutTime", "previewStartTime", "releaseConditionDetail", "releaseConditionText", "releaseConditionType", "sampleRate", "singerCharacterId", "songTime", "songType", "soundId", "sourcePath", "startTime", "status", "streamCount", "supportCharacterId", "thumbnailPath", "title", "titleFurigana", "unitId", "updatedAt", "videoBgId") SELECT "apIncrement", "beatPointCoefficient", "bitrate", "category", "centerCharacterId", "channels", "convertedAt", "createdAt", "description", "displayName", "duration", "encoding", "endTime", "experienceType", "feverSectionNo", "filename", "generationsId", "id", "isVideoMode", "jacketId", "maxAp", "musicId", "musicScoreReleaseTime", "musicType", "orderId", "outputPath", "playTime", "previewEndTime", "previewFadeInTime", "previewFadeOutTime", "previewStartTime", "releaseConditionDetail", "releaseConditionText", "releaseConditionType", "sampleRate", "singerCharacterId", "songTime", "songType", "soundId", "sourcePath", "startTime", "status", "streamCount", "supportCharacterId", "thumbnailPath", "title", "titleFurigana", "unitId", "updatedAt", "videoBgId" FROM "audio_files";
DROP TABLE "audio_files";
ALTER TABLE "new_audio_files" RENAME TO "audio_files";
CREATE UNIQUE INDEX "audio_files_filename_key" ON "audio_files"("filename");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
