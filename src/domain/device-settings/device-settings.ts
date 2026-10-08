export const themeValues = ['light', 'dark'] as const;
export type Theme = (typeof themeValues)[number];

export const timedModeValues = ['dangerous', 'less-dangerous'] as const;
export type TimedSessionMode = (typeof timedModeValues)[number];

export const fastWriteModeValues = ['watch', 'run'] as const;
export type FastWriteMode = (typeof fastWriteModeValues)[number];
