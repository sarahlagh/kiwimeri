import { createCommand } from 'lexical';

export const ZOOM_IN_COMMAND = createCommand<number>('ZOOM_IN_COMMAND');
export const ZOOM_OUT_COMMAND = createCommand<number>('ZOOM_OUT_COMMAND');
export const ZOOM_RESET_COMMAND = createCommand('ZOOM_RESET_COMMAND');
