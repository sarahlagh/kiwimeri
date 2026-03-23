import { historyService } from '@/db/collection-history.service';
import { App as CapacitorApp } from '@capacitor/app';

const updateKeyboardOffsetFromViewport = () => {
  const vv = window.visualViewport;
  if (!vv) return;

  const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  console.debug('visual viewViewport updated', vv, offset);
  document.documentElement.style.setProperty(
    '--keyboard-bottom-offset',
    offset > 0 ? `${offset}px` : ''
  );
};

export const addAndroidListeners = () => {
  CapacitorApp.addListener('pause', () => {
    console.debug('capacitor pause');
    historyService.saveNow();
  });

  window.visualViewport?.addEventListener(
    'resize',
    updateKeyboardOffsetFromViewport
  );
  window.visualViewport?.addEventListener(
    'scroll',
    updateKeyboardOffsetFromViewport
  );
};

export const removeAndroidListeners = () => {
  CapacitorApp.removeAllListeners();
  window.visualViewport?.removeEventListener(
    'resize',
    updateKeyboardOffsetFromViewport
  );
  window.visualViewport?.removeEventListener(
    'scroll',
    updateKeyboardOffsetFromViewport
  );
};
