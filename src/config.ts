// use zod if it gets complex
export type AppConfig = {
  /* meant for overriding the platform in dev mode, not production */
  VITE_OVERRIDE_PLATFORM: 'web' | 'android' | 'electron' | undefined;
};

const defaultConfig: AppConfig = {
  VITE_OVERRIDE_PLATFORM: undefined
};

export const appConfig = { ...defaultConfig, ...import.meta.env };
