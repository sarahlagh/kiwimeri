import { useMediaQueryMatch } from './useMediaQueryMatch';

export default function useIsWideEnough() {
  return useMediaQueryMatch('md');
}
