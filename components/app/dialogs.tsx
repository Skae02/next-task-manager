"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ColorPicker, Field, FormError, Input, Modal, Textarea } from "@/components/ui";
import { useBoardStore } from "@/lib/stores/board-store";
import { useUiStore, type EntityDialog as EntityDialogState } from "@/lib/stores/ui-store";
import { useForm } from "@/lib/use-form";
import type { Color } from "@/lib/types";

/** Mounted once in the app layout; renders whichever global dialog is open. */
export function GlobalDialogs() {
  const entityDialog = useUiStore((s) => s.entityDialog);
  return (
    <>
      {/* Keyed so the form resets each time a different entity is opened. */}
      <EntityDialog key={entityDialog ? JSON.stringify(entityDialog) : "closed"} dialog={entityDialog} />
      <ConfirmDialog />
    </>
  );
}

function EntityDialog({ dialog }: { dialog: EntityDialogState | null }) {
  const router = useRouter();
  const close = useUiStore((s) => s.closeEntityDialog);
  const store = useBoardStore();

  const currentTableId = store.current?.id;
  const loadTable = store.loadTable;
  useEffect(() => {
    if (dialog?.kind === "table" && dialog.id && currentTableId !== dialog.id) void loadTable(dialog.id);
  }, [dialog, currentTableId, loadTable]);

  const existing =
    dialog?.kind === "table"
      ? ((store.current?.id === dialog.id ? store.current : undefined) ??
        store.tables.find((t) => t.id === dialog.id))
      : dialog?.kind === "column"
        ? store.current?.columns.find((r) => r.id === dialog.id)
        : undefined;

  const { values, setValues, bind, submit, submitting, fieldErrors, formError } = useForm({
    isCompletion: dialog?.kind === "column" && Boolean(dialog.id) && store.current?.completionColumnId === dialog.id ? "true" : "false",
    completionColumnId: existing && "completionColumnId" in existing ? existing.completionColumnId ?? "" : "",
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    // "" means no color: the form only holds strings.
    color: (existing?.color ?? "") as string,
  });

  const isEdit = Boolean(dialog?.id);
  const noun = dialog?.kind === "column" ? "columna" : "tabla";

  const onSubmit = submit(async (v) => {
    if (!dialog) return;
    const values = { title: v.title, description: v.description, color: (v.color || null) as Color | null };
    if (dialog.kind === "table") {
      if (dialog.id) await store.updateTable(dialog.id, { ...values, completionColumnId: v.completionColumnId || null });
      else {
        const table = await store.createTable(values);
        router.push(`/tables/${table.id}`);
      }
    } else if (dialog.id) {
      await store.updateColumn(dialog.id, { ...values, isCompletion: v.isCompletion === "true" });
    } else {
      await store.createColumn(dialog.tableId, { ...values, isCompletion: v.isCompletion === "true" });
    }
    close();
  });

  return (
    <Modal open={Boolean(dialog)} onClose={close} title={`${isEdit ? "Editar" : "Nueva"} ${noun}`}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 pt-2" noValidate>
        <FormError message={formError} />
        <Field label="Título" error={fieldErrors.title}>
          {(id) => <Input id={id} autoFocus placeholder={noun === "tabla" ? "Lanzamiento Q4" : "Por hacer"} {...bind("title")} />}
        </Field>
        <Field label="Descripción" error={fieldErrors.description}>
          {(id) => <Textarea id={id} placeholder="Opcional" {...bind("description")} />}
        </Field>
        {dialog?.kind === "column" && (
          <Field label="Columna de finalización" error={fieldErrors.isCompletion}>
            {(id) => <div className="space-y-2">
              <label htmlFor={id} className="flex cursor-pointer items-center gap-2">
                <input id={id} type="checkbox" checked={values.isCompletion === "true"}
                  onChange={(event) => setValues((current) => ({ ...current, isCompletion: String(event.target.checked) }))}
                  className="size-4 accent-accent" />
                Marcar como columna de finalización
              </label>
              <p className="text-xs text-muted">Las tareas de esta columna se consideran terminadas y no muestran alertas de vencimiento. Al sacarlas, se reabren.</p>
              {values.isCompletion === "true" && store.current?.completionColumnId !== dialog.id && (
                <p role="status" className="text-xs text-danger">Al guardar, las tareas de esta columna se completarán. Si ya hay otra columna de finalización, perderá esa función y sus tareas se reabrirán.</p>
              )}
              {values.isCompletion === "false" && Boolean(dialog.id) && store.current?.completionColumnId === dialog.id && (
                <p role="status" className="text-xs text-danger">Al guardar, estas tareas se reabrirán y el tablero quedará sin columna de finalización.</p>
              )}
            </div>}
          </Field>
        )}
        {dialog?.kind === "table" && isEdit && store.current?.id === dialog.id && (
          <Field label="Columna de finalización" error={fieldErrors.completionColumnId}>
            {(id) => <div className="space-y-2">
              <select id={id} {...bind("completionColumnId")} className="h-10 w-full rounded-lg border border-line bg-surface px-3">
                <option value="">Sin columna de finalización</option>
                {store.current?.columns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}
              </select>
              <p className="text-xs text-muted">Mover una tarea a esta columna la termina; sacarla la reabre.</p>
              {values.completionColumnId !== (store.current?.completionColumnId ?? "") && (
                <p role="status" className="text-xs text-danger">Al guardar, las tareas de la columna anterior se reabrirán y las de la nueva se marcarán como terminadas. Sin selección, el tablero quedará sin columna de finalización.</p>
              )}
              {!store.current?.completionColumnId && <p className="text-xs text-muted">Este tablero aún no tiene columna de finalización.</p>}
            </div>}
          </Field>
        )}
        <Field label="Color" error={fieldErrors.color} hint="Opcional, para distinguirla de un vistazo">
          {() => (
            <ColorPicker
              label={`Color de la ${noun}`}
              allowNone
              value={(values.color || null) as Color | null}
              onChange={(color) => setValues((current) => ({ ...current, color: color ?? "" }))}
            />
          )}
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            {isEdit ? "Guardar" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmDialog() {
  const { confirm, closeConfirm } = useUiStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    setError(null);
    try {
      await confirm.onConfirm();
      closeConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  };

  const onClose = () => {
    setError(null);
    closeConfirm();
  };

  return (
    <Modal open={Boolean(confirm)} onClose={onClose} title={confirm?.title} width="sm">
      <p className="text-muted">{confirm?.message}</p>
      <FormError message={error} />
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={onConfirm} loading={busy}>
          {confirm?.confirmLabel ?? "Eliminar"}
        </Button>
      </div>
    </Modal>
  );
}
