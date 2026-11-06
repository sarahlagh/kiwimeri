export function mergeConfig<T extends object>(config: T, override: T) {
  const merged: T = { ...config };
  Object.keys(override).forEach(key => {
    const k = key as keyof T;
    if (override[k] !== undefined) {
      merged[k] = override[k];
    }
  });
  return merged;
}
