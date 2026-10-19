// Shapes returned by the API and shared with the client.

/** Palette shared by tag pills and the accent color of tables, columns and tasks. */
export const COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

export type Color = (typeof COLORS)[number];

export type PublicUser = {
  id: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  alias: string | null;
  /** ISO date (YYYY-MM-DD). */
  birthDate: string | null;
  profileComplete: boolean;
};

export type UserRef = { id: string; alias: string | null; fullName: string | null };

export type TableSummary = {
  id: string;
  title: string;
  description: string;
  color: Color | null;
  createdAt: string;
  updatedAt: string;
  columnCount: number;
  taskCount: number;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  tagLabel: string | null;
  tagColor: Color | null;
  color: Color | null;
  position: number;
  columnId: string;
  author: UserRef;
  assignee: UserRef | null;
  createdAt: string;
  updatedAt: string;
};

export type Column = {
  id: string;
  title: string;
  description: string;
  color: Color | null;
  position: number;
  tableId: string;
  tasks: Task[];
};

export type TableDetail = Omit<TableSummary, "columnCount" | "taskCount"> & {
  columns: Column[];
};

export type ApiError = {
  error: string;
  fields?: Record<string, string>;
};
