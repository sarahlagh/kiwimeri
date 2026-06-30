import { useEffect, useState } from 'react';

type AppInfo = {
  name: string;
  short_name: string;
};

const useAppInfo = () => {
  const [appInfo, setAppInfo] = useState<AppInfo | undefined>();

  useEffect(() => {
    async function fetchAppInfo() {
      const res = await fetch('manifest.json');
      const data: AppInfo = await res.json();
      setAppInfo(data);
    }
    fetchAppInfo();
  }, []);

  return appInfo;
};

export default useAppInfo;
