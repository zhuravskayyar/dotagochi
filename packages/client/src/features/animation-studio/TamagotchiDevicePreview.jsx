import { useState } from 'react';
import { ProgressBar } from '../../design-system/components/ProgressBar.jsx';
import { ChromaKeyVideo } from '../pet/ChromaKeyVideo.jsx';

const uiAssetUrl = (path) => (
  `${import.meta.env.BASE_URL}assets/ui/${path}`
);

const actions = [
  { id: 'feed', label: 'ЇЖА' },
  { id: 'train', label: 'ТРЕНУВАННЯ' },
  { id: 'heal', label: 'ЛІКУВАННЯ' },
  { id: 'sleep', label: 'СОН' },
  { id: 'quest', label: 'КВЕСТ' },
];

const previewStats = [
  { id: 'hp', label: 'HP', value: 88, tone: 'health' },
  { id: 'mana', label: 'MANA', value: 74, tone: 'mana' },
  { id: 'hunger-rpg', label: 'HUNGER', value: 80, tone: 'hunger' },
  { id: 'mood-rpg', label: 'MOOD', value: 70, tone: 'mood' },
];

const rpgStats = [
  { id: 'xp', label: 'XP', value: '75 / 100' },
  { id: 'armor', label: 'ARMOR', value: 18 },
  { id: 'damage', label: 'DAMAGE', value: 28 },
  { id: 'combo', label: 'COMBO', value: '×1' },
];

export function TamagotchiDevicePreview({
  hero,
  src,
  fallbackSrc,
  aspectRatio = 1,
  live = false,
}) {
  const [selectedAction, setSelectedAction] = useState(0);
  const [notice, setNotice] = useState('');

  const selectAction = (index) => {
    setSelectedAction(index);
    setNotice('');
  };

  const showPreviewNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 1800);
  };

  return (
    <section
      className="tamagotchi-shell studio-full-tamagotchi"
      aria-label={`Повне тамагочі-прев’ю ${hero.name}`}
    >
      <div className="dota-mark"><span>◆</span> ANCIENT KEEPER <span>◆</span></div>
      <div className="lcd-panel">
        <div className="action-grid">
          {actions.map((item, index) => (
            <button
              className={`action-button ${selectedAction === index ? 'is-selected' : ''}`}
              key={item.id}
              type="button"
              onClick={() => selectAction(index)}
            >
              <img
                className="action-icon"
                src={uiAssetUrl(`icons-v1/${item.id}.png`)}
                alt=""
              />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="selection-hint">
          ОБРАНО: <strong>{actions[selectedAction].label}</strong> · НАТИСНИ DECIDE
        </div>

        <div className="hero-overview">
          <div className="level-chip">
            <img src={uiAssetUrl('rpg-icons-v1/level.png')} alt="" />
            <span>РІВЕНЬ</span><strong>2</strong>
          </div>
          <div className="xp-overview">
            <div className="xp-copy"><span>ДОСВІД</span><strong>75 / 100</strong></div>
            <div className="xp-track"><span style={{ width: '75%' }} /></div>
          </div>
          <div className="currency-rack" aria-label="Валюта">
            <span className="currency">
              <img src={uiAssetUrl('rpg-icons-v1/gold.png')} alt="" />
              <strong>3</strong>
            </span>
            <span className="currency">
              <img src={uiAssetUrl('rpg-icons-v1/gems.png')} alt="" />
              <strong>0</strong>
            </span>
          </div>
        </div>

        <div className="pet-area">
          <div className="hero-stage">
            <div className="stage-smoke stage-smoke--one" />
            <div className="stage-smoke stage-smoke--two" />
            <div className="crt-overlay" aria-hidden="true"><i /></div>
            {src ? (
              <ChromaKeyVideo
                key={src}
                src={src}
                fallbackSrc={fallbackSrc}
                label={`Прев’ю ${hero.name}`}
                aspectRatio={aspectRatio}
                className="studio-character-preview"
              />
            ) : (
              <div className="studio-preview-empty studio-preview-empty--game">
                <span>▶</span>
                <strong>ВИБЕРІТЬ IDLE-ВІДЕО</strong>
                <small>Герой одразу з’явиться у повному Tamagotchi</small>
              </div>
            )}
            <div className="pet-name">{hero.name}</div>
            {src && (
              <div className="studio-preview-badge studio-preview-badge--game">
                {live ? 'LIVE · ЛОКАЛЬНИЙ ФАЙЛ' : 'ЗБЕРЕЖЕНА АНІМАЦІЯ'}
              </div>
            )}
          </div>

          <div className="stats-grid">
            {previewStats.map((stat) => (
              <ProgressBar
                key={stat.id}
                value={stat.value}
                label={stat.label}
                iconSrc={uiAssetUrl(`rpg-icons-v1/${stat.id}.png`)}
                tone={stat.tone}
              />
            ))}
          </div>

          <div className="rpg-stats" aria-label="Статистика героя">
            {rpgStats.map((stat) => (
              <div className={`rpg-stat rpg-stat--${stat.id}`} key={stat.id}>
                <img src={uiAssetUrl(`rpg-icons-v1/${stat.id}.png`)} alt="" />
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className={`message ${notice ? 'is-visible' : ''}`}>{notice}</div>
      </div>

      <nav className="nav-buttons" aria-label="Кнопки прев’ю">
        <button
          className="nav-button"
          type="button"
          onClick={() => showPreviewNotice('STATUS · демонстраційне прев’ю')}
        >
          <img className="nav-icon" src={uiAssetUrl('icons-v1/status.png')} alt="" />
          <span>STATUS</span>
        </button>
        <button
          className="nav-button nav-button--primary"
          type="button"
          onClick={() => selectAction(0)}
        >
          <img className="nav-icon" src={uiAssetUrl('icons-v1/select.png')} alt="" />
          <span>SELECT</span>
        </button>
        <button
          className="nav-button"
          type="button"
          onClick={() => showPreviewNotice(`${actions[selectedAction].label} · ЛИШЕ ПРЕВ’Ю`)}
        >
          <img className="nav-icon" src={uiAssetUrl('icons-v1/decide.png')} alt="" />
          <span>DECIDE</span>
        </button>
        <button
          className="nav-button"
          type="button"
          onClick={() => selectAction(0)}
        >
          <img className="nav-icon" src={uiAssetUrl('icons-v1/cancel.png')} alt="" />
          <span>CANCEL</span>
        </button>
      </nav>
      <p className="build-label">ANCIENT KEEPER · ANIMATION PREVIEW</p>
    </section>
  );
}
