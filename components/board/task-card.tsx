"use client";

import type { HTMLAttributes, KeyboardEvent, Ref } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, TagPill, colorStyles, cx } from "@/components/ui";
import { useUiStore } from "@/lib/stores/ui-store";
import type { Task } from "@/lib/types";

type TaskCardViewProps = HTMLAttributes<HTMLDivElement> & {
  task: Task;
  ref?: Ref<HTMLDivElement>;
  /** The original card while its copy is being dragged. */
  placeholder?: boolean;
  /** The floating copy that follows the pointer. */
  overlay?: boolean;
};

export function TaskCardView({ task, placeholder, overlay, className, ...props }: TaskCardViewProps) {
  const accent = task.color ? colorStyles[task.color] : null;
  return (
    <div
      className={cx(
        "relative flex w-full flex-col gap-2 overflow-hidden rounded-xl border border-line bg-surface p-3 text-left shadow-card outline-none",
        accent && ["bg-linear-to-r to-transparent pl-4", accent.wash].join(" "),
        "touch-manipulation select-none [-webkit-touch-callout:none]",
        overlay
          ? "cursor-grabbing rotate-2 border-line-strong shadow-pop"
          : "cursor-pointer transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-md focus-visible:ring-4 focus-visible:ring-ring",
        placeholder && "border-dashed opacity-40 shadow-none",
        className,
      )}
      {...props}
    >
      {accent && <span aria-hidden className={cx("absolute inset-y-0 left-0 w-[3px]", accent.dot)} />}
      <span className="line-clamp-2 text-[13.5px] font-medium leading-snug">{task.title}</span>
      {task.description && (
        <span className="line-clamp-2 text-[12.5px] leading-relaxed text-muted">{task.description}</span>
      )}
      {(task.tags.length > 0 || task.assignee) && (
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag) => <TagPill key={tag.id} label={tag.label} color={tag.color} />)}
            {task.tags.length > 3 && <span className="text-[11.5px] text-muted" aria-label={`${task.tags.length - 3} etiquetas más`}>+{task.tags.length - 3}</span>}
          </span>
          {task.assignee && <Avatar name={task.assignee.fullName ?? task.assignee.alias} size={20} />}
        </span>
      )}
    </div>
  );
}

/**
 * A card that can be dragged (mouse, touch or keyboard with Space) and opened
 * (click, tap or Enter).
 */
export function SortableTaskCard({ task }: { task: Task }) {
  const openTask = useUiStore((s) => s.openTask);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task" },
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !isDragging) {
      event.preventDefault();
      openTask(task.id);
      return;
    }
    listeners?.onKeyDown?.(event);
  };

  return (
    <TaskCardView
      ref={setNodeRef}
      task={task}
      placeholder={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={task.title}
      onKeyDown={onKeyDown}
      onClick={() => openTask(task.id)}
    />
  );
}
