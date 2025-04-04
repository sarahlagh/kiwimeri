import { Capacitor, CapacitorHttp, HttpOptions } from '@capacitor/core';

if (Capacitor.getPlatform() === 'android') {
  window.fetch = async (...args) => {
    let [resource, config] = args;
    const options: HttpOptions = {
      url: resource.toString(),
      ...config
    };
    const response = await CapacitorHttp.request(options);

    return response;
  };
}
