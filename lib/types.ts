// Shapes returned by the API and shared with the client.

export const TAG_COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

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
  tagColor: TagColor | null;
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
