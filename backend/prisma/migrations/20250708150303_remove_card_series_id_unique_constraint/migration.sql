-- CreateTable
CREATE TABLE "characters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nameLast" TEXT NOT NULL,
    "nameFirst" TEXT NOT NULL,
    "latinAlphabetNameLast" TEXT,
    "latinAlphabetNameFirst" TEXT,
    "generationsId" INTEGER NOT NULL,
    "characterVoice" TEXT,
    "themeColor" TEXT,
    "introduction" TEXT,
    "styleType" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "card_illustrations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cardSeriesId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "rarity" INTEGER NOT NULL DEFAULT 1,
    "evolveTimes" INTEGER NOT NULL DEFAULT 0,
    "style" INTEGER NOT NULL DEFAULT 1,
    "mood" INTEGER NOT NULL DEFAULT 1,
    "initialSmile" INTEGER,
    "initialPure" INTEGER,
    "initialCool" INTEGER,
    "initialMental" INTEGER,
    "maxSmile" INTEGER,
    "maxPure" INTEGER,
    "maxCool" INTEGER,
    "maxMental" INTEGER,
    "beatPoint" INTEGER,
    "orderId" INTEGER,
    "fullImagePath" TEXT,
    "middleImagePath" TEXT,
    "profileImagePath" TEXT,
    "homeVideoPath" TEXT,
    "hasFullImage" BOOLEAN NOT NULL DEFAULT false,
    "hasMiddleImage" BOOLEAN NOT NULL DEFAULT false,
    "hasProfileImage" BOOLEAN NOT NULL DEFAULT false,
    "hasHomeVideo" BOOLEAN NOT NULL DEFAULT false,
    "extractedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "card_illustrations_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "isLiked" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateIndex
CREATE INDEX "card_illustrations_characterId_idx" ON "card_illustrations"("characterId");

-- CreateIndex
CREATE INDEX "card_illustrations_rarity_idx" ON "card_illustrations"("rarity");

-- CreateIndex
CREATE INDEX "card_illustrations_style_idx" ON "card_illustrations"("style");

-- CreateIndex
CREATE INDEX "card_illustrations_mood_idx" ON "card_illustrations"("mood");
