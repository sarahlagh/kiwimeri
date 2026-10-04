import { ConnectionStatus } from '@capacitor/network';
import { createContext, use } from 'react';

interface NetworkStatusContextSpec {
  status?: ConnectionStatus;
}

const NetworkStatusContext = createContext<
  NetworkStatusContextSpec | undefined
>(undefined);

export const useNetworkStatus = () => {
  const context = use(NetworkStatusContext);
  if (context === undefined) {
    throw new Error(
      'useNetworkStatus must be used within a NetworkStatusProvider'
    );
  }
  return context.status;
};

export default NetworkStatusContext;
