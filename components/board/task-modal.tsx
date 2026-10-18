"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PencilIcon, ColumnsIcon, TagIcon, TrashIcon, UserIcon } from "@/components/icons";
import { Avatar, Button, Modal, TagPill } from "@/components/ui";
import { findTask, useBoardStore } from "@/lib/stores/board-store";
import { useUiStore } from "@/lib/stores/ui-store";
import type { UserRef } from "@/lib/types";

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

export function TaskModal() {
  const { openTaskId, closeTask, askConfirm } = useUiStore();
  const current = useBoardStore((s) => s.current);
  const deleteTask = useBoardStore((s) => s.deleteTask);
  const found = findTask(current, openTaskId);

  const onDelete = () => {
    if (!found) return;
    askConfirm({
      title: "Eliminar tarea",
      message: `Se eliminará “${found.task.title}”.`,
      onConfirm: async () => {
        await deleteTask(found.task.id);
        closeTask();
      },
    });
  };

  return (
    <Modal open={Boolean(found)} onClose={closeTask} width="lg">
      {found && (
        <div className="pt-5">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] text-muted">
            <ColumnsIcon size={13} /> {found.column.title}
          </div>
          <h2 className="text-[20px] font-semibold leading-snug tracking-tight">{found.task.title}</h2>

          <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_200px]">
            <div className="min-w-0">
              <h3 className="mb-1.5 text-[12px] font-medium text-muted">Descripción</h3>
              {found.task.description ? (
                <p className="whitespace-pre-wrap break-words leading-relaxed">{found.task.description}</p>
              ) : (
                <p className="text-subtle">Sin descripción</p>
              )}
            </div>

            <dl className="flex flex-col gap-3.5 rounded-xl bg-surface-2 p-3.5 text-[13px] sm:border sm:border-line">
              <Detail icon={<TagIcon size={13} />} label="Etiqueta">
                {found.task.tagLabel ? <TagPill label={found.task.tagLabel} color={found.task.tagColor} /> : <Empty />}
              </Detail>
              <Detail icon={<UserIcon size={13} />} label="Autor">
                <Person user={found.task.author} />
              </Detail>
              <Detail icon={<UserIcon size={13} />} label="Asignado a">
                {found.task.assignee ? <Person user={found.task.assignee} /> : <Empty />}
              </Detail>
              <div className="border-t border-line pt-3 text-[11.5px] leading-relaxed text-muted">
                Creada {dateFormat.format(new Date(found.task.createdAt))}
                <br />
                Editada {dateFormat.format(new Date(found.task.updatedAt))}
              </div>
            </dl>
          </div>

          <div className="mt-6 flex justify-between gap-2 border-t border-line pt-4">
            <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={onDelete}>
              <TrashIcon size={15} /> Eliminar
            </Button>
            <div className="flex gap-2">
              <Button onClick={closeTask}>Cerrar</Button>
              <Link
                href={`/tables/${found.column.tableId}/tasks/${found.task.id}/edit`}
                onClick={closeTask}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
              >
                <PencilIcon size={15} /> Editar
              </Link>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="mb-1 flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
        {icon} {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function Person({ user }: { user: UserRef }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar name={user.fullName ?? user.alias} size={20} />
      <span className="truncate">{user.alias ?? user.fullName}</span>
    </span>
  );
}

const Empty = () => <span className="text-subtle">—</span>;
