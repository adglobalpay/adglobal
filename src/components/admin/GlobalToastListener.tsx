import { useEffect } from 'react';
import { toast } from 'sonner';

export default function GlobalToastListener() {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { type, message, description } = detail;
      switch (type) {
        case 'success':
          toast.success(message, { description });
          break;
        case 'error':
          toast.error(message, { description });
          break;
        case 'warning':
          toast.warning(message, { description });
          break;
        case 'info':
          toast.info(message, { description });
          break;
        default:
          toast(message, { description });
      }
    };
    window.addEventListener('show-toast', handler);
    return () => window.removeEventListener('show-toast', handler);
  }, []);
  return null;
}
