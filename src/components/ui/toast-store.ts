import { create } from "zustand";

export type ToastTone = "info" | "success" | "error";
export type ToastAction = { label: string; onClick: () => void };
export type ToastItem = { id: number; tone: ToastTone; message: string; action?: ToastAction };

type ToastState = {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => void;
  dismiss: (id: number) => void;
};

const DURATION_MS = 4500;
let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    // Collapse identical messages (e.g. several queries failing while offline).
    if (get().toasts.some((t) => t.message === toast.message)) return;
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...toast, id }] }));
    setTimeout(() => get().dismiss(id), DURATION_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Callable from anywhere, including non-React code such as the query client. */
export const toast = {
  info: (message: string, action?: ToastAction) => useToastStore.getState().push({ tone: "info", message, action }),
  success: (message: string) => useToastStore.getState().push({ tone: "success", message }),
  error: (message: string, action?: ToastAction) => useToastStore.getState().push({ tone: "error", message, action }),
};
