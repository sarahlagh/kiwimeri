import { AnyData } from '@/db/types/store-types';

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
// not creating a hook for this as this is slower than actually calling useLocation
export function getSearchParams(search: string) {
  const obj = {} as SearchParamsType;
  for (const param of QUERY_PARAMS) {
    obj[param] = handleParam(search, param);
  }
  return obj;
}

export function fastHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i); // hashing algorithm
    hash |= 0; // convert to 32bit integer
  }
  return hash;
}

export const minimizeKeys = (
  obj: AnyData,
  keys: Map<string, string>,
  keywords: Map<string, string>
) => {
  const m = {} as AnyData;
  if (!obj) return obj;
  Object.keys(obj).forEach(k => {
    const newKey = keys.has(k) ? keys.get(k)! : k;
    if (typeof obj[k] === 'string') {
      m[newKey] = keywords.has(obj[k]) ? keywords.get(obj[k]) : obj[k];
    } else if (typeof obj[k] === 'number') {
      m[newKey] = obj[k];
    } else if (Array.isArray(obj[k])) {
      m[newKey] = obj[k].map(o => minimizeKeys(o, keys, keywords));
    } else {
      m[newKey] = minimizeKeys(obj[k], keys, keywords);
    }
  });
  return m;
};

export const unminimizeKeys = (
  obj: AnyData,
  keys: Map<string, string>,
  keywords: Map<string, string>
) => {
  const m = {} as AnyData;
  if (!obj) return obj;
  Object.keys(obj).forEach(k => {
    const newKey = keys.has(k) ? keys.get(k)! : k;
    if (typeof obj[k] === 'string') {
      m[newKey] = keywords.has(obj[k]) ? keywords.get(obj[k]) : obj[k];
    } else if (typeof obj[k] === 'number') {
      m[newKey] = obj[k];
    } else if (Array.isArray(obj[k])) {
      m[newKey] = obj[k].map(o => unminimizeKeys(o, keys, keywords));
    } else {
      m[newKey] = unminimizeKeys(obj[k], keys, keywords);
    }
  });
  return m;
};
