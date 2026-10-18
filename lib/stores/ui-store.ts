"use client";

import { create } from "zustand";

export type EntityDialog =
  | { kind: "table"; id?: string }
  | { kind: "column"; tableId: string; id?: string };

export type ConfirmDialog = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
};

export type Toast = { id: number; message: string; tone: "error" | "info" };

type UiState = {
  toast: Toast | null;
  showToast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: () => void;

  /** Task shown in the detail modal. */
  openTaskId: string | null;
  /** Create/edit dialog for tables and columns (no `id` means create). */
  entityDialog: EntityDialog | null;
  confirm: ConfirmDialog | null;

  openTask: (id: string) => void;
  closeTask: () => void;
  openEntityDialog: (dialog: EntityDialog) => void;
  closeEntityDialog: () => void;
  askConfirm: (dialog: ConfirmDialog) => void;
  closeConfirm: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
  toast: null,
  showToast: (message, tone = "error") => set({ toast: { id: Date.now(), message, tone } }),
  dismissToast: () => set({ toast: null }),
  openTaskId: null,
  entityDialog: null,
  confirm: null,

  openTask: (id) => set({ openTaskId: id }),
  closeTask: () => set({ openTaskId: null }),
  openEntityDialog: (entityDialog) => set({ entityDialog }),
  closeEntityDialog: () => set({ entityDialog: null }),
  askConfirm: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null }),
}));
