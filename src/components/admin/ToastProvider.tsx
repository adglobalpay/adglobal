import { Toaster } from 'sonner';
import GlobalToastListener from './GlobalToastListener';

export default function ToastProvider() {
  return (
    <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
            fontWeight: 500,
          },
        }}
      />
      <GlobalToastListener />
    </>
  );
}
