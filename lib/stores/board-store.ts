"use client";

import { create } from "zustand";
import { api, ApiRequestError } from "@/lib/http";
import type { Column, TableDetail, TableSummary, TagColor, Task } from "@/lib/types";

type Status = "idle" | "loading" | "ready" | "error";

export type TableInput = { title: string; description: string };
export type ColumnInput = TableInput;
export type TaskInput = {
  title: string;
  description: string;
  tagLabel: string | null;
  tagColor: TagColor | null;
  assigneeId: string | null;
  columnId?: string;
};

type BoardState = {
  tables: TableSummary[];
  tablesStatus: Status;
  current: TableDetail | null;
  currentStatus: Status;
  currentError: string | null;

  loadTables: () => Promise<void>;
  createTable: (input: TableInput) => Promise<TableSummary>;
  updateTable: (id: string, input: Partial<TableInput>) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;

  loadTable: (id: string) => Promise<void>;
  createColumn: (tableId: string, input: ColumnInput) => Promise<Column>;
  updateColumn: (id: string, input: Partial<ColumnInput>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;

  createTask: (columnId: string, input: TaskInput) => Promise<Task>;
  updateTask: (id: string, input: Partial<TaskInput>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  /**
   * Drag and drop. Applies the move immediately, then persists it; if the
   * request fails the board is restored and the error is rethrown.
   */
  moveTask: (taskId: string, columnId: string, index: number) => Promise<void>;
};

type MoveResponse = { task: Task; columns: { id: string; taskIds: string[] }[] };

/** Returns the table with the task removed from its column and inserted at `index` in `columnId`. */
export function placeTask(table: TableDetail, taskId: string, columnId: string, index: number): TableDetail {
  const found = findTask(table, taskId);
  if (!found) return table;
  const moved = { ...found.task, columnId };
  return mapColumns(table, (column) => {
    const tasks = column.tasks.filter((t) => t.id !== taskId);
    if (column.id === columnId) tasks.splice(Math.min(index, tasks.length), 0, moved);
    return tasks.length === column.tasks.length && column.id !== columnId ? column : { ...column, tasks };
  });
}

/** Applies `fn` to the loaded table detail, if any. */
function patchCurrent(
  current: TableDetail | null,
  fn: (table: TableDetail) => TableDetail,
) {
  return current ? fn(current) : current;
}

function mapColumns(table: TableDetail, fn: (column: Column) => Column): TableDetail {
  return { ...table, columns: table.columns.map(fn) };
}

export const useBoardStore = create<BoardState>()((set, get) => ({
  tables: [],
  tablesStatus: "idle",
  current: null,
  currentStatus: "idle",
  currentError: null,

  loadTables: async () => {
    set((s) => ({ tablesStatus: s.tables.length ? "ready" : "loading" }));
    try {
      const { tables } = await api<{ tables: TableSummary[] }>("/tables");
      set({ tables, tablesStatus: "ready" });
    } catch {
      set({ tablesStatus: "error" });
    }
  },

  createTable: async (input) => {
    const { table } = await api<{ table: TableSummary }>("/tables", {
      method: "POST",
      body: input,
    });
    set((s) => ({ tables: [table, ...s.tables] }));
    return table;
  },

  updateTable: async (id, input) => {
    const { table } = await api<{ table: Omit<TableDetail, "columns"> }>(`/tables/${id}`, {
      method: "PATCH",
      body: input,
    });
    set((s) => ({
      tables: s.tables.map((t) => (t.id === id ? { ...t, ...table } : t)),
      current: s.current?.id === id ? { ...s.current, ...table } : s.current,
    }));
  },

  deleteTable: async (id) => {
    await api(`/tables/${id}`, { method: "DELETE" });
    set((s) => ({
      tables: s.tables.filter((t) => t.id !== id),
      current: s.current?.id === id ? null : s.current,
    }));
  },

  loadTable: async (id) => {
    const keep = get().current?.id === id;
    set({ currentStatus: keep ? "ready" : "loading", currentError: null, ...(!keep && { current: null }) });
    try {
      const { table } = await api<{ table: TableDetail }>(`/tables/${id}`);
      set({ current: table, currentStatus: "ready" });
    } catch (error) {
      set({
        currentStatus: "error",
        currentError: error instanceof ApiRequestError ? error.message : "No se pudo cargar la tabla",
      });
    }
  },

  createColumn: async (tableId, input) => {
    const { column } = await api<{ column: Column }>(`/tables/${tableId}/columns`, {
      method: "POST",
      body: input,
    });
    set((s) => ({
      current: s.current?.id === tableId ? { ...s.current, columns: [...s.current.columns, column] } : s.current,
      tables: s.tables.map((t) => (t.id === tableId ? { ...t, columnCount: t.columnCount + 1 } : t)),
    }));
    return column;
  },

  updateColumn: async (id, input) => {
    const { column } = await api<{ column: Column }>(`/columns/${id}`, { method: "PATCH", body: input });
    set((s) => ({
      current: patchCurrent(s.current, (t) => mapColumns(t, (r) => (r.id === id ? column : r))),
    }));
  },

  deleteColumn: async (id) => {
    await api(`/columns/${id}`, { method: "DELETE" });
    set((s) => ({
      current: patchCurrent(s.current, (t) => ({ ...t, columns: t.columns.filter((r) => r.id !== id) })),
    }));
  },

  createTask: async (columnId, input) => {
    const { task } = await api<{ task: Task }>(`/columns/${columnId}/tasks`, {
      method: "POST",
      body: input,
    });
    set((s) => ({
      current: patchCurrent(s.current, (t) =>
        mapColumns(t, (r) => (r.id === columnId ? { ...r, tasks: [...r.tasks, task] } : r)),
      ),
    }));
    return task;
  },

  updateTask: async (id, input) => {
    const { task } = await api<{ task: Task }>(`/tasks/${id}`, { method: "PATCH", body: input });
    set((s) => ({
      // Remove from wherever it was, then place it in its (possibly new) column.
      current: patchCurrent(s.current, (t) =>
        mapColumns(t, (r) => {
          const had = r.tasks.some((x) => x.id === id);
          if (r.id === task.columnId) {
            return {
              ...r,
              tasks: had ? r.tasks.map((x) => (x.id === id ? task : x)) : [...r.tasks, task],
            };
          }
          return had ? { ...r, tasks: r.tasks.filter((x) => x.id !== id) } : r;
        }),
      ),
    }));
    return task;
  },

  moveTask: async (taskId, columnId, index) => {
    const snapshot = get().current;
    if (!snapshot || !findTask(snapshot, taskId)) return;
    set({ current: placeTask(snapshot, taskId, columnId, index) });
    try {
      const response = await api<MoveResponse>(`/tasks/${taskId}/move`, {
        method: "PATCH",
        body: { columnId, index },
      });
      set((s) => ({
        current: s.current?.id === snapshot.id ? applyServerOrder(s.current, response) : s.current,
      }));
    } catch (error) {
      set((s) => ({ current: s.current?.id === snapshot.id ? snapshot : s.current }));
      throw error;
    }
  },

  deleteTask: async (id) => {
    await api(`/tasks/${id}`, { method: "DELETE" });
    set((s) => ({
      current: patchCurrent(s.current, (t) =>
        mapColumns(t, (r) => ({ ...r, tasks: r.tasks.filter((x) => x.id !== id) })),
      ),
    }));
  },
}));

/** Reorders columns to match the server's authoritative order after a move. */
function applyServerOrder(table: TableDetail, response: MoveResponse): TableDetail {
  const byId = new Map(table.columns.flatMap((c) => c.tasks).map((t) => [t.id, t]));
  byId.set(response.task.id, response.task);
  return mapColumns(table, (column) => {
    const order = response.columns.find((c) => c.id === column.id);
    if (!order) return column;
    const tasks = order.taskIds.map((id) => byId.get(id)).filter((t): t is Task => Boolean(t));
    return { ...column, tasks };
  });
}

export function findTask(table: TableDetail | null, taskId: string | null) {
  if (!table || !taskId) return null;
  for (const column of table.columns) {
    const task = column.tasks.find((t) => t.id === taskId);
    if (task) return { task, column };
  }
  return null;
}
