"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/http";
import type { Priority } from "@/lib/types";
import { colorStyles, cx } from "@/components/ui";

export function PrioritySelect({ id, value, onChange, filter = false }: {
  id: string; value: string; onChange: (value: string) => void; filter?: boolean;
}) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api<{ priorities: Priority[] }>("/priorities").then(({ priorities }) => {
      if (!cancelled) { setPriorities(priorities); setError(false); }
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [attempt]);
  return (
    <>
      <select id={id} value={value} required={!filter} onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full cursor-pointer rounded-lg border border-line bg-surface px-2.5 outline-none focus:border-accent focus:ring-4 focus:ring-ring">
        {filter && <option value="">Todas las prioridades</option>}
        {!priorities.length && !filter && <option value={value}>{value === "none" ? "No prioritario" : "Cargando prioridad…"}</option>}
        {priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
      </select>
      {error && <p role="alert" className="mt-1 text-[12px] text-danger">No se pudieron cargar las prioridades. <button type="button" className="underline" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button></p>}
    </>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const color = priority.id === "high" ? "red" : priority.id === "medium" ? "yellow" : priority.id === "low" ? "blue" : "gray";
  return <span aria-label={`Prioridad: ${priority.name}`} className={cx("inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-medium", colorStyles[color].pill)}>
    <span aria-hidden className={cx("size-1.5 rounded-full", colorStyles[color].dot)} />{priority.name}
  </span>;
}
