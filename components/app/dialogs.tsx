"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, FormError, Input, Modal, Textarea } from "@/components/ui";
import { useBoardStore } from "@/lib/stores/board-store";
import { useUiStore, type EntityDialog as EntityDialogState } from "@/lib/stores/ui-store";
import { useForm } from "@/lib/use-form";

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

  const existing =
    dialog?.kind === "table"
      ? (store.tables.find((t) => t.id === dialog.id) ??
        (store.current?.id === dialog.id ? store.current : undefined))
      : dialog?.kind === "column"
        ? store.current?.columns.find((r) => r.id === dialog.id)
        : undefined;

  const { bind, submit, submitting, fieldErrors, formError } = useForm({
    title: existing?.title ?? "",
    description: existing?.description ?? "",
  });

  const isEdit = Boolean(dialog?.id);
  const noun = dialog?.kind === "column" ? "columna" : "tabla";

  const onSubmit = submit(async (values) => {
    if (!dialog) return;
    if (dialog.kind === "table") {
      if (dialog.id) await store.updateTable(dialog.id, values);
      else {
        const table = await store.createTable(values);
        router.push(`/tables/${table.id}`);
      }
    } else if (dialog.id) {
      await store.updateColumn(dialog.id, values);
    } else {
      await store.createColumn(dialog.tableId, values);
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
