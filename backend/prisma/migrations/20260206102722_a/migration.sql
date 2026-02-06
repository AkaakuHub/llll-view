-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_system_control_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "notifyOnSuccess" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnlyUpdates" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "includeLog" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_system_control_settings" ("id", "includeLog", "notifyOnFailure", "notifyOnSuccess", "notifyOnlyUpdates", "updatedAt") SELECT "id", "includeLog", "notifyOnFailure", "notifyOnSuccess", "notifyOnlyUpdates", "updatedAt" FROM "system_control_settings";
DROP TABLE "system_control_settings";
ALTER TABLE "new_system_control_settings" RENAME TO "system_control_settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
