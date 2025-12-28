-- CreateTable
CREATE TABLE "card_skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardSkillSeriesId" TEXT NOT NULL,
    "skillLevel" INTEGER NOT NULL,
    "skillCost" INTEGER,
    "apperanceType" TEXT,
    "cardSkillEffectId" TEXT,
    "description" TEXT,
    "cardSeriesId" INTEGER
);

-- CreateTable
CREATE TABLE "card_levels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "experienceType" INTEGER NOT NULL,
    "cardLevel" INTEGER NOT NULL,
    "experience" INTEGER NOT NULL,
    "cumulativeExperience" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "center_skills" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "centerSkillSeriesId" INTEGER NOT NULL,
    "skillLevel" INTEGER NOT NULL,
    "description" TEXT,
    "centerSkillEffectId" TEXT
);

-- CreateTable
CREATE TABLE "music_scores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "normalLevel" INTEGER,
    "hardLevel" INTEGER,
    "expertLevel" INTEGER,
    "masterLevel" INTEGER,
    "normalMaxCombo" INTEGER,
    "hardMaxCombo" INTEGER,
    "expertMaxCombo" INTEGER,
    "masterMaxCombo" INTEGER,
    "shouldVerifyNotesCount" INTEGER,
    "scoreRewardSeriesId" INTEGER,
    "normalGainMusicExp" INTEGER,
    "hardGainMusicExp" INTEGER,
    "expertGainMusicExp" INTEGER,
    "masterGainMusicExp" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "live_timelines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT,
    "musicId" INTEGER,
    "locationsId" INTEGER,
    "freeId" INTEGER,
    "nextId" INTEGER,
    "movieIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "card_skills_cardSkillSeriesId_idx" ON "card_skills"("cardSkillSeriesId");

-- CreateIndex
CREATE INDEX "card_skills_cardSeriesId_idx" ON "card_skills"("cardSeriesId");

-- CreateIndex
CREATE INDEX "card_levels_experienceType_idx" ON "card_levels"("experienceType");

-- CreateIndex
CREATE INDEX "card_levels_cardLevel_idx" ON "card_levels"("cardLevel");

-- CreateIndex
CREATE INDEX "center_skills_centerSkillSeriesId_idx" ON "center_skills"("centerSkillSeriesId");

-- CreateIndex
CREATE INDEX "music_scores_scoreRewardSeriesId_idx" ON "music_scores"("scoreRewardSeriesId");

-- CreateIndex
CREATE INDEX "live_timelines_musicId_idx" ON "live_timelines"("musicId");

-- CreateIndex
CREATE INDEX "live_timelines_locationsId_idx" ON "live_timelines"("locationsId");

-- CreateIndex
CREATE INDEX "card_illustrations_cardSeriesId_idx" ON "card_illustrations"("cardSeriesId");
