import { useEffect, useState } from 'react';
import { getTelegramWebApp } from './webApp.js';

const configuredFallbackUserId = import.meta.env.VITE_DEV_USER_ID || 'dev-user';

function getFallbackUserId() {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return configuredFallbackUserId;
  }
  return new URLSearchParams(window.location.search).get('devUser')
    || configuredFallbackUserId;
}

export function useTelegram() {
  const fallbackUserId = getFallbackUserId();
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
