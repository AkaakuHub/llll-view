PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_system_control_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notifyOnlyUpdates" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "webhookModes" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_system_control_settings" (
    "id",
    "notifyOnlyUpdates",
    "notifyOnFailure",
    "webhookModes",
    "updatedAt"
)
SELECT
    "id",
    "notifyOnlyUpdates",
    "notifyOnFailure",
    replace("webhookModes", '\"normal\"', '\"full_log\"'),
    "updatedAt"
FROM "system_control_settings";

DROP TABLE "system_control_settings";
ALTER TABLE "new_system_control_settings" RENAME TO "system_control_settings";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
