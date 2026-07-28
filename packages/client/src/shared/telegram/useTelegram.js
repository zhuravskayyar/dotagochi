import { useEffect, useState } from 'react';
import { getTelegramWebApp } from './webApp.js';

const fallbackUserId = import.meta.env.VITE_DEV_USER_ID || 'dev-user';

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState(fallbackUserId);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (webApp) {
      webApp.ready();
      webApp.expand();
      const telegramUserId = webApp.initDataUnsafe?.user?.id;
      setUserId(telegramUserId ? String(telegramUserId) : fallbackUserId);
    } else {
      setUserId(fallbackUserId);
    }
    setIsReady(true);
  }, []);

  return { isReady, userId };
}
