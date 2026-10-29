"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { BoardColumn } from "@/components/board/board-column";
import { TaskCardView } from "@/components/board/task-card";
import { useBoardStore } from "@/lib/stores/board-store";
import type { TableDetail, Task } from "@/lib/types";

/** columnId → task ids in display order. */
type Layout = Record<string, string[]>;

function layoutOf(table: TableDetail): Layout {
  return Object.fromEntries(table.columns.map((c) => [c.id, c.tasks.map((t) => t.id)]));
}

function columnOf(layout: Layout, id: UniqueIdentifier) {
  const key = String(id);
  if (key in layout) return key;
  return Object.keys(layout).find((columnId) => layout[columnId].includes(key));
}

/**
 * Prefer the card under the pointer; fall back to the column (empty space or
 * an empty column), and to the closest corners for keyboard dragging.
 */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length === 0) return closestCorners(args);
  const taskIds = new Set(
    args.droppableContainers.filter((c) => c.data.current?.type === "task").map((c) => c.id),
  );
  const overTasks = hits.filter((hit) => taskIds.has(hit.id));
  if (overTasks.length === 0) return hits;
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => overTasks.some((hit) => hit.id === c.id)),
  });
};

export function KanbanBoard({ table, after, matchesTask }: { table: TableDetail; after?: ReactNode; matchesTask?: (task: Task) => boolean }) {
  const moveTask = useBoardStore((s) => s.moveTask);
  const dndId = useId();

  // While dragging, the board renders this local layout; the store is only
  // updated once the task is dropped.
  const [dragLayout, setDragLayout] = useState<Layout | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<{ columnId: string; index: number } | null>(null);

  const layout = dragLayout ?? layoutOf(table);
  const tasksById = useMemo(
    () => new Map(table.columns.flatMap((c) => c.tasks).map((t) => [t.id, t])),
    [table],
  );
  const activeTask = activeId ? tasksById.get(activeId) : undefined;
  const targetColumnId = activeId ? columnOf(layout, activeId) : undefined;

  // Read by the keyboard coordinate getter, which dnd-kit calls outside render.
  const layoutRef = useRef(layout);
  const columnIdsRef = useRef<string[]>([]);
  useLayoutEffect(() => {
    layoutRef.current = layout;
    columnIdsRef.current = table.columns.map((c) => c.id);
  });

  // Up/Down reorder within the column (dnd-kit's default); Left/Right jump to
  // the top of the neighbouring column.
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
    if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") {
      return sortableKeyboardCoordinates(event, args);
    }
    event.preventDefault();
    const { active, droppableRects } = args.context;
    if (!active) return;
    const columnIds = columnIdsRef.current;
    const from = columnOf(layoutRef.current, active.id);
    const next = columnIds[columnIds.indexOf(from ?? "") + (event.code === "ArrowRight" ? 1 : -1)];
    const rect = next ? droppableRects.get(next) : undefined;
    return rect ? { x: rect.left, y: rect.top } : undefined;
  };

  const sensors = useSensors(
    // A short move is needed before dragging, so a plain click opens the task.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long press on touch, so swiping still scrolls the page and the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    // Space picks up and drops; Enter is left free to open the task.
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const reset = () => {
    setDragLayout(null);
    setActiveId(null);
    setOrigin(null);
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    const start = layoutOf(table);
    const columnId = columnOf(start, active.id);
    if (!columnId) return;
    setDragLayout(start);
    setActiveId(String(active.id));
    setOrigin({ columnId, index: start[columnId].indexOf(String(active.id)) });
  };

  // Moving into another column: reflect it right away so that column's list
  // makes room for the card.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setDragLayout((prev) => {
      if (!prev) return prev;
      const from = columnOf(prev, active.id);
      const to = columnOf(prev, over.id);
      if (!from || !to || from === to) return prev;

      const target = prev[to];
      let index = target.length;
      if (!(String(over.id) in prev)) {
        const overIndex = target.indexOf(String(over.id));
        const activeRect = active.rect.current.translated;
        const below = activeRect && activeRect.top > over.rect.top + over.rect.height / 2;
        index = overIndex + (below ? 1 : 0);
      }
      return {
        ...prev,
        [from]: prev[from].filter((id) => id !== active.id),
        [to]: [...target.slice(0, index), String(active.id), ...target.slice(index)],
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const current = dragLayout;
    const start = origin;
    reset();
    if (!current || !start || !over) return;

    const columnId = columnOf(current, active.id);
    if (!columnId) return;
    let ids = current[columnId];
    // Reordering within the column the card is now in.
    if (!(String(over.id) in current) && columnOf(current, over.id) === columnId) {
      ids = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    }
    const index = ids.indexOf(String(active.id));
    if (columnId === start.columnId && index === start.index) return;

    moveTask(String(active.id), columnId, index);
  };

  const titleOf = (id: UniqueIdentifier) => tasksById.get(String(id))?.title ?? "la tarea";
  const columnTitle = (id: UniqueIdentifier) => {
    const columnId = columnOf(layout, id);
    return table.columns.find((c) => c.id === columnId)?.title ?? "una columna";
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste “${titleOf(active.id)}”.`,
    onDragOver: ({ active, over }) =>
      over ? `“${titleOf(active.id)}” está en ${columnTitle(over.id)}.` : `“${titleOf(active.id)}” está fuera de las columnas.`,
    onDragEnd: ({ active, over }) =>
      over ? `Soltaste “${titleOf(active.id)}” en ${columnTitle(over.id)}.` : `Soltaste “${titleOf(active.id)}”.`,
    onDragCancel: ({ active }) => `Cancelaste el movimiento de “${titleOf(active.id)}”.`,
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Para mover una tarea, presiona espacio. Usa las flechas para cambiarla de lugar o de columna, espacio para soltarla y Escape para cancelar. Enter abre la tarea.",
        },
      }}
    >
      {/* Bleeds to the page edges so wide boards scroll horizontally edge to edge. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        <div className="flex w-max items-start gap-3">
          {table.columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={(layout[column.id] ?? []).map((id) => tasksById.get(id)).filter((t): t is Task => Boolean(t)).filter((task) => !matchesTask || matchesTask(task))}
              isDropTarget={targetColumnId === column.id && origin?.columnId !== column.id}
            />
          ))}
          {after}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activeTask ? <TaskCardView task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
