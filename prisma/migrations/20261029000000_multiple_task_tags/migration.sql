CREATE TABLE "task_tags" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "label" VARCHAR(30) NOT NULL,
  "color" TEXT,
  "position" INTEGER NOT NULL,
  CONSTRAINT "task_tags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_tags_position_check" CHECK ("position" BETWEEN 0 AND 19),
  CONSTRAINT "task_tags_label_check" CHECK (char_length(btrim("label")) > 0),
  CONSTRAINT "task_tags_color_check" CHECK ("color" IN ('gray','red','orange','yellow','green','blue','purple','pink')),
  CONSTRAINT "task_tags_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "task_tags_taskId_position_key" ON "task_tags"("taskId", "position");
INSERT INTO "task_tags" ("id", "taskId", "label", "color", "position")
SELECT 'legacy_' || "id", "id", btrim("tagLabel"), "tagColor", 0 FROM "tasks"
WHERE "tagLabel" IS NOT NULL AND btrim("tagLabel") <> '';
ALTER TABLE "tasks" DROP COLUMN "tagLabel", DROP COLUMN "tagColor";
