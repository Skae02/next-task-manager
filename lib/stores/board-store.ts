"use client";

import { create } from "zustand";
import { api, ApiRequestError } from "@/lib/http";
import { useUiStore } from "@/lib/stores/ui-store";
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
   * Drag and drop. Applies the move immediately and queues it to be saved
   * (see the move queue below). Failures are reported with a toast.
   */
  moveTask: (taskId: string, columnId: string, index: number) => void;
};

type MoveResponse = { task: Task; columns: { id: string; taskIds: string[] }[] };

/*
 * Move queue. Moves are sent one at a time, in the order they were made, so
 * the server applies exactly the same sequence the board already shows.
 *
 * - Consecutive moves of the same task collapse into the latest one: where a
 *   task ends up doesn't depend on where it was, so the earlier one is moot.
 *   Only the queued (not yet sent) move is replaced, never the one in flight.
 * - The server's order is applied only once the queue is empty; earlier
 *   responses would undo moves that are still pending.
 * - If a move fails, the moves queued after it were built on top of it, so
 *   they are dropped and the board is reloaded from the server.
 */
type QueuedMove = { tableId: string; taskId: string; columnId: string; index: number };
const moveQueue: QueuedMove[] = [];
let draining: Promise<void> | null = null;

/** Resolves once every queued move has been sent and answered. */
function movesSettled() {
  return draining ?? Promise.resolve();
}

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

export const useBoardStore = create<BoardState>()((set, get) => {
  const setIfCurrent = (tableId: string, fn: (table: TableDetail) => TableDetail) =>
    set((s) => (s.current?.id === tableId ? { current: fn(s.current) } : {}));

  async function drainMoves() {
    for (let move = moveQueue.shift(); move; move = moveQueue.shift()) {
      try {
        const response = await api<MoveResponse>(`/tasks/${move.taskId}/move`, {
          method: "PATCH",
          body: { columnId: move.columnId, index: move.index },
        });
        if (moveQueue.length === 0) setIfCurrent(move.tableId, (t) => applyServerOrder(t, response));
      } catch (error) {
        moveQueue.length = 0;
        useUiStore.getState().showToast(
          error instanceof ApiRequestError
            ? `No se pudo mover la tarea: ${error.message}`
            : "No se pudo mover la tarea. Revisa tu conexión.",
        );
        try {
          const { table } = await api<{ table: TableDetail }>(`/tables/${move.tableId}`);
          // Moves made while reloading are still queued: keep showing them.
          setIfCurrent(move.tableId, () =>
            moveQueue.reduce((t, m) => placeTask(t, m.taskId, m.columnId, m.index), table),
          );
        } catch {
          // Keep what is on screen; the next load will fix it.
        }
      }
    }
  }

  return {
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
      // Pending moves would be overwritten by an older snapshot of the board.
      await movesSettled();
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

    moveTask: (taskId, columnId, index) => {
      const table = get().current;
      if (!table || !findTask(table, taskId)) return;
      set({ current: placeTask(table, taskId, columnId, index) });

      const move = { tableId: table.id, taskId, columnId, index };
      const last = moveQueue[moveQueue.length - 1];
      if (last?.taskId === taskId) moveQueue[moveQueue.length - 1] = move;
      else moveQueue.push(move);

      draining ??= drainMoves().finally(() => {
        draining = null;
      });
    },

    deleteTask: async (id) => {
      await api(`/tasks/${id}`, { method: "DELETE" });
      set((s) => ({
        current: patchCurrent(s.current, (t) =>
          mapColumns(t, (r) => ({ ...r, tasks: r.tasks.filter((x) => x.id !== id) })),
        ),
      }));
    },
  };
});

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
