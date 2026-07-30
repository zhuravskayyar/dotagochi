import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const clientPublicRoot = path.join(projectRoot, 'packages/client/public');
const heroesRoot = path.join(clientPublicRoot, 'assets/heroes');
const registryFile = path.join(
  projectRoot,
  'packages/client/src/features/pet/hero-animations.json',
);

const assetKeys = ['src', 'fallbackSrc', 'sleepSrc', 'wakeSrc'];

function registryEntry(manifest) {
  return Object.fromEntries(
    [
      ['src', manifest.src],
      ['fallbackSrc', manifest.fallbackSrc],
      ['sleepSrc', manifest.sleepSrc],
      ['wakeSrc', manifest.wakeSrc],
      ['aspectRatio', manifest.aspectRatio || 1],
      ['chromaKey', manifest.chromaKey],
      ['similarity', manifest.similarity],
      ['blend', manifest.blend],
    ].filter(([, value]) => value !== undefined && value !== null),
  );
}

async function assertAssetExists(assetPath, hero) {
  const cleanPath = assetPath.split('?')[0].replace(/^\/+/, '');
  const absolutePath = path.resolve(clientPublicRoot, cleanPath);
  const publicPrefix = `${path.resolve(clientPublicRoot)}${path.sep}`;
  if (!absolutePath.startsWith(publicPrefix)) {
    throw new Error(`${hero}: asset виходить за межі public: ${assetPath}`);
  }
  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) throw new Error();
  } catch {
    throw new Error(`${hero}: asset не знайдено: ${assetPath}`);
  }
}

export async function discoverAnimationRegistry(root = heroesRoot) {
  const directories = await fs.readdir(root, { withFileTypes: true });
  const entries = [];

  for (const directory of directories) {
    if (!directory.isDirectory()) continue;
    const manifestFile = path.join(root, directory.name, 'animation.json');
    let manifest;
    try {
      manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw new Error(`${directory.name}: невалідний animation.json`);
    }

    if (manifest.hero !== directory.name) {
      throw new Error(
        `${directory.name}: поле hero в animation.json має збігатися з назвою папки`,
      );
    }
    if (!manifest.src) {
      throw new Error(`${directory.name}: animation.json не містить src`);
    }
    for (const key of assetKeys) {
      if (manifest[key]) {
        await assertAssetExists(manifest[key], directory.name);
      }
    }
    entries.push([directory.name, registryEntry(manifest)]);
  }

  return Object.fromEntries(
    entries.sort(([left], [right]) => left.localeCompare(right)),
  );
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const registry = await discoverAnimationRegistry();
  const nextContent = `${JSON.stringify(registry, null, 2)}\n`;

  if (checkOnly) {
    const currentContent = await fs.readFile(registryFile, 'utf8')
      .catch(() => '');
    if (currentContent !== nextContent) {
      throw new Error(
        'hero-animations.json застарів. Виконайте npm run sync:animations.',
      );
    }
    console.log(`[animations] registry актуальний: ${Object.keys(registry).length}`);
    return;
  }

  await fs.writeFile(registryFile, nextContent, 'utf8');
  console.log(`[animations] synced ${Object.keys(registry).length} hero manifests`);
}

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main().catch((error) => {
    console.error(`[animations] sync failed: ${error.message}`);
    process.exitCode = 1;
  });
}
