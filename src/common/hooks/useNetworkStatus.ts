import { ConnectionStatus, Network } from '@capacitor/network';
import { useEffect, useState } from 'react';

const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<ConnectionStatus>({
    connected: false,
    connectionType: 'none'
  });

  useEffect(() => {
    async function getFirstNetworkStatus() {
      const status = await Network.getStatus();
      console.debug('on first connection', status);
      setNetworkStatus(status);
    }
    getFirstNetworkStatus();
  }, []);

  Network.addListener('networkStatusChange', status => {
    if (networkStatus.connected !== status.connected) {
      console.debug('network status changed', status);
      networkStatus.connected = status.connected;
      setNetworkStatus(status);
    }
  });

  return networkStatus;
};

export default useNetworkStatus;
