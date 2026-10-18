"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "motion/react";
import { ActionMenu } from "@/components/app/menu";
import { BoardIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Button, Spinner } from "@/components/ui";
import { useBoardStore } from "@/lib/stores/board-store";
import { useUiStore } from "@/lib/stores/ui-store";
import type { TableSummary } from "@/lib/types";

export default function TablesPage() {
  const { tables, tablesStatus, loadTables } = useBoardStore();
  const openEntityDialog = useUiStore((s) => s.openEntityDialog);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const createTable = () => openEntityDialog({ kind: "table" });

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Tablas</h1>
          <p className="mt-0.5 text-muted">Organiza tu trabajo en tableros con columnas y tareas.</p>
        </div>
        <Button variant="primary" onClick={createTable}>
          <PlusIcon /> Nueva tabla
        </Button>
      </div>

      {tablesStatus === "loading" && (
        <div className="flex justify-center py-24 text-muted">
          <Spinner />
        </div>
      )}

      {tablesStatus === "error" && (
        <div className="py-24 text-center text-muted">
          No se pudieron cargar tus tablas.{" "}
          <button className="font-medium text-accent hover:underline" onClick={loadTables}>
            Reintentar
          </button>
        </div>
      )}

      {tablesStatus === "ready" && tables.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong py-20 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <BoardIcon size={22} />
          </span>
          <h2 className="text-[16px] font-semibold">Aún no tienes tablas</h2>
          <p className="mt-1 mb-5 max-w-xs text-muted">Crea tu primera tabla para empezar a organizar tareas.</p>
          <Button variant="primary" onClick={createTable}>
            <PlusIcon /> Crear tabla
          </Button>
        </div>
      )}

      {tables.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table, index) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 10) * 0.03 }}
            >
              <TableCard table={table} />
            </motion.div>
          ))}
          <button
            onClick={createTable}
            className="flex min-h-36 items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <PlusIcon /> Nueva tabla
          </button>
        </div>
      )}
    </>
  );
}

const dateFormat = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

function TableCard({ table }: { table: TableSummary }) {
  const deleteTable = useBoardStore((s) => s.deleteTable);
  const { openEntityDialog, askConfirm } = useUiStore();

  return (
    <div className="group relative flex min-h-36 flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
      <Link href={`/tables/${table.id}`} className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-ring" aria-label={table.title} />
      <div className="pointer-events-none flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 text-[15px] font-semibold">{table.title}</h3>
        <ActionMenu
          className="pointer-events-auto -mt-1 -mr-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
          items={[
            {
              label: "Editar",
              icon: <PencilIcon size={14} />,
              onSelect: () => openEntityDialog({ kind: "table", id: table.id }),
            },
            {
              label: "Eliminar",
              icon: <TrashIcon size={14} />,
              danger: true,
              onSelect: () =>
                askConfirm({
                  title: "Eliminar tabla",
                  message: `Se eliminará “${table.title}” junto con todas sus columnas y tareas. Esta acción no se puede deshacer.`,
                  onConfirm: () => deleteTable(table.id),
                }),
            },
          ]}
        />
      </div>
      <p className="pointer-events-none mt-1 line-clamp-2 flex-1 text-[13px] text-muted">
        {table.description || <span className="text-subtle">Sin descripción</span>}
      </p>
      <div className="pointer-events-none mt-4 flex items-center gap-3 text-[12px] text-muted">
        <span>{table.columnCount} {table.columnCount === 1 ? "columna" : "columnas"}</span>
        <span className="size-0.5 rounded-full bg-subtle" />
        <span>{table.taskCount} {table.taskCount === 1 ? "tarea" : "tareas"}</span>
        <span className="ml-auto">{dateFormat.format(new Date(table.updatedAt))}</span>
      </div>
    </div>
  );
}
