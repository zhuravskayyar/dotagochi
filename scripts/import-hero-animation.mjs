import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const heroesRoot = path.join(
  projectRoot,
  'packages/client/public/assets/heroes',
);
const registryFile = path.join(
  projectRoot,
  'packages/client/src/features/pet/hero-animations.json',
);

const HELP = `
Імпорт анімації героя:

  npm run add:animation -- --hero drow_ranger --video "D:\\drow.mp4" --image "D:\\drow.png"

Обов'язкові параметри:
  --hero, --slug      slug героя з каталогу Dota 2
  --video             idle-відео із зеленим фоном

Додаткові параметри:
  --image             зображення для запасного спрайта; без нього береться кадр із відео
  --sleep             окреме відео сну
  --wake              окреме відео пробудження
  --version           версія назв файлів, типово 1
  --frame             секунда кадру для спрайта, типово 0
  --key               chroma-колір: auto або 0x00ff00, типово auto
  --similarity        чутливість видалення фону, типово 0.20
  --blend             м'якість краю, типово 0.08
  --no-chroma         не видаляти фон із --image
  --force             дозволити заміну наявних файлів
  --help              показати цю довідку
`.trim();

const valueOptions = new Set([
  'hero',
  'slug',
  'video',
  'image',
  'sleep',
  'wake',
  'version',
  'frame',
  'key',
  'similarity',
  'blend',
]);
const flagOptions = new Set(['force', 'no-chroma', 'help']);

export function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`Невідомий аргумент: ${token}`);
    }

    const [rawName, inlineValue] = token.slice(2).split('=', 2);
    if (flagOptions.has(rawName)) {
      options[rawName] = true;
      continue;
    }
    if (!valueOptions.has(rawName)) {
      throw new Error(`Невідомий параметр: --${rawName}`);
    }

    const value = inlineValue ?? argv[index + 1];
    if (!value || (inlineValue === undefined && value.startsWith('--'))) {
      throw new Error(`Потрібне значення для --${rawName}`);
    }
    options[rawName] = value;
    if (inlineValue === undefined) index += 1;
  }

  options.hero ||= options.slug;
  return options;
}

export function validateHeroSlug(slug) {
  if (!slug || !/^[a-z0-9_]+$/.test(slug)) {
    throw new Error(
      'Slug героя має містити лише малі латинські літери, цифри та _.',
    );
  }
  return slug;
}

export function publicAssetPath(...parts) {
  return ['assets', 'heroes', ...parts].join('/');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: options.binary ? null : 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });

  if (result.error?.code === 'ENOENT') {
    throw new Error(
      `${command} не знайдено. Встановіть FFmpeg і додайте його до PATH.`,
    );
  }
  if (result.status !== 0) {
    const details = String(result.stderr || result.stdout || '').trim();
    throw new Error(`${command} завершився з помилкою: ${details}`);
  }
  return result.stdout;
}

function probeVideo(file) {
  const output = run('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'json',
    file,
  ]);
  const stream = JSON.parse(output).streams?.[0];
  if (!stream?.width || !stream?.height) {
    throw new Error(`Не вдалося визначити розмір відео: ${file}`);
  }
  return {
    width: stream.width,
    height: stream.height,
    aspectRatio: Number((stream.width / stream.height).toFixed(6)),
  };
}

function detectCornerColor(file, isVideo, frame) {
  const args = ['-v', 'error'];
  if (isVideo) args.push('-ss', String(frame));
  args.push(
    '-i',
    file,
    '-vf',
    'crop=1:1:0:0,format=rgb24',
    '-frames:v',
    '1',
    '-f',
    'rawvideo',
    'pipe:1',
  );
  const pixel = run('ffmpeg', args, { binary: true });
  if (!Buffer.isBuffer(pixel) || pixel.length < 3) {
    throw new Error('Не вдалося автоматично визначити chroma-колір.');
  }
  return `0x${pixel.subarray(0, 3).toString('hex')}`;
}

async function assertReadable(file, label) {
  if (!file) return;
  try {
    const stats = await fs.stat(file);
    if (!stats.isFile()) throw new Error();
  } catch {
    throw new Error(`${label} не знайдено: ${file}`);
  }
}

async function assertWritable(destination, force) {
  try {
    await fs.access(destination);
    if (!force) {
      throw new Error(
        `Файл уже існує: ${destination}. Додайте --force для заміни.`,
      );
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function copyVideo(source, destination, force) {
  await assertWritable(destination, force);
  if (path.resolve(source) === path.resolve(destination)) return;

  if (path.extname(source).toLowerCase() === '.mp4') {
    await fs.copyFile(source, destination);
    return;
  }

  run('ffmpeg', [
    '-y',
    '-i',
    source,
    '-map',
    '0:v:0',
    '-an',
    '-c:v',
    'libx264',
    '-crf',
    '20',
    '-preset',
    'medium',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    destination,
  ]);
}

async function createFallback({
  source,
  sourceIsVideo,
  destination,
  frame,
  key,
  similarity,
  blend,
  removeChroma,
  force,
}) {
  await assertWritable(destination, force);
  const args = ['-y', '-v', 'error'];
  if (sourceIsVideo) args.push('-ss', String(frame));
  args.push('-i', source);
  if (removeChroma) {
    args.push(
      '-vf',
      `format=rgba,colorkey=${key}:${similarity}:${blend}`,
    );
  }
  args.push('-frames:v', '1', destination);
  run('ffmpeg', args);
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function buildRegistryEntry({
  hero,
  version,
  aspectRatio,
  chromaKey,
  similarity,
  blend,
  sleep = false,
  wake = false,
}) {
  const entry = {
    src: publicAssetPath(hero, `idle-chroma-v${version}.mp4`),
    fallbackSrc: publicAssetPath(hero, `sprite-v${version}.png`),
    aspectRatio,
  };
  if (chromaKey) entry.chromaKey = chromaKey;
  if (Number.isFinite(similarity)) entry.similarity = similarity;
  if (Number.isFinite(blend)) entry.blend = blend;
  if (sleep) {
    entry.sleepSrc = publicAssetPath(hero, `sleep-chroma-v${version}.mp4`);
  }
  if (wake) {
    entry.wakeSrc = publicAssetPath(hero, `wake-chroma-v${version}.mp4`);
  }
  return entry;
}

export async function importHeroAnimation(rawOptions) {
  const hero = validateHeroSlug(rawOptions.hero);
  const version = Number.parseInt(rawOptions.version || '1', 10);
  const frame = Number.parseFloat(rawOptions.frame || '0');
  const similarity = Number.parseFloat(rawOptions.similarity || '0.20');
  const blend = Number.parseFloat(rawOptions.blend || '0.08');
  const force = Boolean(rawOptions.force);

  if (!Number.isInteger(version) || version < 1) {
    throw new Error('--version має бути цілим числом від 1.');
  }
  if (![frame, similarity, blend].every(Number.isFinite)) {
    throw new Error('--frame, --similarity і --blend мають бути числами.');
  }
  if (similarity < 0.01 || similarity > 1 || blend < 0 || blend > 1) {
    throw new Error('--similarity має бути 0.01–1, а --blend — 0–1.');
  }

  const video = path.resolve(rawOptions.video || '');
  const image = rawOptions.image ? path.resolve(rawOptions.image) : null;
  const sleep = rawOptions.sleep ? path.resolve(rawOptions.sleep) : null;
  const wake = rawOptions.wake ? path.resolve(rawOptions.wake) : null;
  await assertReadable(video, 'Idle-відео');
  await assertReadable(image, 'Зображення');
  await assertReadable(sleep, 'Відео сну');
  await assertReadable(wake, 'Відео пробудження');

  const heroDir = path.join(heroesRoot, hero);
  const heroMetadata = await readJson(path.join(heroDir, 'hero.json'), null);
  if (!heroMetadata) {
    throw new Error(
      `Героя ${hero} немає в каталозі. Спочатку виконайте npm run sync:heroes.`,
    );
  }
  await fs.mkdir(heroDir, { recursive: true });

  const dimensions = probeVideo(video);
  const idleName = `idle-chroma-v${version}.mp4`;
  const spriteName = `sprite-v${version}.png`;
  await copyVideo(video, path.join(heroDir, idleName), force);
  if (sleep) {
    await copyVideo(
      sleep,
      path.join(heroDir, `sleep-chroma-v${version}.mp4`),
      force,
    );
  }
  if (wake) {
    await copyVideo(
      wake,
      path.join(heroDir, `wake-chroma-v${version}.mp4`),
      force,
    );
  }

  const fallbackSource = image || video;
  const sourceIsVideo = !image;
  const removeChroma = !rawOptions['no-chroma'];
  const key = removeChroma
    ? (
        rawOptions.key && rawOptions.key !== 'auto'
          ? rawOptions.key
          : detectCornerColor(fallbackSource, sourceIsVideo, frame)
      )
    : null;
  await createFallback({
    source: fallbackSource,
    sourceIsVideo,
    destination: path.join(heroDir, spriteName),
    frame,
    key,
    similarity,
    blend,
    removeChroma,
    force,
  });

  const entry = buildRegistryEntry({
    hero,
    version,
    aspectRatio: dimensions.aspectRatio,
    chromaKey: key,
    similarity,
    blend,
    sleep: Boolean(sleep),
    wake: Boolean(wake),
  });
  const registry = await readJson(registryFile, {});
  registry[hero] = entry;
  const sortedRegistry = Object.fromEntries(
    Object.entries(registry).sort(([left], [right]) => left.localeCompare(right)),
  );
  await writeJson(registryFile, sortedRegistry);
  await writeJson(path.join(heroDir, 'animation.json'), {
    hero,
    version,
    chromaKey: removeChroma ? key : null,
    similarity,
    blend,
    ...entry,
  });

  return { hero, heroDir, entry, key };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }
  if (!options.hero || !options.video) {
    throw new Error(`Потрібні --hero і --video.\n\n${HELP}`);
  }

  const result = await importHeroAnimation(options);
  console.log(`[animation] ${result.hero} готовий`);
  console.log(`[animation] папка: ${result.heroDir}`);
  console.log(`[animation] chroma key: ${result.key || 'вимкнено'}`);
}

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main().catch((error) => {
    console.error(`[animation] помилка: ${error.message}`);
    process.exitCode = 1;
  });
}
