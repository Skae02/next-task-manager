"use client";

import { useSyncExternalStore } from "react";
import { AlertIcon, DangerIcon } from "@/components/icons";
import { cx } from "@/components/ui";
import { formatTaskEndDate, taskDeadlineStatus } from "@/lib/task-dates";

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 30_000);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

const serverToday = () => "";

/** Date-only deadlines remain valid throughout the user's local due day. */
export function TaskEndDate({ endDate, completed = false }: { endDate: string | null; completed?: boolean }) {
  const today = useSyncExternalStore(subscribe, localToday, serverToday);
  if (!endDate) return <span className="text-subtle">Sin fecha</span>;

  const status = taskDeadlineStatus(endDate, today, completed);
  const StatusIcon = status?.kind === "overdue" ? DangerIcon : AlertIcon;

  return (
    <span className={cx(
      "inline-flex max-w-full flex-wrap items-center gap-1.5",
      status && "rounded-md px-2 py-1",
      status?.kind === "soon" && "bg-amber-400/15 text-amber-700 dark:text-amber-300",
      status && status.kind !== "soon" && "bg-danger-soft text-danger",
    )}>
      <time dateTime={endDate}>{formatTaskEndDate(endDate)}</time>
      {status && (
        <span tabIndex={0} title={status.message} aria-label={status.message}
          className="inline-flex shrink-0 cursor-help rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-current">
          <StatusIcon size={14} />
        </span>
      )}
    </span>
  );
}
