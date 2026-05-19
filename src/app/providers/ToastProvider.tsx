import ToastContext from '@/common/context/ToastContext';
import { useIonToast } from '@ionic/react';
import { ReactNode } from 'react';

type ToastProviderProps = {
  readonly children?: ReactNode;
};

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [present] = useIonToast();
  const setToast = (message: string, color?: string) =>
    present({ message, color, duration: 3000 });

  return (
    <ToastContext.Provider value={{ present, setToast }}>
      {children}
    </ToastContext.Provider>
  );
};
