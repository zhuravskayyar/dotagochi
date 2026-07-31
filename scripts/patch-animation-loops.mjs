import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchVideoLoop } from './import-hero-animation.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const publicRoot = path.join(projectRoot, 'packages/client/public');
const registryFile = path.join(
  projectRoot,
  'packages/client/src/features/pet/hero-animations.json',
);

async function main() {
  const registry = JSON.parse(await fs.readFile(registryFile, 'utf8'));
  const loopBlend = Number.parseFloat(process.argv[2] || '0.6');

  if (!Number.isFinite(loopBlend) || loopBlend <= 0 || loopBlend > 2) {
    throw new Error('Тривалість зведення має бути числом від 0 до 2 секунд.');
  }

  for (const [hero, animation] of Object.entries(registry)) {
    if (!animation.src) continue;
    const file = path.resolve(publicRoot, animation.src);
    const publicPrefix = `${path.resolve(publicRoot)}${path.sep}`;
    if (!file.startsWith(publicPrefix)) {
      throw new Error(`${hero}: шлях до анімації виходить за межі public.`);
    }

    const result = await patchVideoLoop(file, { loopBlend });
    console.log(
      `[animation-loop] ${hero}: ${result.skipped ? 'already patched' : 'patched'}`,
    );
  }
}

main().catch((error) => {
  console.error(`[animation-loop] помилка: ${error.message}`);
  process.exitCode = 1;
});
