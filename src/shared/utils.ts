import { AnyData, DbSerializableData } from '@/core/db/types';

const QUERY_PARAMS = ['folder', 'document', 'query', 'docVersion'] as const;

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
  if (obj === undefined || obj === null) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return obj;
  if (typeof obj === 'boolean') return obj;
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
    } else if (typeof obj[k] === 'boolean') {
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
  if (obj === undefined || obj === null) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return obj;
  if (typeof obj === 'boolean') return obj;
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
    } else if (typeof obj[k] === 'boolean') {
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

export const nOr0 = (key: string, obj?: AnyData, defaultValue: unknown = 0) => {
  if (!obj || !obj[key]) return defaultValue;
  return obj[key];
};

export const n00 = (n?: number) => n || 0;

export const countWords = (plain: string) => {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  return plain
    ? Array.from(segmenter.segment(plain)).filter(seg => seg.isWordLike).length
    : 0;
};

/** simplified deep equals good enough for most cell types */
export const cellEquals = (
  cell1?: DbSerializableData | unknown,
  cell2?: DbSerializableData | unknown
): boolean => {
  if (cell1 === cell2) return true;
  if (!(cell1 instanceof Object) || !(cell2 instanceof Object)) return false;
  // array comparison
  if (Array.isArray(cell1) && Array.isArray(cell2)) {
    return (
      cell1.length === cell2.length &&
      cell1.every((v, i) => cellEquals(v, cell2[i]))
    );
  }
  // object comparison
  return (
    Object.keys(cell1).length === Object.keys(cell2).length &&
    (Object.keys(cell1) as (keyof typeof cell1)[]).every(key => {
      return (
        Object.prototype.hasOwnProperty.call(cell2, key) &&
        cellEquals(cell1[key], cell2[key])
      );
    })
  );
};
