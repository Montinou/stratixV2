import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

let toastCount = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = String(toastCount++);
    const newToast = { id, title, description, variant };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);

    // For now, just show an alert as a simple implementation
    if (variant === 'destructive') {
      console.error(`${title}: ${description}`);
    } else {
      console.log(`${title}: ${description}`);
    }
  }, []);

  return { toast, toasts };
}