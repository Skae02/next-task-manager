-- Rename "rows" to "columns" (kanban columns), keeping existing data.

-- Table, primary key, index and foreign key of the former "rows" table
ALTER TABLE "rows" RENAME TO "columns";
ALTER TABLE "columns" RENAME CONSTRAINT "rows_pkey" TO "columns_pkey";
ALTER INDEX "rows_tableId_idx" RENAME TO "columns_tableId_idx";
ALTER TABLE "columns" RENAME CONSTRAINT "rows_tableId_fkey" TO "columns_tableId_fkey";

-- tasks.rowId -> tasks.columnId
ALTER TABLE "tasks" RENAME COLUMN "rowId" TO "columnId";
ALTER INDEX "tasks_rowId_idx" RENAME TO "tasks_columnId_idx";
ALTER TABLE "tasks" RENAME CONSTRAINT "tasks_rowId_fkey" TO "tasks_columnId_fkey";
