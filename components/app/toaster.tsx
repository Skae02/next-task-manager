"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { XIcon } from "@/components/icons";
import { cx } from "@/components/ui";
import { useUiStore } from "@/lib/stores/ui-store";

const TOAST_MS = 4500;

/** Shows the latest toast from the UI store at the bottom of the screen. */
export function Toaster() {
  const { toast, dismissToast } = useUiStore();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissToast, TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
            className={cx(
              "pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-surface px-4 py-3 text-[13px] shadow-pop",
              toast.tone === "error" && "text-danger",
            )}
          >
            <span className="flex-1">{toast.message}</span>
            <button onClick={dismissToast} className="text-muted hover:text-fg" aria-label="Cerrar aviso">
              <XIcon size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
