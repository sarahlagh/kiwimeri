import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

const QUERY_PARAMS = ['folder', 'document'] as const;

type SearchParams = typeof QUERY_PARAMS;
type SearchParamsType = {
  [key in SearchParams[number]]: string | undefined;
};

const handleParam = (search: string, paramName: string) => {
  const re = new RegExp(`(?:[?&])${paramName}=([^&]*)`, 'g');
  const match = re.exec(search);
  if (match?.length == 2) {
    return match[1];
  }
  return undefined;
};

// using react router 5 so, no useSearchParams
export function useSearchParams() {
  const [searchParams, setSearchParams] = useState<SearchParamsType | null>(
    null
  );
  const location = useLocation();
  useEffect(() => {
    const obj = {} as SearchParamsType;
    for (const param of QUERY_PARAMS) {
      obj[param] = handleParam(location.search, param);
    }
    setSearchParams(obj);
  }, [location.search]);
  return searchParams;
}
