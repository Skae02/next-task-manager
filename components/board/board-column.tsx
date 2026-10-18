"use client";

import Link from "next/link";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ActionMenu } from "@/components/app/menu";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { SortableTaskCard } from "@/components/board/task-card";
import { cx } from "@/components/ui";
import { useBoardStore } from "@/lib/stores/board-store";
import { useUiStore } from "@/lib/stores/ui-store";
import type { Column, Task } from "@/lib/types";

type Props = {
  column: Column;
  /** Tasks in display order; differs from `column.tasks` while dragging. */
  tasks: Task[];
  /** Whether the task being dragged would land in this column. */
  isDropTarget: boolean;
};

export function BoardColumn({ column, tasks, isDropTarget }: Props) {
  // The task list itself is a drop zone, so empty columns accept tasks too.
  const { setNodeRef } = useDroppable({ id: column.id, data: { type: "column" } });
  const deleteColumn = useBoardStore((s) => s.deleteColumn);
  const { openEntityDialog, askConfirm } = useUiStore();
  const newTaskHref = `/tables/${column.tableId}/columns/${column.id}/tasks/new`;
  const count = tasks.length;

  return (
    <section
      className={cx(
        "flex max-h-[calc(100dvh-14rem)] w-72 shrink-0 flex-col rounded-2xl border transition-colors",
        isDropTarget ? "border-accent/50 bg-accent-soft/40" : "border-line bg-surface-2/60",
      )}
    >
      <header className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[13.5px] font-semibold">{column.title}</h2>
            <span className="rounded-full bg-sunken px-1.5 text-[11.5px] font-medium text-muted tabular-nums">
              {count}
            </span>
          </div>
          {column.description && (
            <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{column.description}</p>
          )}
        </div>
        <ActionMenu
          className="-mt-0.5 -mr-1"
          label="Acciones de la columna"
          items={[
            {
              label: "Editar columna",
              icon: <PencilIcon size={14} />,
              onSelect: () => openEntityDialog({ kind: "column", tableId: column.tableId, id: column.id }),
            },
            {
              label: "Eliminar columna",
              icon: <TrashIcon size={14} />,
              danger: true,
              onSelect: () =>
                askConfirm({
                  title: "Eliminar columna",
                  message:
                    count === 0
                      ? `Se eliminará “${column.title}”.`
                      : `Se eliminará “${column.title}” junto con ${count === 1 ? "su tarea" : `sus ${count} tareas`}.`,
                  onConfirm: () => deleteColumn(column.id),
                }),
            },
          ]}
        />
      </header>

      <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext id={column.id} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        <Link
          href={newTaskHref}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[13px] text-muted transition-colors hover:bg-sunken/70 hover:text-fg"
        >
          <PlusIcon size={14} /> Añadir tarea
        </Link>
      </div>
    </section>
  );
}
