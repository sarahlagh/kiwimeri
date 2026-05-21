import NetworkStatusContext from '@/app/context/NetworkStatusContext';
import { networkService } from '@/core/infra/network.service';
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
    networkService.onStatusChange(
      '[NetworkStatusProvider]',
      status => {
        setStatus(status);
      },
      true
    );
  }, [setStatus]);

  // useEffect(() => {
  //   networkService.onStatusChange(
  //     '[NetworkStatusProvider]',
  //     status => {
  //       setStatus(status);
  //     },
  //     true
  //   );

  //   return () => {
  //     networkService.stop();
  //   };
  // }, []);

  return (
    <NetworkStatusContext.Provider value={{ status }}>
      {children}
    </NetworkStatusContext.Provider>
  );
};
