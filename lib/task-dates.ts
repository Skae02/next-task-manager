/** Date-only deadlines use the same UTC calendar as their database representation. */
export function taskCreationDate(createdOn: string | Date): string {
  return new Date(createdOn).toISOString().slice(0, 10);
}

export function isValidTaskEndDate(endDate: string | null | undefined, createdOn: string | Date): boolean {
  return !endDate || endDate >= taskCreationDate(createdOn);
}

export const TASK_END_DATE_ERROR = "La fecha de finalización no puede ser anterior a la fecha de creación";

export function formatTaskEndDate(endDate: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(endDate));
}
