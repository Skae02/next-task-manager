"use client";

import { useEffect, useState, type ReactNode } from "react";
import { KanbanBoard } from "@/components/board/kanban-board";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/http";
import type { TableDetail, Task, TaskTagInput } from "@/lib/types";

const normalize = (text: string) => text.trim().toLocaleLowerCase("es");

export function FilteredBoard({ table, after }: { table: TableDetail; after?: ReactNode }) {
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<{ tags: TaskTagInput[] }>("/tags?all=1").then(({ tags }) => {
      if (cancelled) return;
      const unique = new Map(tags.map((tag) => [normalize(tag.label), tag.label]));
      setLabels([...unique.values()].sort((a, b) => a.localeCompare(b, "es")));
      setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [attempt, table]);

  const words = normalize(search).split(/\s+/).filter(Boolean);
  const matchesTask = (task: Task) => words.every((word) => normalize(task.title).includes(word))
    && (!label || task.tags.some((tag) => normalize(tag.label) === label));
  const tasks = table.columns.flatMap((column) => column.tasks);
  const count = tasks.filter(matchesTask).length;
  const filtering = words.length > 0 || label !== "";

  return (
    <>
      <section aria-label="Filtros de tareas" className="mb-5 space-y-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="task-search" className="mb-1 block text-[12px] font-medium">Buscar por título</label>
            <Input id="task-search" type="search" value={search} placeholder="Escribe palabras del título…" onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="min-w-0 sm:w-60">
            <label htmlFor="task-tag-filter" className="mb-1 block text-[12px] font-medium">Etiqueta</label>
            <select id="task-tag-filter" value={label} onChange={(event) => setLabel(event.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 outline-none focus:border-accent focus:ring-4 focus:ring-ring cursor-pointer">
              <option value="">Todas las etiquetas</option>
              {labels.map((name) => <option key={normalize(name)} value={normalize(name)}>{name}</option>)}
            </select>
          </div>
          <Button type="button" disabled={!filtering && !search} onClick={() => { setSearch(""); setLabel(""); }} className="cursor-pointer">Limpiar filtros</Button>
        </div>
        {status === "loading" && <p className="text-[12px] text-muted">Cargando tus etiquetas…</p>}
        {status === "error" && <div className="flex items-center gap-2 text-[12px] text-danger">
          No se pudieron cargar tus etiquetas.
          <Button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }}>Reintentar</Button>
        </div>}
        <p role="status" className="text-[12px] text-muted">
          {count} de {tasks.length} tareas{filtering && count === 0 ? ". No hay tareas que coincidan con los filtros." : ""}
        </p>
      </section>
      <KanbanBoard table={table} after={after} matchesTask={matchesTask} />
    </>
  );
}
