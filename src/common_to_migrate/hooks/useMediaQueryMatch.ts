import { useEffect, useState } from 'react';

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
  const [isMediaMatch, setIsMediaMatch] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(getMediaQuery(breakpoint)).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mediaQueryList = window.matchMedia(getMediaQuery(breakpoint));
    const handleMediaQueryChange = (e: MediaQueryListEvent): void => {
      setIsMediaMatch(e.matches);
    };

    setIsMediaMatch(mediaQueryList.matches);

    mediaQueryList.addEventListener('change', handleMediaQueryChange);
    return () => {
      mediaQueryList.removeEventListener('change', handleMediaQueryChange);
    };
  }, [breakpoint]);

  return isMediaMatch;
};
