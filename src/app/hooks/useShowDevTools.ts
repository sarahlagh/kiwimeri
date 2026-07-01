import { plt } from '@/core/infra/platform';
import useDeviceSetting from '@/shared/hooks/useDeviceSetting';

export default function useShowDevTools() {
  return useDeviceSetting('showDevTools') || !plt.isRelease();
}
