"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckIcon, ChevronLeftIcon } from "@/components/icons";
import { Avatar, Button, Field, FormError, Input, Spinner, TagPill, Textarea, cx, tagStyles } from "@/components/ui";
import { findTask, useBoardStore } from "@/lib/stores/board-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { useForm } from "@/lib/use-form";
import { TAG_COLORS, type TableDetail, type TagColor } from "@/lib/types";

type Props = { tableId: string } & ({ mode: "create"; columnId: string } | { mode: "edit"; taskId: string });

/** Loads the table if needed, then renders the form for a new or existing task. */
export function TaskEditor(props: Props) {
  const { current, currentStatus, currentError, loadTable } = useBoardStore();
  const user = useAuthStore((s) => s.user);
  const table = current?.id === props.tableId ? current : null;

  useEffect(() => {
    if (!table) loadTable(props.tableId);
  }, [table, props.tableId, loadTable]);

  if (currentStatus === "error") {
    return <NotFound message={currentError ?? "No se pudo cargar la tabla"} />;
  }
  // Wait for the user too, so a new task can default to "assigned to me".
  if (!table || !user) {
    return (
      <div className="flex justify-center py-24 text-muted">
        <Spinner />
      </div>
    );
  }

  const found = props.mode === "edit" ? findTask(table, props.taskId) : null;
  const columnId = props.mode === "create" ? props.columnId : found?.column.id;
  if (!columnId || !table.columns.some((r) => r.id === columnId)) {
    return <NotFound message={props.mode === "edit" ? "Tarea no encontrada" : "Columna no encontrada"} />;
  }

  return <TaskForm key={found?.task.id ?? columnId} table={table} columnId={columnId} task={found?.task ?? null} />;
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="py-24 text-center">
      <p className="font-medium">{message}</p>
      <Link href="/tables" className="mt-2 inline-block text-accent hover:underline">
        Volver a tus tablas
      </Link>
    </div>
  );
}

type TaskFormProps = {
  table: TableDetail;
  columnId: string;
  task: TableDetail["columns"][number]["tasks"][number] | null;
};

function TaskForm({ table, columnId, task }: TaskFormProps) {
  const router = useRouter();
  const { createTask, updateTask } = useBoardStore();
  const openTask = useUiStore((s) => s.openTask);
  const user = useAuthStore((s) => s.user);
  const backHref = `/tables/${table.id}`;

  const { values, setValues, bind, submit, submitting, fieldErrors, formError } = useForm({
    title: task?.title ?? "",
    description: task?.description ?? "",
    tagLabel: task?.tagLabel ?? "",
    tagColor: (task?.tagColor ?? "blue") as string,
    columnId,
    assigneeId: task ? (task.assignee?.id ?? "") : (user?.id ?? ""),
  });
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  const onSubmit = submit(async (v) => {
    const hasTag = v.tagLabel.trim() !== "";
    const input = {
      title: v.title,
      description: v.description,
      tagLabel: hasTag ? v.tagLabel : null,
      tagColor: hasTag ? (v.tagColor as TagColor) : null,
      assigneeId: v.assigneeId || null,
    };
    const saved = task
      ? await updateTask(task.id, { ...input, columnId: v.columnId })
      : await createTask(v.columnId, input);
    router.push(backHref);
    openTask(saved.id);
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeftIcon size={14} /> {table.title}
      </Link>
      <h1 className="mb-6 text-[24px] font-semibold tracking-tight">{task ? "Editar tarea" : "Nueva tarea"}</h1>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <FormError message={formError} />

        <Field label="Título" error={fieldErrors.title}>
          {(id) => <Input id={id} autoFocus placeholder="¿Qué hay que hacer?" {...bind("title")} />}
        </Field>

        <Field label="Descripción" error={fieldErrors.description}>
          {(id) => <Textarea id={id} rows={6} placeholder="Añade contexto, enlaces o criterios de aceptación…" {...bind("description")} />}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Columna" error={fieldErrors.columnId}>
            {(id) => (
              <select
                id={id}
                value={values.columnId}
                onChange={(e) => set({ columnId: e.target.value })}
                className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 outline-none focus:border-accent focus:ring-4 focus:ring-ring"
              >
                {table.columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Asignado a" error={fieldErrors.assigneeId}>
            {() => (
              <div className="flex h-9 rounded-lg bg-sunken p-0.5">
                {[
                  { value: user?.id ?? "", label: "A mí" },
                  { value: "", label: "Sin asignar" },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    disabled={option.value === "" ? false : !user}
                    onClick={() => set({ assigneeId: option.value })}
                    className={cx(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-all",
                      values.assigneeId === option.value ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
                    )}
                  >
                    {option.value && <Avatar name={user?.fullName} size={16} />}
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </Field>
        </div>

        <Field label="Etiqueta" error={fieldErrors.tagLabel ?? fieldErrors.tagColor} hint="Déjala vacía si no la necesitas">
          {(id) => (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Input id={id} placeholder="p. ej. Diseño, Bug, Urgente" maxLength={30} {...bind("tagLabel")} />
                <span className="shrink-0">
                  <TagPill label={values.tagLabel.trim() || null} color={values.tagColor as TagColor} />
                </span>
              </div>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color de la etiqueta">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={values.tagColor === color}
                    aria-label={color}
                    onClick={() => set({ tagColor: color })}
                    className={cx(
                      "flex size-6 items-center justify-center rounded-full text-white outline-none transition-transform hover:scale-110 focus-visible:ring-4 focus-visible:ring-ring",
                      tagStyles[color].dot,
                      values.tagColor === color && "ring-2 ring-offset-2 ring-line-strong ring-offset-surface",
                    )}
                  >
                    {values.tagColor === color && <CheckIcon size={12} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <Button type="button" onClick={() => router.push(backHref)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            {task ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </div>
      </form>
    </div>
  );
}
