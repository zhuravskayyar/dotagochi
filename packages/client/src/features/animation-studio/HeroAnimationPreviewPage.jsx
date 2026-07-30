import { useEffect, useState } from 'react';
import { animationStudioApi } from './animationStudioApi.js';
import { TamagotchiDevicePreview } from './TamagotchiDevicePreview.jsx';

const publicAssetUrl = (assetPath) => (
  assetPath ? `${import.meta.env.BASE_URL}${assetPath.replace(/^\//, '')}` : ''
);

export function HeroAnimationPreviewPage() {
  const heroSlug = new URLSearchParams(window.location.search).get('hero') || '';
  const [hero, setHero] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    animationStudioApi.listHeroes()
      .then(({ heroes }) => {
        const found = heroes.find((item) => item.slug === heroSlug);
        if (!found) throw new Error('Героя не знайдено.');
        setHero(found);
      })
      .catch((loadError) => setError(loadError.message));
  }, [heroSlug]);

  return (
    <main className="hero-animation-preview-page">
      <header>
        <a href={`${import.meta.env.BASE_URL}animation-studio`}>← ANIMATION STUDIO</a>
        <span>ПОВНЕ ПРЕВ’Ю ТАМАГОЧІ</span>
      </header>
      {error && <div className="studio-alert" role="alert">{error}</div>}
      {!hero && !error && <div className="studio-empty">ЗАВАНТАЖЕННЯ...</div>}
      {hero && (
        <TamagotchiDevicePreview
          hero={hero}
          src={publicAssetUrl(hero.animation?.src)}
          fallbackSrc={publicAssetUrl(hero.animation?.fallbackSrc)}
          aspectRatio={hero.animation?.aspectRatio || 1}
          chromaKey={hero.animation?.chromaKey}
          similarity={hero.animation?.similarity}
          blend={hero.animation?.blend}
        />
      )}
    </main>
  );
}
