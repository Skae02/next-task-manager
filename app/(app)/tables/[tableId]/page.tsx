"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ActionMenu } from "@/components/app/menu";
import { FilteredBoard } from "@/components/board/filtered-board";
import { TaskModal } from "@/components/board/task-modal";
import { ChevronLeftIcon, ColumnsIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Button, Spinner, colorLabels, colorStyles, cx } from "@/components/ui";
import { useBoardStore } from "@/lib/stores/board-store";
import { useUiStore } from "@/lib/stores/ui-store";

export default function TablePage() {
  const { tableId } = useParams<{ tableId: string }>();
  const router = useRouter();
  const { current, currentStatus, currentError, loadTable, deleteTable } = useBoardStore();
  const { openEntityDialog, askConfirm, closeTask } = useUiStore();

  useEffect(() => {
    loadTable(tableId);
    return closeTask;
  }, [tableId, loadTable, closeTask]);

  const table = current?.id === tableId ? current : null;
  const addColumn = () => openEntityDialog({ kind: "column", tableId });

  return (
    <>
      <Link href="/tables" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeftIcon size={14} /> Tablas
      </Link>

      {currentStatus === "loading" && (
        <div className="flex justify-center py-24 text-muted">
          <Spinner />
        </div>
      )}

      {currentStatus === "error" && (
        <div className="py-24 text-center">
          <p className="font-medium">{currentError}</p>
          <Link href="/tables" className="mt-2 inline-block text-accent hover:underline">
            Volver a tus tablas
          </Link>
        </div>
      )}

      {table && (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <h1 className="flex items-center gap-2.5 text-[26px] font-semibold tracking-tight">
                {table.color && (
                  <span
                    title={colorLabels[table.color]}
                    className={cx("size-3 shrink-0 rounded-full", colorStyles[table.color].dot)}
                  />
                )}
                {table.title}
              </h1>
              {table.description && <p className="mt-1 whitespace-pre-wrap text-muted">{table.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" onClick={addColumn}>
                <PlusIcon /> Nueva columna
              </Button>
              <ActionMenu
                label="Acciones de la tabla"
                items={[
                  {
                    label: "Editar tabla",
                    icon: <PencilIcon size={14} />,
                    onSelect: () => openEntityDialog({ kind: "table", id: table.id }),
                  },
                  {
                    label: "Eliminar tabla",
                    icon: <TrashIcon size={14} />,
                    danger: true,
                    onSelect: () =>
                      askConfirm({
                        title: "Eliminar tabla",
                        message: `Se eliminará “${table.title}” junto con todas sus columnas y tareas.`,
                        onConfirm: async () => {
                          await deleteTable(table.id);
                          router.replace("/tables");
                        },
                      }),
                  },
                ]}
              />
            </div>
          </div>

          {table.columns.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong py-20 text-center">
              <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <ColumnsIcon size={22} />
              </span>
              <h2 className="text-[16px] font-semibold">Este tablero está vacío</h2>
              <p className="mt-1 mb-5 max-w-xs text-muted">
                Crea columnas como “Por hacer”, “En progreso” y “Hecho” para seguir el avance de tus tareas.
              </p>
              <Button variant="primary" onClick={addColumn}>
                <PlusIcon /> Crear columna
              </Button>
            </div>
          ) : (
            <FilteredBoard
              key={table.id}
              table={table}
              after={
                <button
                  onClick={addColumn}
                  className="flex h-12 w-72 shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line-strong text-[13px] text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  <PlusIcon size={14} /> Nueva columna
                </button>
              }
            />
          )}

          <TaskModal />
        </>
      )}
    </>
  );
}
