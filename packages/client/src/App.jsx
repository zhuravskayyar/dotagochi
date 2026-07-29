import { PetView } from './features/pet/PetView.jsx';
import { AnimationStudioPage } from './features/animation-studio/AnimationStudioPage.jsx';
import { HeroAnimationPreviewPage } from './features/animation-studio/HeroAnimationPreviewPage.jsx';
import { useTelegram } from './shared/telegram/useTelegram.js';

function TelegramApp() {
  const { isReady } = useTelegram();
  if (!isReady) return <div className="app-loading">Завантаження...</div>;
  return <div className="app"><PetView /></div>;
}

export default function App() {
  const studioPath = `${import.meta.env.BASE_URL}animation-studio`
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
  const currentPath = window.location.pathname.replace(/\/$/, '');
  const previewPath = `${import.meta.env.BASE_URL}tamagotchi-preview`
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');

  if (currentPath === studioPath) {
    return <AnimationStudioPage />;
  }
  if (currentPath === previewPath) {
    return <HeroAnimationPreviewPage />;
  }
  return <TelegramApp />;
}
