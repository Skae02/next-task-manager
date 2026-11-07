ALTER TABLE "tables" ADD COLUMN "completionColumnId" TEXT;
ALTER TABLE "tasks" ADD COLUMN "completedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "tables_completionColumnId_key" ON "tables"("completionColumnId");
ALTER TABLE "tables" ADD CONSTRAINT "tables_completionColumnId_fkey" FOREIGN KEY ("completionColumnId") REFERENCES "columns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
