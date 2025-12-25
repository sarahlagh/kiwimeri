import { AnyData } from '@/db/types/store-types';

const QUERY_PARAMS = [
  'folder',
  'document',
  'page',
  'query',
  'docVersion',
  'pageVersion'
] as const;

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
// TODO use new URLSearchParams(location.search)
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
  keywords: Map<string, string>,
  excludeKeys: string[] = []
) => {
  const m = {} as AnyData;
  if (!obj) return obj;
  Object.keys(obj).forEach(k => {
    const newKey = keys.has(k) ? keys.get(k)! : k;
    if (typeof obj[k] === 'string') {
      if (!excludeKeys.some(ek => ek === k)) {
        m[newKey] = keywords.has(obj[k]) ? keywords.get(obj[k]) : obj[k];
      } else {
        m[newKey] = obj[k];
      }
    } else if (typeof obj[k] === 'number') {
      m[newKey] = obj[k];
    } else if (Array.isArray(obj[k])) {
      m[newKey] = obj[k].map(o => minimizeKeys(o, keys, keywords, excludeKeys));
    } else {
      m[newKey] = minimizeKeys(obj[k], keys, keywords, excludeKeys);
    }
  });
  return m;
};

export const unminimizeKeys = (
  obj: AnyData,
  keys: Map<string, string>,
  keywords: Map<string, string>,
  excludeKeys: string[] = []
) => {
  const m = {} as AnyData;
  if (!obj) return obj;
  Object.keys(obj).forEach(k => {
    const newKey = keys.has(k) ? keys.get(k)! : k;
    if (typeof obj[k] === 'string') {
      if (!excludeKeys.some(ek => ek === newKey)) {
        m[newKey] = keywords.has(obj[k]) ? keywords.get(obj[k]) : obj[k];
      } else {
        m[newKey] = obj[k];
      }
    } else if (typeof obj[k] === 'number') {
      m[newKey] = obj[k];
    } else if (Array.isArray(obj[k])) {
      m[newKey] = obj[k].map(o =>
        unminimizeKeys(o, keys, keywords, excludeKeys)
      );
    } else {
      m[newKey] = unminimizeKeys(obj[k], keys, keywords, excludeKeys);
    }
  });
  return m;
};

export const dateLocale = 'fr-FR'; // TODO config
export const dateToStr = (
  format: 'time' | 'date' | 'datetime' | 'iso' | 'relative',
  ts?: number
) => {
  const date = ts ? new Date(ts) : new Date();
  let relativeSuff = '';
  switch (format) {
    case 'date':
      return date.toLocaleDateString(dateLocale);
    case 'time':
      return date.toLocaleTimeString(dateLocale);
    case 'datetime':
      return date.toLocaleString(dateLocale);
    case 'iso':
      return date.toISOString().substring(0, 19).replaceAll(/[:T]/g, '-');
    case 'relative':
      if (Date.now() - date.getTime() < 604800000) {
        const inDays = Math.ceil((Date.now() - date.getTime()) / 86400000);
        const inHours = Math.ceil((Date.now() - date.getTime()) / 3600000);
        const inMinutes = Math.ceil((Date.now() - date.getTime()) / 60000);
        const inSeconds = Math.ceil((Date.now() - date.getTime()) / 1000);
        if (inSeconds < 60)
          relativeSuff = ` ${inSeconds} second${inSeconds > 1 ? 's' : ''} ago`;
        else if (inMinutes < 60 * 2)
          relativeSuff = ` ${inMinutes} minute${inMinutes > 1 ? 's' : ''} ago`;
        else if (inHours < 24) relativeSuff = ` ${inHours} hours ago`;
        else if (inHours < 48) relativeSuff = ` yesterday`;
        else if (inDays < 7) relativeSuff = ` ${inDays} days ago`;
      }
      return date.toLocaleString(dateLocale) + relativeSuff;
  }
};

export const nOr0 = (key: string, obj?: AnyData, defaultValue: unknown = 0) => {
  if (!obj || !obj[key]) return defaultValue;
  return obj[key];
};
