import { useEffect, useRef, useState } from 'react';
import { eggGenerationApi } from './eggGenerationApi.js';

const assetUrl = (path) => `${import.meta.env.BASE_URL}assets/ui/${path}`;

function formatRemaining(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function EggGenerationView({ userId, onHatched }) {
  const [status, setStatus] = useState(null);
  const [remainingMs, setRemainingMs] = useState(5 * 60 * 1000);
  const [phase, setPhase] = useState('waiting');
  const [error, setError] = useState('');
  const hatchStarted = useRef(false);

  useEffect(() => {
    let active = true;
    eggGenerationApi.getStatus(userId)
      .then((next) => {
        if (!active) return;
        setStatus(next);
        setRemainingMs(next.remainingMs);
      })
      .catch(() => active && setError('Не вдалося перевірити яйце'));
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!status?.hatchAt) return undefined;
    const tick = () => setRemainingMs(Math.max(0, status.hatchAt - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [status?.hatchAt]);

  useEffect(() => {
    if (!status || remainingMs > 0 || hatchStarted.current) return;
    hatchStarted.current = true;
    setPhase('hatching');
    setError('');

    const hatchTimer = window.setTimeout(async () => {
      try {
        const result = await eggGenerationApi.hatch(userId);
        setPhase('revealed');
        window.setTimeout(() => onHatched(result), 1100);
      } catch {
        hatchStarted.current = false;
        setPhase('waiting');
        setError('Яйце ще не готове. Спробуємо знову.');
      }
    }, 1500);

    return () => window.clearTimeout(hatchTimer);
  }, [onHatched, remainingMs, status, userId]);

  return (
    <main className="tamagotchi-shell">
      <div className="dota-mark"><span>◆</span> ANCIENT KEEPER <span>◆</span></div>
      <section className="lcd-panel egg-panel">
        <div className="egg-heading">
          <span>НОВЕ ЖИТТЯ</span>
          <strong>{phase === 'revealed' ? 'ГЕРОЯ ОБРАНО' : 'ТАЄМНИЧЕ ЯЙЦЕ'}</strong>
        </div>
        <div className={`egg-stage egg-stage--${phase}`}>
          <div className="egg-aura" />
          <img
            className="ancient-egg"
            src={assetUrl('egg/ancient-egg-v1.png')}
            alt="Таємниче яйце героя"
          />
          <div className="egg-crack egg-crack--one" />
          <div className="egg-crack egg-crack--two" />
          <div className="egg-flash" />
        </div>
        <div className="egg-countdown" aria-live="polite">
          <span>{phase === 'waiting' ? 'ВИЛУПЛЕННЯ ЧЕРЕЗ' : 'ПРОБУДЖЕННЯ'}</span>
          <strong>{phase === 'waiting' ? formatRemaining(remainingMs) : '•••'}</strong>
        </div>
        <p className="egg-copy">
          Як в оригінальному Tamagotchi, яйцю потрібно 5 хвилин.
          Усередині — випадковий герой з актуального списку Dota 2.
        </p>
        {error && <div className="egg-error">{error}</div>}
      </section>
      <p className="build-label">ANCIENT KEEPER · HERO INCUBATION</p>
    </main>
  );
}
