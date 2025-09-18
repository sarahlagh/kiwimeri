import {
  ConnectionStatus,
  ConnectionStatusChangeListener,
  Network
} from '@capacitor/network';

class NetworkService {
  private networkStatus: ConnectionStatus | null = null;
  private listeners: ConnectionStatusChangeListener[] = [];

  constructor() {
    Network.addListener('networkStatusChange', status => {
      if (
        !this.networkStatus ||
        this.networkStatus.connected !== status.connected
      ) {
        console.debug('[network] network status changed', status);
        this.networkStatus = status;
        this.fireInternalListeners(status);
      }
    });
  }

  async init() {
    const status = await Network.getStatus();
    console.debug('[network] got init status', status);
    if (!this.networkStatus) {
      this.networkStatus = status;
      this.fireInternalListeners(status);
    }
  }

  private fireInternalListeners(status: ConnectionStatus) {
    console.debug(`[network] ${this.listeners.length} listeners to notify`);
    this.listeners.forEach(listener => listener(status));
  }

  onStatusUp(callback: () => void, onInit = false, callbackName?: string) {
    console.debug(
      '[network] adding up listener',
      callbackName,
      this.listeners.length
    );
    const l = this.listeners.push(status => {
      if (status.connected) {
        console.debug('[network] on status up callback', callbackName, status);
        callback();
      }
    });
    if (onInit && this.networkStatus && this.networkStatus.connected) {
      console.debug(
        '[network] on status up callback - fire init value',
        callbackName
      );
      this.listeners[l - 1](this.networkStatus);
    }
    return this.listeners[l - 1];
  }

  onStatusChange(
    callback: (status: ConnectionStatus) => void,
    onInit = false,
    callbackName?: string
  ) {
    console.debug(
      '[network] adding change listener',
      callbackName,
      this.listeners.length
    );
    const l = this.listeners.push(status => {
      console.debug(
        '[network] on status change callback',
        callbackName,
        status
      );
      callback(status);
    });
    if (onInit && this.networkStatus) {
      this.listeners[l - 1](this.networkStatus);
    }
    return this.listeners[l - 1];
  }

  getStatus() {
    return this.networkStatus;
  }

  removeListener(listener: ConnectionStatusChangeListener) {
    const idx = this.listeners.findIndex(l => l === listener);
    if (idx >= 0) {
      console.debug('[network] removing network listener', idx);
      this.listeners.splice(idx, 1);
    }
  }

  stop() {
    console.debug('[network] stop');
    this.listeners.length = 0;
  }
}

export const networkService = new NetworkService();
