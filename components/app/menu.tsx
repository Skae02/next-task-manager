"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MoreIcon } from "@/components/icons";
import { Button, cx } from "@/components/ui";

export type MenuItem = {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
};

/** "…" button with a small popover of actions. */
export function ActionMenu({ items, label = "Acciones", className }: { items: MenuItem[]; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cx("relative", className)} onClick={(event) => event.stopPropagation()}>
      <Button variant="ghost" size="icon" aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <MoreIcon />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-40 mt-1 min-w-40 origin-top-right rounded-xl border border-line bg-surface p-1 shadow-pop"
          >
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cx(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px]",
                  item.danger ? "text-danger hover:bg-danger-soft" : "text-fg hover:bg-sunken/70",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
