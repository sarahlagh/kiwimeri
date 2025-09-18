import NetworkStatusContext from '@/common/context/NetworkStatusContext';
import { networkService } from '@/common/services/network.service';
import { ConnectionStatus } from '@capacitor/network';
import { ReactNode, useEffect, useState } from 'react';

type NetworkStatusProviderProps = {
  readonly children?: ReactNode;
};

export const NetworkStatusProvider = ({
  children
}: NetworkStatusProviderProps) => {
  const [status, setStatus] = useState<ConnectionStatus>();
  useEffect(() => {
    const appInit = async () => {
      await networkService.init();
    };
    appInit();

    networkService.onStatusChange(
      status => {
        setStatus(status);
      },
      true,
      '[NetworkStatusProvider]'
    );

    return () => {
      networkService.stop();
    };
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ status }}>
      {children}
    </NetworkStatusContext.Provider>
  );
};
