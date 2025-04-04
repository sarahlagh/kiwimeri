import { Capacitor, CapacitorHttp } from '@capacitor/core';

if (Capacitor.getPlatform() === 'android') {
  window.fetch = async (...args) => {
    const [resource, config] = args;
    const options = {
      url: resource.toString(),
      ...config
    };
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return CapacitorHttp.request(options as any).then(
      res => res as unknown as Response
    );
  };
}
