-- CreateTable
CREATE TABLE "story_dialogue_index" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyId" INTEGER NOT NULL,
    "scriptId" INTEGER NOT NULL,
    "dialogueIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "voiceFile" TEXT,
    "sourceFileMtime" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "story_dialogue_index_text_idx" ON "story_dialogue_index"("text");

-- CreateIndex
CREATE INDEX "story_dialogue_index_scriptId_dialogueIndex_idx" ON "story_dialogue_index"("scriptId", "dialogueIndex");

-- CreateIndex
CREATE INDEX "story_dialogue_index_sourceFileMtime_idx" ON "story_dialogue_index"("sourceFileMtime");
