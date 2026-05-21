import { ToastOptions } from '@ionic/react';
import { HookOverlayOptions } from '@ionic/react/dist/types/hooks/HookOverlayOptions';
import { createContext, useContext } from 'react';

interface ToastContextSpec {
  present: {
    (message: string, duration?: number | undefined): Promise<void>;
    (options: ToastOptions & HookOverlayOptions): Promise<void>;
  };

  setToast: (message: string, color?: string) => Promise<void>;
}

const ToastContext = createContext<ToastContextSpec | undefined>(undefined);

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
