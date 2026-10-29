"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "@/components/icons";
import { Avatar, Button, ColorPicker, Field, FormError, Input, Spinner, TagPill, Textarea, cx } from "@/components/ui";
import { findTask, useBoardStore } from "@/lib/stores/board-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { useForm } from "@/lib/use-form";
import { MAX_TASK_TAGS, type TaskTagInput, type Color, type TableDetail } from "@/lib/types";

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

  const [tags, setTags] = useState<TaskTagInput[]>(task?.tags.map(({ label, color }) => ({ label, color })) ?? []);
  const [draft, setDraft] = useState<TaskTagInput | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [tagError, setTagError] = useState<string>();
  const closeDraft = () => { setDraft(null); setEditing(null); setTagError(undefined); };
  const confirmTag = () => {
    if (!draft) return;
    const label = draft.label.trim();
    if (!label || label.length > 30) { setTagError("Ingresa un nombre de entre 1 y 30 caracteres"); return; }
    if (tags.some((tag, index) => index !== editing && tag.label.toLocaleLowerCase("es") === label.toLocaleLowerCase("es"))) {
      setTagError("Esta etiqueta ya existe"); return;
    }
    if (editing === null && tags.length >= MAX_TASK_TAGS) return;
    const tag = { ...draft, label };
    setTags((current) => editing === null ? [...current, tag] : current.map((item, index) => index === editing ? tag : item));
    closeDraft();
  };
  const { values, setValues, bind, submit, submitting, fieldErrors, formError } = useForm({
    title: task?.title ?? "",
    description: task?.description ?? "",

    // "" means no color: the form only holds strings.
    color: (task?.color ?? "") as string,
    columnId,
    assigneeId: task ? (task.assignee?.id ?? "") : (user?.id ?? ""),
  });
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  const onSubmit = submit(async (v) => {
    if (draft) { setTagError("Confirma la etiqueta antes de guardar la tarea"); return; }
    const input = {
      title: v.title,
      description: v.description,
      tags,
      color: (v.color || null) as Color | null,
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

        <fieldset className="min-w-0 space-y-3" disabled={submitting}>
          <legend className="text-[13px] font-medium">Etiquetas ({tags.length}/{MAX_TASK_TAGS})</legend>
          {fieldErrors.tags && <p role="alert" className="text-danger">{fieldErrors.tags}</p>}
          <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2 p-3">
            {tags.length === 0 && <span className="text-[12px] text-muted">Sin etiquetas agregadas</span>}
            {tags.map((tag, index) => (
              <button key={index} type="button" disabled={draft !== null} aria-label={`Editar etiqueta ${tag.label}`}
                className="max-w-full rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring cursor-pointer"
                onClick={() => { setEditing(index); setDraft({ ...tag }); setTagError(undefined); }}>
                <TagPill label={tag.label} color={tag.color} />
              </button>
            ))}
          </div>
          {draft && (
            <div className="space-y-3 rounded-lg border border-line p-3">
              <Field label="Nombre de la etiqueta" error={tagError}>
                {(id) => <Input id={id} autoFocus value={draft.label} maxLength={30} placeholder="p. ej. Bug"
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); confirmTag(); } }}
                  onChange={(event) => { setDraft({ ...draft, label: event.target.value }); setTagError(undefined); }} />}
              </Field>
              <ColorPicker label="Color de la etiqueta" value={draft.color} allowNone onChange={(color) => setDraft({ ...draft, color })} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TagPill label={draft.label} color={draft.color} />
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => {
                    if (editing !== null) setTags((current) => current.filter((_, index) => index !== editing));
                    closeDraft();
                  }}>Quitar</Button>
                  <Button type="button" variant="primary" onClick={confirmTag}>{editing === null ? "Agregar" : "Guardar"}</Button>
                </div>
              </div>
            </div>
          )}
          <Button type="button" disabled={tags.length >= MAX_TASK_TAGS || draft !== null}
            onClick={() => { setEditing(null); setDraft({ label: "", color: "blue" }); setTagError(undefined); }}>
            Agregar etiqueta
          </Button>
          <p className="text-[12px] text-muted">{tags.length >= MAX_TASK_TAGS ? "Máximo de 20 etiquetas por tarea" : "Hasta 20 etiquetas, con nombres únicos de hasta 30 caracteres."}</p>
        </fieldset>

        <Field label="Color de la tarea" error={fieldErrors.color} hint="Opcional, resalta la tarjeta en el tablero">
          {() => (
            <ColorPicker
              label="Color de la tarea"
              allowNone
              value={(values.color || null) as Color | null}
              onChange={(color) => set({ color: color ?? "" })}
            />
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
