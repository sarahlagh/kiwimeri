import { plt } from '@/core/infra/platform';
import useDeviceSetting from './useDeviceSetting';

export default function useShowDevTools() {
  return useDeviceSetting('showDevTools') || !plt.isRelease();
}
