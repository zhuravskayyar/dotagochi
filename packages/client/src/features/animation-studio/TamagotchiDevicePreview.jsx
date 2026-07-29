import { ChromaKeyVideo } from '../pet/ChromaKeyVideo.jsx';

const uiAssetUrl = (path) => (
  `${import.meta.env.BASE_URL}assets/ui/${path}`
);

const actions = [
  ['feed', 'ЇЖА'],
  ['train', 'ТРЕНУВАННЯ'],
  ['heal', 'ЛІКУВАННЯ'],
  ['sleep', 'СОН'],
  ['quest', 'КВЕСТ'],
];

const stats = [
  ['hp', 'HP', 88],
  ['mana', 'MANA', 74],
  ['hunger-rpg', 'HUNGER', 80],
  ['mood-rpg', 'MOOD', 70],
];

export function TamagotchiDevicePreview({
  hero,
  src,
  fallbackSrc,
  aspectRatio = 1,
  live = false,
}) {
  return (
    <section className="studio-tamagotchi" aria-label={`Тамагочі-прев’ю ${hero.name}`}>
      <div className="studio-tamagotchi-brand">◆ ANCIENT KEEPER ◆</div>
      <div className="studio-tamagotchi-screen">
        <div className="studio-tamagotchi-actions">
          {actions.map(([id, label]) => (
            <div key={id}>
              <img src={uiAssetUrl(`icons-v1/${id}.png`)} alt="" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="studio-tamagotchi-stage">
          <div className="studio-tamagotchi-scanlines" aria-hidden="true" />
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
            <div className="studio-preview-empty">
              <span>▶</span>
              <strong>ВИБЕРІТЬ IDLE-ВІДЕО</strong>
              <small>Герой одразу з’явиться у тамагочі</small>
            </div>
          )}
          <strong className="studio-tamagotchi-name">{hero.name}</strong>
          {src && (
            <div className="studio-preview-badge">
              {live ? 'LIVE · ЛОКАЛЬНИЙ ФАЙЛ' : 'ЗБЕРЕЖЕНА АНІМАЦІЯ'}
            </div>
          )}
        </div>

        <div className="studio-tamagotchi-stats">
          {stats.map(([icon, label, value]) => (
            <div key={label}>
              <img src={uiAssetUrl(`rpg-icons-v1/${icon}.png`)} alt="" />
              <span>{label}</span>
              <i><b style={{ width: `${value}%` }} /></i>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>

      <nav className="studio-tamagotchi-nav" aria-hidden="true">
        {[
          ['status', 'STATUS'],
          ['select', 'SELECT'],
          ['decide', 'DECIDE'],
          ['cancel', 'CANCEL'],
        ].map(([icon, label]) => (
          <div key={label}>
            <img src={uiAssetUrl(`icons-v1/${icon}.png`)} alt="" />
            <span>{label}</span>
          </div>
        ))}
      </nav>
    </section>
  );
}
