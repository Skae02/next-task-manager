ALTER TABLE "tasks" ADD COLUMN "endDate" DATE;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_end_date_check"
CHECK ("endDate" IS NULL OR "endDate" >= "createdAt"::date);
