/** Date-only deadlines use the same UTC calendar as their database representation. */
export function taskCreationDate(createdOn: string | Date): string {
  return new Date(createdOn).toISOString().slice(0, 10);
}

export function isValidTaskEndDate(endDate: string | null | undefined, createdOn: string | Date): boolean {
  return !endDate || endDate >= taskCreationDate(createdOn);
}

export const TASK_END_DATE_ERROR = "La fecha de vencimiento no puede ser anterior a la fecha de creación";

export function formatTaskEndDate(endDate: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(endDate));
}

/** Compare calendar days, rather than elapsed hours (including DST changes). */
export function taskDeadlineStatus(endDate: string | null, today: string, completed = false) {
  if (completed || !endDate || !today) return null;
  const days = Math.round((Date.parse(endDate) - Date.parse(today)) / 86_400_000);
  if (days > 3) return null;
  if (days > 0) return {
    kind: "soon" as const,
    message: `La tarea vence en ${days} ${days === 1 ? "día" : "días"}`,
  };
  if (days === 0) return { kind: "today" as const, message: "La tarea vence hoy" };
  const elapsed = Math.abs(days);
  return {
    kind: "overdue" as const,
    message: `La tarea venció hace ${elapsed} ${elapsed === 1 ? "día" : "días"}`,
  };
}
