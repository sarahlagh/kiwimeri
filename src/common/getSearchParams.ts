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
