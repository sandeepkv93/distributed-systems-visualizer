export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
}

type ToastListener = (toast: ToastMessage) => void;

const listeners = new Set<ToastListener>();
let toastCounter = 0;

export function showToast(
  message: string,
  variant: ToastVariant = 'info',
  title?: string
): void {
  toastCounter += 1;
  const toast: ToastMessage = {
    id: `toast-${toastCounter}-${Date.now()}`,
    variant,
    title,
    message,
  };
  listeners.forEach((listener) => {
    listener(toast);
  });
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
