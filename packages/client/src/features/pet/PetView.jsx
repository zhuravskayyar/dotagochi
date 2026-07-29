import { useState } from 'react';
import { useTelegram } from '../../shared/telegram/useTelegram.js';
import { usePet } from './usePet.js';
import { ProgressBar } from '../../design-system/components/ProgressBar.jsx';
import { ChromaKeyVideo } from './ChromaKeyVideo.jsx';
import { EggGenerationView } from '../egg-generation/EggGenerationView.jsx';
import { useNotifications } from '../notifications/useNotifications.js';

const actions = [
  { id: 'feed', label: 'ЇЖА' }, { id: 'train', label: 'ТРЕНУВАННЯ' },
  { id: 'heal', label: 'ЛІКУВАННЯ' }, { id: 'sleep', label: 'СОН' }, { id: 'quest', label: 'КВЕСТ' },
];

const actionLessons = [
  { id: 'feed', title: 'ЇЖА', text: '+25 ситості, +5 настрою, коштує 5 золота.' },
  { id: 'train', title: 'ТРЕНУВАННЯ', text: '+15 XP, витрачає 20 енергії та 10 ситості.' },
  { id: 'heal', title: 'ЛІКУВАННЯ', text: '+30 HP, коштує 10 золота.' },
  { id: 'sleep', title: 'СОН', text: 'Вкладає героя спати або будить його. Сон відновлює енергію.' },
  { id: 'quest', title: 'КВЕСТ', text: '+25 XP, +20 золота, але витрачає енергію та ситість.' },
];

const buttonLessons = [
  { title: 'STATUS', text: 'Показує всі характеристики та відкриває налаштування.' },
  { title: 'SELECT', text: 'Повертає на головний екран вибору дії.' },
  { title: 'DECIDE', text: 'Підтверджує та виконує вибрану верхню дію.' },
  { title: 'CANCEL', text: 'Скасовує вибір, повертає на головний екран і вибирає їжу.' },
];

const assetUrl = (path) => `${import.meta.env.BASE_URL}assets/ui/${path}`;

let uiAudioContext;

function playUiClick(accent = false) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  uiAudioContext ||= new AudioContext();
  const oscillator = uiAudioContext.createOscillator();
  const gain = uiAudioContext.createGain();
  const now = uiAudioContext.currentTime;
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(accent ? 180 : 135, now);
  oscillator.frequency.exponentialRampToValueAtTime(accent ? 90 : 72, now + 0.045);
  gain.gain.setValueAtTime(0.045, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  oscillator.connect(gain);
  gain.connect(uiAudioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.055);
}

export function PetView() {
  const { userId } = useTelegram();
  const { pet, loading, error, message, action, reload } = usePet(userId);
  const { settings: notificationSettings, updateSettings } = useNotifications(userId);
  const [view, setView] = useState('home');
  const [selectedAction, setSelectedAction] = useState(0);

  if (loading) return <div className="app-loading">Завантаження стану героя...</div>;
  if (error) return <div className="app-loading">Не вдалося завантажити стан героя</div>;
  if (!pet) return <div className="app-loading">Героя не знайдено</div>;

  if (pet.life_stage === 'egg') {
    return <EggGenerationView userId={userId} onHatched={reload} />;
  }

  const runAction = async (id) => { await action(id); };
  const runSelectedAction = () => {
    playUiClick(true);
    return runAction(actions[selectedAction].id);
  };

  const heroLevel = pet.hero_level ?? 1;
  const gold = pet.gold ?? 0;
  const xp = pet.xp ?? 0;
  const health = pet.health ?? 100;
  const energy = pet.energy ?? 0;
  const hunger = pet.hunger ?? 0;
  const mood = pet.mood ?? pet.happiness ?? 0;
  const gems = Math.floor(gold / 25);
  const armor = 12 + heroLevel * 3;
  const damage = 18 + heroLevel * 5;
  const combo = Math.max(1, Math.floor(mood / 20));
  const heroSlug = pet.hero_slug || 'pudge';
  const isAnimatedPudge = heroSlug === 'pudge';
  const rpgStats = [
    { id: 'xp', label: 'XP', value: `${xp} / 100` },
    { id: 'armor', label: 'ARMOR', value: armor },
    { id: 'damage', label: 'DAMAGE', value: damage },
    { id: 'combo', label: 'COMBO', value: `×${combo}` },
  ];

  return (
    <main className="tamagotchi-shell">
      <div className="dota-mark"><span>◆</span> ANCIENT KEEPER <span>◆</span></div>
      <section className="lcd-panel">
        <div className="action-grid">
          {actions.map((item, index) => (
            <button className={`action-button ${selectedAction === index ? 'is-selected' : ''}`} key={item.id}
              onClick={() => { playUiClick(index === selectedAction); setSelectedAction(index); }}>
              <img className="action-icon" src={assetUrl(`icons-v1/${item.id}.png`)} alt="" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="selection-hint">
          ОБРАНО: <strong>{actions[selectedAction].label}</strong> · НАТИСНИ DECIDE
        </div>
        <div className="hero-overview">
          <div className="level-chip">
            <img src={assetUrl('rpg-icons-v1/level.png')} alt="" />
            <span>РІВЕНЬ</span><strong>{heroLevel}</strong>
          </div>
          <div className="xp-overview">
            <div className="xp-copy"><span>ДОСВІД</span><strong>{xp} / 100</strong></div>
            <div className="xp-track"><span style={{ width: `${xp}%` }} /></div>
          </div>
          <div className="currency-rack" aria-label="Валюта">
            <span className="currency"><img src={assetUrl('rpg-icons-v1/gold.png')} alt="" /><strong>{gold}</strong></span>
            <span className="currency"><img src={assetUrl('rpg-icons-v1/gems.png')} alt="" /><strong>{gems}</strong></span>
          </div>
        </div>
        {view === 'home' ? (
          <div className="pet-area">
            <div className="hero-stage">
              <div className="stage-smoke stage-smoke--one" />
              <div className="stage-smoke stage-smoke--two" />
              <div className="crt-overlay" aria-hidden="true"><i /></div>
              {isAnimatedPudge ? (
                <ChromaKeyVideo
                  src={assetUrl('characters/pudge-chroma-v1.mp4')}
                  sleepSrc={assetUrl('characters/pudge-sleep-v1.mp4')}
                  wakeSrc={assetUrl('characters/pudge-wake-v1.mp4')}
                  sleeping={Boolean(pet.is_sleeping)}
                  className={`${pet.is_sleeping ? 'is-sleeping' : ''} ${hunger < 30 ? 'is-hungry' : ''}`}
                />
              ) : (
                <img
                  className={`hero-portrait ${pet.is_sleeping ? 'is-sleeping' : ''}`}
                  src={`${import.meta.env.BASE_URL}assets/heroes/${heroSlug}/portrait.png`}
                  alt={pet.hero_name || pet.name}
                />
              )}
              <div className="pet-name">{pet.name}</div>
            </div>
            <div className="stats-grid">
              <ProgressBar value={health} label="HP" iconSrc={assetUrl('rpg-icons-v1/hp.png')} tone="health" />
              <ProgressBar value={energy} label="MANA" iconSrc={assetUrl('rpg-icons-v1/mana.png')} tone="mana" />
              <ProgressBar value={hunger} label="HUNGER" iconSrc={assetUrl('rpg-icons-v1/hunger-rpg.png')} tone="hunger" />
              <ProgressBar value={mood} label="MOOD" iconSrc={assetUrl('rpg-icons-v1/mood-rpg.png')} tone="mood" />
            </div>
            <div className="rpg-stats" aria-label="Статистика героя">
              {rpgStats.map((stat) => (
                <div className={`rpg-stat rpg-stat--${stat.id}`} key={stat.id}>
                  <img src={assetUrl(`rpg-icons-v1/${stat.id}.png`)} alt="" />
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : view === 'status' ? (
          <div className="status-screen">
            <div className="status-row"><span>ІМ’Я</span><strong>{pet.name}</strong></div>
            <div className="status-row"><span>СТАН</span><strong>{pet.is_sleeping ? 'СОН' : 'ГОТОВИЙ'}</strong></div>
            <div className="status-row"><span>СИТІСТЬ</span><strong>{pet.hunger}/100</strong></div>
            <div className="status-row"><span>ЗДОРОВ’Я</span><strong>{pet.health}/100</strong></div>
            <div className="status-row"><span>НАСТРІЙ</span><strong>{pet.mood}/100</strong></div>
            <div className="status-row"><span>ЕНЕРГІЯ</span><strong>{pet.energy}/100</strong></div>
            <div className="status-row"><span>ДОСВІД</span><strong>{pet.xp}/100</strong></div>
            <div className="status-row"><span>ЗОЛОТО</span><strong>{pet.gold}</strong></div>
            <div className="status-row">
              <span>СТАДІЯ</span><strong>{pet.life_stage?.toUpperCase()}</strong>
            </div>
            <button
              className={`notification-toggle ${notificationSettings?.enabled ? 'is-on' : ''}`}
              type="button"
              disabled={!notificationSettings}
              onClick={() => updateSettings({ enabled: !notificationSettings.enabled })}
            >
              PUSH: {notificationSettings?.enabled ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}
            </button>
            <button
              className="settings-open-button"
              type="button"
              onClick={() => { playUiClick(); setView('settings'); }}
            >
              НАЛАШТУВАННЯ ТА НАВЧАННЯ
            </button>
          </div>
        ) : (
          <div className="settings-screen">
            <div className="settings-heading">
              <span>НАЛАШТУВАННЯ</span>
              <strong>ЯК ГРАТИ</strong>
            </div>
            <button
              className={`notification-toggle ${notificationSettings?.enabled ? 'is-on' : ''}`}
              type="button"
              disabled={!notificationSettings}
              onClick={() => updateSettings({ enabled: !notificationSettings.enabled })}
            >
              PUSH-СПОВІЩЕННЯ: {notificationSettings?.enabled ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}
            </button>
            <section className="tutorial-section">
              <h2>КНОПКИ КОРПУСУ</h2>
              {buttonLessons.map((lesson) => (
                <div className="tutorial-row" key={lesson.title}>
                  <strong>{lesson.title}</strong><span>{lesson.text}</span>
                </div>
              ))}
            </section>
            <section className="tutorial-section">
              <h2>ДІЇ ГЕРОЯ</h2>
              {actionLessons.map((lesson) => (
                <div className="tutorial-row tutorial-row--action" key={lesson.id}>
                  <img src={assetUrl(`icons-v1/${lesson.id}.png`)} alt="" />
                  <strong>{lesson.title}</strong><span>{lesson.text}</span>
                </div>
              ))}
            </section>
            <button
              className="settings-back-button"
              type="button"
              onClick={() => { playUiClick(); setView('status'); }}
            >
              НАЗАД ДО СТАТУСУ
            </button>
          </div>
        )}
        <div className={`message ${message ? 'is-visible' : ''}`}>{message}</div>
      </section>
      <nav className="nav-buttons" aria-label="Навігація">
        <button className="nav-button" onClick={() => { playUiClick(); setView('status'); }}>
          <img className="nav-icon" src={assetUrl('icons-v1/status.png')} alt="" /><span>STATUS</span>
        </button>
        <button className="nav-button nav-button--primary" onClick={() => { playUiClick(true); setView('home'); }}>
          <img className="nav-icon" src={assetUrl('icons-v1/select.png')} alt="" /><span>SELECT</span>
        </button>
        <button className="nav-button" onClick={runSelectedAction}>
          <img className="nav-icon" src={assetUrl('icons-v1/decide.png')} alt="" /><span>DECIDE</span>
        </button>
        <button className="nav-button" onClick={() => { playUiClick(); setView('home'); setSelectedAction(0); }}>
          <img className="nav-icon" src={assetUrl('icons-v1/cancel.png')} alt="" /><span>CANCEL</span>
        </button>
      </nav>
      <p className="build-label">ANCIENT KEEPER · TELEGRAM MINI APP</p>
    </main>
  );
}
