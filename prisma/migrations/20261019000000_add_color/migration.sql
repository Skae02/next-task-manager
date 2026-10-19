-- Optional accent color for tables, columns and tasks.
ALTER TABLE "tables" ADD COLUMN "color" TEXT;
ALTER TABLE "columns" ADD COLUMN "color" TEXT;
ALTER TABLE "tasks" ADD COLUMN "color" TEXT;
