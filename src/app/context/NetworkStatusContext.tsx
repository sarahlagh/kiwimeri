import { ConnectionStatus } from '@capacitor/network';
import { createContext, useContext } from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface NetworkStatusContextSpec {
  status?: ConnectionStatus;
}

const NetworkStatusContext = createContext<
  NetworkStatusContextSpec | undefined
>(undefined);

export const useNetworkStatus = () => {
  const context = useContext(NetworkStatusContext);
  if (context === undefined) {
    throw new Error(
      'useNetworkStatus must be used within a NetworkStatusProvider'
    );
  }
  return context.status;
};

export default NetworkStatusContext;
