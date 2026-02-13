import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

let toastCounter = 0;
const listeners: Array<(toast: Toast) => void> = [];

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({ title, description, variant }: Omit<Toast, 'id'>) => {
      const id = `toast-${++toastCounter}`;
      const t: Toast = { id, title, description, variant };

      // Simple implementation: show as console + brief alert-style
      if (variant === 'destructive') {
        console.error(`[Toast] ${title}: ${description || ''}`);
      } else {
        console.log(`[Toast] ${title}: ${description || ''}`);
      }

      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, 4000);
    },
    []
  );

  return { toast, toasts };
}
