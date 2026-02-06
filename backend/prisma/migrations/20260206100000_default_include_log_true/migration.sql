-- SQLite does not support ALTER COLUMN for defaults.
-- Keep schema default in prisma schema and just align existing row.
UPDATE "system_control_settings" SET "includeLog" = true WHERE "id" = 1;
