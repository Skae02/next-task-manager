import assert from "node:assert/strict";
import test from "node:test";
import { isValidTaskEndDate, formatTaskEndDate, taskDeadlineStatus } from "../lib/task-dates.ts";

test("a deadline is optional and can be removed", () => {
  assert.equal(isValidTaskEndDate(null, "2026-11-02T18:00:00Z"), true);
  assert.equal(isValidTaskEndDate(undefined, "2026-11-02T18:00:00Z"), true);
});

test("deadline warnings start at three days and omit tasks without a deadline", () => {
  assert.equal(taskDeadlineStatus(null, "2026-11-02"), null);
  assert.equal(taskDeadlineStatus("2026-11-06", "2026-11-02"), null);
  assert.deepEqual(taskDeadlineStatus("2026-11-05", "2026-11-02"), {
    kind: "soon", message: "La tarea vence en 3 días",
  });
  assert.equal(taskDeadlineStatus("2026-11-03", "2026-11-02").message, "La tarea vence en 1 día");
});

test("today and overdue dates have distinct messages and handle year boundaries", () => {
  assert.deepEqual(taskDeadlineStatus("2026-11-02", "2026-11-02"), {
    kind: "today", message: "La tarea vence hoy",
  });
  assert.deepEqual(taskDeadlineStatus("2026-12-31", "2027-01-01"), {
    kind: "overdue", message: "La tarea venció hace 1 día",
  });
  assert.equal(taskDeadlineStatus("2026-11-01", "2026-11-03").message, "La tarea venció hace 2 días");
});

test("the creation day is allowed even when the task was created late that day", () => {
  assert.equal(isValidTaskEndDate("2026-11-02", "2026-11-02T23:59:59Z"), true);
  assert.equal(isValidTaskEndDate("2026-11-01", "2026-11-02T00:00:00Z"), false);
});

test("deadlines compare correctly across month, year and leap-day boundaries", () => {
  assert.equal(isValidTaskEndDate("2027-01-01", "2026-12-31T12:00:00Z"), true);
  assert.equal(isValidTaskEndDate("2024-02-29", "2024-03-01T12:00:00Z"), false);
});

test("a date-only deadline displays the selected calendar day", () => {
  assert.equal(formatTaskEndDate("2026-11-02"), new Intl.DateTimeFormat("es", {
    dateStyle: "medium", timeZone: "UTC",
  }).format(new Date("2026-11-02T12:00:00Z")));
});

test("completed tasks suppress warnings and reopening restores them", () => {
  for (const endDate of ["2026-11-01", "2026-11-02", "2026-11-03"]) {
    assert.equal(taskDeadlineStatus(endDate, "2026-11-02", true), null);
    assert.notEqual(taskDeadlineStatus(endDate, "2026-11-02", false), null);
  }
});
