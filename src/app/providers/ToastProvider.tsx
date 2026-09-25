import ToastContext from '@/app/context/ToastContext';
import { useIonToast } from '@ionic/react';
import { HookOverlayOptions } from '@ionic/react/dist/types/hooks/HookOverlayOptions';
import { useLingui } from '@lingui/react/macro';
import { ReactNode } from 'react';

type ToastProviderProps = {
  readonly children?: ReactNode;
};

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const { t } = useLingui();
  const [present] = useIonToast();
  const setToast = (message: string, color?: string) =>
    present({ message, color, duration: 3000 });
  const setPersistentToast = (
    message: string,
    color?: string,
    onDidDismiss?: HookOverlayOptions['onDidDismiss']
  ) =>
    present({
      message,
      color,
      buttons: [
        {
          text: t`Dismiss`,
          role: 'cancel'
        }
      ],
      onDidDismiss
    });

  return (
    <ToastContext.Provider value={{ present, setToast, setPersistentToast }}>
      {children}
    </ToastContext.Provider>
  );
};
