import { useEffect, useState } from 'react';
import { getTelegramWebApp } from './webApp.js';

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (webApp) {
      webApp.ready();
      webApp.expand();
      setUserId(webApp.initDataUnsafe?.user?.id ?? 'dev-user');
    } else {
      // Режим разработки вне Telegram
      setUserId('dev-user');
    }
    setIsReady(true);
  }, []);

  return { isReady, userId };
}
