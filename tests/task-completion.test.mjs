import assert from "node:assert/strict";
import test from "node:test";
import { setCompletionColumn } from "../lib/task-completion.ts";

function fixture(completionColumnId = "done") {
  const table = { id: "project", completionColumnId };
  const tasks = [
    { columnId: "done", completedAt: completionColumnId === "done" ? new Date("2026-11-01") : null },
    { columnId: "review", completedAt: null },
  ];
  let writes = 0;
  const tx = {
    table: {
      findUniqueOrThrow: async () => ({ ...table }),
      update: async ({ data }) => { writes++; Object.assign(table, data); },
    },
    task: { updateMany: async ({ where, data }) => {
      writes++;
      tasks.filter((task) => task.columnId === where.columnId).forEach((task) => Object.assign(task, data));
    } },
  };
  return { tx, table, tasks, writes: () => writes };
}

test("existing projects without a completion column can designate one", async () => {
  const f = fixture(null);
  await setCompletionColumn(f.tx, "project", "review");
  assert.equal(f.table.completionColumnId, "review");
  assert.equal(f.tasks[0].completedAt, null);
  assert.ok(f.tasks[1].completedAt instanceof Date);
});

test("replacing the completion column reopens previous tasks and completes new ones", async () => {
  const f = fixture();
  await setCompletionColumn(f.tx, "project", "review");
  assert.equal(f.table.completionColumnId, "review");
  assert.equal(f.tasks[0].completedAt, null);
  assert.ok(f.tasks[1].completedAt instanceof Date);
});

test("disabling completion reopens tasks and allows choosing another column later", async () => {
  const f = fixture();
  await setCompletionColumn(f.tx, "project", null);
  assert.equal(f.table.completionColumnId, null);
  assert.ok(f.tasks.every((task) => task.completedAt === null));
  await setCompletionColumn(f.tx, "project", "review");
  assert.ok(f.tasks[1].completedAt instanceof Date);
});

test("saving the same completion column preserves the original completion date", async () => {
  const f = fixture();
  const original = f.tasks[0].completedAt;
  await setCompletionColumn(f.tx, "project", "done");
  assert.equal(f.tasks[0].completedAt, original);
  assert.equal(f.writes(), 0);
});
