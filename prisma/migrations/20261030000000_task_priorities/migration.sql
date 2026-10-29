CREATE TABLE "priorities" (
 "id" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "position" INTEGER NOT NULL,
 CONSTRAINT "priorities_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "priorities_id_check" CHECK ("id" IN ('none', 'low', 'medium', 'high'))
);
CREATE UNIQUE INDEX "priorities_position_key" ON "priorities"("position");
INSERT INTO "priorities" ("id", "name", "position") VALUES
 ('none', 'No prioritario', 0), ('low', 'Bajo', 1), ('medium', 'Medio', 2), ('high', 'Alto', 3);
ALTER TABLE "tasks" ADD COLUMN "priorityId" TEXT NOT NULL DEFAULT 'none';
CREATE INDEX "tasks_priorityId_idx" ON "tasks"("priorityId");
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "priorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
