export const initialContent = () => {
  // 'empty' editor
  return '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serialize = (obj: any) => {
  return JSON.stringify(obj);
};

export const deserialize = (str: string) => {
  return JSON.parse(str);
};
