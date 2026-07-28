// Тонкая обёртка над Telegram WebApp SDK (window.Telegram.WebApp)
export function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}
