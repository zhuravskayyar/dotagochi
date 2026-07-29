import { useEffect, useMemo, useState } from 'react';
import { animationStudioApi } from './animationStudioApi.js';
import { TamagotchiDevicePreview } from './TamagotchiDevicePreview.jsx';

const publicAssetUrl = (assetPath) => (
  assetPath ? `${import.meta.env.BASE_URL}${assetPath.replace(/^\//, '')}` : ''
);

function useObjectUrl(file) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setUrl('');
      return undefined;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
}

function FileField({ accept, file, label, name, onChange, required = false }) {
  return (
    <label className={`studio-file ${file ? 'has-file' : ''}`}>
      <span>{label}{required ? ' *' : ''}</span>
      <strong>{file?.name || 'ВИБРАТИ ФАЙЛ'}</strong>
      <input
        accept={accept}
        name={name}
        type="file"
        required={required}
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
    </label>
  );
}

function statusLabel(hero) {
  if (hero.completed && hero.animation) return 'ГОТОВО';
  if (hero.completed) return 'ВІДМІЧЕНО';
  if (hero.animation) return 'Є АСЕТИ';
  return 'ОЧІКУЄ';
}

function formatWorkDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AnimationStudioPage() {
  const [heroes, setHeroes] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState({
    idle: null,
    image: null,
    sleep: null,
    wake: null,
  });
  const [settings, setSettings] = useState({
    version: '1',
    frame: '0',
    key: 'auto',
    similarity: '0.20',
    blend: '0.08',
    noChroma: false,
  });
  const [previewAspect, setPreviewAspect] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const idleObjectUrl = useObjectUrl(files.idle);
  const imageObjectUrl = useObjectUrl(files.image);
  const selectedHero = heroes.find((hero) => hero.slug === selectedSlug) || null;

  const loadHeroes = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await animationStudioApi.listHeroes();
      setHeroes(payload.heroes);
      setSelectedSlug((current) => (
        current || payload.heroes.find((hero) => !hero.completed)?.slug
        || payload.heroes[0]?.slug
        || ''
      ));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeroes();
  }, []);

  const savedPreviewUrl = selectedHero?.animation?.src
    ? publicAssetUrl(selectedHero.animation.src)
    : '';
  const savedFallbackUrl = selectedHero?.animation?.fallbackSrc
    ? publicAssetUrl(selectedHero.animation.fallbackSrc)
    : '';
  const previewUrl = idleObjectUrl || savedPreviewUrl;
  const fallbackUrl = imageObjectUrl || savedFallbackUrl;

  useEffect(() => {
    if (!previewUrl) {
      setPreviewAspect(1);
      return undefined;
    }
    if (!idleObjectUrl && selectedHero?.animation?.aspectRatio) {
      setPreviewAspect(selectedHero.animation.aspectRatio);
      return undefined;
    }

    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      if (probe.videoWidth && probe.videoHeight) {
        setPreviewAspect(probe.videoWidth / probe.videoHeight);
      }
    };
    probe.src = previewUrl;
    return () => {
      probe.removeAttribute('src');
    };
  }, [idleObjectUrl, previewUrl, selectedHero]);

  const counts = useMemo(() => ({
    all: heroes.length,
    completed: heroes.filter((hero) => hero.completed).length,
    pending: heroes.filter((hero) => !hero.completed).length,
  }), [heroes]);

  const visibleHeroes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return heroes.filter((hero) => {
      const matchesFilter = filter === 'all'
        || (filter === 'completed' && hero.completed)
        || (filter === 'pending' && !hero.completed);
      const matchesSearch = !query
        || hero.name.toLowerCase().includes(query)
        || hero.slug.includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, heroes, search]);

  const updateHero = (nextHero) => {
    setHeroes((current) => current.map((hero) => (
      hero.slug === nextHero.slug ? nextHero : hero
    )));
  };

  const toggleCompleted = async (hero, completed) => {
    setError('');
    try {
      const payload = await animationStudioApi.setCompleted(hero.slug, completed);
      updateHero(payload.hero);
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const selectHero = (hero) => {
    setSelectedSlug(hero.slug);
    setFiles({ idle: null, image: null, sleep: null, wake: null });
    setMessage('');
    setError('');
  };

  const setFile = (name, file) => {
    setFiles((current) => ({ ...current, [name]: file }));
    setMessage('');
  };

  const setSetting = (name, value) => {
    setSettings((current) => ({ ...current, [name]: value }));
  };

  const submitImport = async (event) => {
    event.preventDefault();
    if (!selectedHero || !files.idle) return;

    setSaving(true);
    setError('');
    setMessage('ОБРОБКА АНІМАЦІЇ...');
    const formData = new FormData();
    Object.entries(files).forEach(([name, file]) => {
      if (file) formData.append(name, file);
    });
    Object.entries(settings).forEach(([name, value]) => {
      formData.append(name, String(value));
    });

    try {
      const payload = await animationStudioApi.importAnimation(
        selectedHero.slug,
        formData,
      );
      updateHero({
        ...payload.hero,
        animation: {
          ...payload.hero.animation,
          src: `${payload.hero.animation.src}?t=${Date.now()}`,
        },
      });
      setMessage(`ГОТОВО: ${payload.hero.name} · KEY ${payload.hero.chromaKey || 'OFF'}`);
      setFiles({ idle: null, image: null, sleep: null, wake: null });
    } catch (importError) {
      setError(importError.message);
      setMessage('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="animation-studio">
      <header className="studio-header">
        <div>
          <a className="studio-back" href={import.meta.env.BASE_URL}>← ДО ГРИ</a>
          <p>DOTA-GOCHI · DEV TOOL</p>
          <h1>ANIMATION STUDIO</h1>
        </div>
        <div className="studio-summary" aria-label="Прогрес героїв">
          <strong>{counts.completed}/{counts.all}</strong>
          <span>ГОТОВИХ ГЕРОЇВ</span>
          <i style={{ '--studio-progress': `${counts.all ? (counts.completed / counts.all) * 100 : 0}%` }} />
        </div>
      </header>

      {error && <div className="studio-alert" role="alert">{error}</div>}

      <section className="studio-layout">
        <aside className="studio-catalog">
          <div className="studio-catalog-tools">
            <input
              type="search"
              value={search}
              placeholder="ПОШУК ГЕРОЯ..."
              aria-label="Пошук героя"
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="studio-filters">
              {[
                ['all', `ВСІ ${counts.all}`],
                ['completed', `ГОТОВІ ${counts.completed}`],
                ['pending', `ОЧІКУЮТЬ ${counts.pending}`],
              ].map(([id, label]) => (
                <button
                  className={filter === id ? 'is-active' : ''}
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="studio-hero-list">
            {loading && <div className="studio-empty">ЗАВАНТАЖЕННЯ...</div>}
            {!loading && visibleHeroes.length === 0 && (
              <div className="studio-empty">ГЕРОЇВ НЕ ЗНАЙДЕНО</div>
            )}
            {visibleHeroes.map((hero) => (
              <article
                className={`studio-hero-card ${selectedSlug === hero.slug ? 'is-selected' : ''} ${hero.completed ? 'is-complete' : ''}`}
                key={hero.slug}
              >
                <button type="button" onClick={() => selectHero(hero)}>
                  <img src={publicAssetUrl(hero.portrait)} alt="" />
                  <span>
                    <strong>{hero.name}</strong>
                    <small>{statusLabel(hero)}</small>
                  </span>
                </button>
                <label title="Позначити героя виконаним">
                  <input
                    type="checkbox"
                    checked={hero.completed}
                    aria-label={`${hero.name}: виконано`}
                    onChange={(event) => toggleCompleted(hero, event.target.checked)}
                  />
                  <i />
                </label>
              </article>
            ))}
          </div>
        </aside>

        <section className="studio-workbench">
          {selectedHero ? (
            <>
              <div className="studio-selected-heading">
                <img src={publicAssetUrl(selectedHero.portrait)} alt="" />
                <div>
                  <span>{selectedHero.slug}</span>
                  <h2>{selectedHero.name}</h2>
                </div>
                <b className={selectedHero.completed ? 'is-complete' : ''}>
                  {statusLabel(selectedHero)}
                </b>
              </div>

              <div className="studio-device-preview-wrap">
                <TamagotchiDevicePreview
                  hero={selectedHero}
                  src={previewUrl}
                  fallbackSrc={fallbackUrl}
                  aspectRatio={previewAspect}
                  live={Boolean(idleObjectUrl)}
                />
                {selectedHero.animation && (
                  <a
                    className="studio-full-preview-link"
                    href={`${import.meta.env.BASE_URL}tamagotchi-preview?hero=${selectedHero.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ВІДКРИТИ ПОВНЕ ПРЕВ’Ю ТАМАГОЧІ ↗
                  </a>
                )}
              </div>

              <form className="studio-import-form" onSubmit={submitImport}>
                <div className="studio-file-grid">
                  <FileField
                    accept="video/*"
                    file={files.idle}
                    label="IDLE VIDEO"
                    name="idle"
                    required
                    onChange={(file) => setFile('idle', file)}
                  />
                  <FileField
                    accept="image/*"
                    file={files.image}
                    label="FALLBACK PNG"
                    name="image"
                    onChange={(file) => setFile('image', file)}
                  />
                  <FileField
                    accept="video/*"
                    file={files.sleep}
                    label="SLEEP VIDEO"
                    name="sleep"
                    onChange={(file) => setFile('sleep', file)}
                  />
                  <FileField
                    accept="video/*"
                    file={files.wake}
                    label="WAKE VIDEO"
                    name="wake"
                    onChange={(file) => setFile('wake', file)}
                  />
                </div>

                <details className="studio-advanced">
                  <summary>ТОЧНІ НАЛАШТУВАННЯ CHROMA KEY</summary>
                  <div>
                    {[
                      ['version', 'VERSION', 'number', '1'],
                      ['frame', 'FRAME SEC', 'number', '0.1'],
                      ['key', 'KEY', 'text', null],
                      ['similarity', 'SIMILARITY', 'number', '0.01'],
                      ['blend', 'BLEND', 'number', '0.01'],
                    ].map(([name, label, type, step]) => (
                      <label key={name}>
                        <span>{label}</span>
                        <input
                          type={type}
                          step={step || undefined}
                          min={type === 'number' ? '0' : undefined}
                          value={settings[name]}
                          onChange={(event) => setSetting(name, event.target.value)}
                        />
                      </label>
                    ))}
                    <label className="studio-check">
                      <input
                        type="checkbox"
                        checked={settings.noChroma}
                        onChange={(event) => setSetting('noChroma', event.target.checked)}
                      />
                      <span>PNG ВЖЕ ПРОЗОРИЙ</span>
                    </label>
                  </div>
                </details>

                <button
                  className="studio-import-button"
                  type="submit"
                  disabled={!files.idle || saving}
                >
                  {saving ? 'ОБРОБКА...' : 'ІМПОРТУВАТИ ТА ВІДКРИТИ ПРЕВ’Ю'}
                </button>
                <div className={`studio-message ${message ? 'is-visible' : ''}`}>
                  {message}
                </div>
              </form>

              {selectedHero.work && (
                <section className="studio-saved-work">
                  <header>
                    <div>
                      <span>ЗБЕРЕЖЕНА РОБОТА</span>
                      <strong>VERSION {selectedHero.work.version}</strong>
                    </div>
                    <time>{formatWorkDate(selectedHero.work.importedAt)}</time>
                  </header>
                  <div className="studio-work-meta">
                    <span>KEY <b>{selectedHero.work.chromaKey || 'OFF'}</b></span>
                    <span>RATIO <b>{selectedHero.work.aspectRatio}</b></span>
                    <span>IMPORTS <b>{selectedHero.history?.length || 1}</b></span>
                  </div>
                  <div className="studio-work-files">
                    {Object.entries(selectedHero.work.files || {})
                      .filter(([, file]) => file)
                      .map(([kind, file]) => (
                        <div key={kind}>
                          <span>{kind.toUpperCase()}</span>
                          <strong>{file}</strong>
                        </div>
                      ))}
                  </div>
                  {selectedHero.history?.length > 1 && (
                    <details>
                      <summary>ІСТОРІЯ ІМПОРТІВ ({selectedHero.history.length})</summary>
                      {selectedHero.history.map((work, index) => (
                        <div className="studio-history-row" key={`${work.importedAt}-${index}`}>
                          <strong>v{work.version}</strong>
                          <span>{formatWorkDate(work.importedAt)}</span>
                          <small>{work.files?.idle}</small>
                        </div>
                      ))}
                    </details>
                  )}
                </section>
              )}
            </>
          ) : (
            <div className="studio-empty">ВИБЕРІТЬ ГЕРОЯ</div>
          )}
        </section>
      </section>
    </main>
  );
}
