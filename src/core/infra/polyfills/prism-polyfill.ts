if (!import.meta.env.DEV) {
  const _Prism = { languages: {} };
  Object.defineProperty(window, 'Prism', {
    value: _Prism,
    writable: false
  });
  if ((typeof globalThis as any).Prism === 'undefined') {
    (globalThis as any).Prism = _Prism;
  }
}
