import {
  ConnectionStatus,
  ConnectionStatusChangeListener,
  Network
} from '@capacitor/network';

const initialStatus = await Network.getStatus();

class NetworkService {
  private networkStatus: ConnectionStatus;
  private listeners: Map<string, ConnectionStatusChangeListener> = new Map();

  constructor() {
    this.networkStatus = initialStatus;

    Network.addListener('networkStatusChange', status => {
      if (this.networkStatus.connected !== status.connected) {
        console.log('[network] network status changed', status);
        this.networkStatus = status;
        this.fireInternalListeners(status);
      }
    });
  }

  private fireInternalListeners(status: ConnectionStatus) {
    console.debug(`[network] ${this.listeners.size} listeners to notify`);
    this.listeners.values().forEach(listener => listener(status));
  }

  onStatusUp(callbackName: string, callback: () => void, onInit = false) {
    console.debug(
      '[network] adding "status up" listener',
      callbackName,
      this.listeners.size
    );
    this.listeners.set(callbackName, status => {
      if (status.connected) {
        console.debug(`[network]${callbackName} got status up`);
        callback();
      }
    });
    if (onInit && this.networkStatus && this.networkStatus.connected) {
      this.listeners.get(callbackName)!(this.networkStatus);
    }
    return this.listeners.get(callbackName);
  }

  onStatusChange(
    callbackName: string,
    callback: (status: ConnectionStatus) => void,
    onInit = false
  ) {
    console.debug(
      '[network] adding "status change" listener',
      callbackName,
      this.listeners.size
    );
    this.listeners.set(callbackName, status => {
      console.debug(
        `[network]${callbackName} got a status change`,
        status.connected
      );
      callback(status);
    });
    if (onInit && this.networkStatus) {
      this.listeners.get(callbackName)!(this.networkStatus);
    }
    return this.listeners.get(callbackName);
  }

  getStatus() {
    return this.networkStatus;
  }

  stop() {
    console.debug('[network] stop');
    this.listeners.clear();
  }
}

export const networkService = new NetworkService();
