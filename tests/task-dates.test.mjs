import assert from "node:assert/strict";
import test from "node:test";
import { isValidTaskEndDate, formatTaskEndDate } from "../lib/task-dates.ts";

test("a deadline is optional and can be removed", () => {
  assert.equal(isValidTaskEndDate(null, "2026-11-02T18:00:00Z"), true);
  assert.equal(isValidTaskEndDate(undefined, "2026-11-02T18:00:00Z"), true);
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
