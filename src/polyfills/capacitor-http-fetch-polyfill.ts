import { Capacitor, CapacitorHttp } from '@capacitor/core';

const origFetch = window.fetch;
if (Capacitor.getPlatform() === 'android') {
  window.fetch = async (...args) => {
    const [resource, config] = args;
    if (
      !resource.toString().startsWith('http://') &&
      !resource.toString().startsWith('https://')
    ) {
      return origFetch(resource, config);
    }
    const options = {
      url: resource.toString(),
      data: config?.body,
      ...config
    };
    // TODO: support multipart form
    // https://github.com/ionic-team/capacitor/pull/6708#issuecomment-1653366077
    // https://github.com/ionic-team/capacitor/pull/6206

    /* eslint-disable @typescript-eslint/no-explicit-any */
    return CapacitorHttp.request(options as any).then(
      res => ({ ...res, json: async () => res.data }) as unknown as Response
    );
  };
}

if (Capacitor.getPlatform() === 'electron' && (window as any).electronAPI) {
  const electronAPI = (window as any).electronAPI;
  window.fetch = async (...args) => {
    const [resource, config] = args;
    if (
      !resource.toString().startsWith('http://') &&
      !resource.toString().startsWith('https://')
    ) {
      return origFetch(resource, config);
    }
    const newConfig = config ? config : {};
    let headers = newConfig.headers ? newConfig.headers : {};
    headers = {
      ...headers,
      Accept: 'application/json, text/plain, */*',
      Connection: 'keep-alive'
    };
    newConfig.headers = headers;
    return electronAPI
      .forwardRequest(resource, newConfig)
      .then(
        (res: { data: any }) =>
          ({ ...res, json: async () => res.data }) as unknown as Response
      );
  };
}
