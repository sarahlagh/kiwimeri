import { useCallback, useSyncExternalStore } from 'react';

type Breakpoints =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | { customMediaQuery: string };

// Convert breakpoints to actual CSS media query string
const getMediaQuery = (breakpoint: Breakpoints): string => {
  if (typeof breakpoint === 'string') {
    switch (breakpoint) {
      case 'xs':
        return '(min-width: 0px)';
      case 'sm':
        return '(min-width: 576px)';
      case 'md':
        return '(min-width: 768px)';
      case 'lg':
        return '(min-width: 992px)';
      case 'xl':
        return '(min-width: 1200px)';
      default:
        throw new Error(`Unknown breakpoint: ${breakpoint}`);
    }
  } else {
    return breakpoint.customMediaQuery;
  }
};

export const useMediaQueryMatch = (breakpoint: Breakpoints): boolean => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined') {
        return () => {};
      }
      const mediaQueryList = window.matchMedia(getMediaQuery(breakpoint));
      mediaQueryList.addEventListener('change', onStoreChange);
      return () => {
        mediaQueryList.removeEventListener('change', onStoreChange);
      };
    },
    [breakpoint]
  );
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(getMediaQuery(breakpoint)).matches;
  }, [breakpoint]);
  return useSyncExternalStore(subscribe, getSnapshot);
};
