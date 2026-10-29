"use client";

import { useEffect, useId, useState } from "react";
import { Input, TagPill } from "@/components/ui";
import type { TaskTagInput } from "@/lib/types";

type Props = {
  id: string;
  value: TaskTagInput;
  excluded: string[];
  onChange: (tag: TaskTagInput) => void;
  onConfirm: () => void;
};

export function TagNameInput({ id, value, excluded, onChange, onConfirm }: Props) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<TaskTagInput[]>([]);
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("Buscando etiquetas…");
  const options = suggestions.filter((tag) => !excluded.includes(tag.label.toLocaleLowerCase("es")));

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/tags?q=${encodeURIComponent(value.label)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("No se pudieron cargar las etiquetas");
        const data: { tags: TaskTagInput[] } = await response.json();
        if (!controller.signal.aborted) {
          setSuggestions(data.tags);
          setActive(-1);
          setStatus("Puedes escribir una etiqueta nueva");
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setStatus("No se pudieron cargar las sugerencias. Puedes crear una etiqueta nueva.");
        }
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value.label]);

  const select = (tag: TaskTagInput) => {
    onChange({ label: tag.label, color: tag.color });
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <Input id={id} autoFocus autoComplete="off" value={value.label} maxLength={30} placeholder="Busca o escribe una etiqueta"
        role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId}
        aria-activedescendant={open && active >= 0 && options[active] ? `${listId}-${active}` : undefined}
        onFocus={() => setOpen(true)}
        onChange={(event) => { onChange({ ...value, label: event.target.value }); setActive(-1); setOpen(true); setSuggestions([]); setStatus("Buscando etiquetas…"); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => options.length ? (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length : -1);
          } else if (event.key === "Escape" && open) {
            event.preventDefault(); event.stopPropagation(); setOpen(false);
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (open && active >= 0 && options[active]) select(options[active]);
            else onConfirm();
          }
        }} />
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
          <ul id={listId} role="listbox" aria-label="Tus etiquetas" className="max-h-48 overflow-y-auto p-1">
            {options.map((tag, index) => (
              <li key={`${tag.label}-${tag.color}`} id={`${listId}-${index}`} role="option" aria-selected={active === index}
                className={`cursor-pointer rounded-md p-2 ${active === index ? "bg-surface-2" : "hover:bg-surface-2"}`}
                onMouseDown={(event) => event.preventDefault()} onClick={() => select(tag)}>
                <TagPill label={tag.label} color={tag.color} />
              </li>
            ))}
          </ul>
          {!options.length && <p role="status" className="px-3 py-2 text-[12px] text-muted">{status}</p>}
        </div>
      )}
    </div>
  );
}
