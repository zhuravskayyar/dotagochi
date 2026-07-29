import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { validateHeroSlug } from '../../../../../scripts/import-hero-animation.mjs';

const execFileAsync = promisify(execFile);
const featureDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(featureDir, '../../../../..');
const registryPath = 'packages/client/src/features/pet/hero-animations.json';
const syncScript = path.join(projectRoot, 'scripts/sync-hero-animations.mjs');

function studioError(message, status = 409) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanOutput(value = '') {
  return value.trim().replaceAll(projectRoot, '.');
}

async function defaultRun(command, args) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: projectRoot,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
      },
      maxBuffer: 5 * 1024 * 1024,
      windowsHide: true,
    });
    return {
      stdout: cleanOutput(result.stdout),
      stderr: cleanOutput(result.stderr),
    };
  } catch (error) {
    const detail = cleanOutput(error.stderr || error.stdout || error.message);
    throw studioError(
      detail || `Не вдалося виконати ${command}.`,
      502,
    );
  }
}

export function parsePathList(output = '') {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replaceAll('\\', '/'));
}

export function assertOnlyStudioFiles(paths, heroSlug) {
  const heroRoot = `packages/client/public/assets/heroes/${heroSlug}/`;
  const unsafe = paths.filter((file) => (
    file !== registryPath && !file.startsWith(heroRoot)
  ));
  if (unsafe.length) {
    throw studioError(
      `Перед відправленням приберіть сторонні staged-файли: ${unsafe.join(', ')}`,
    );
  }
}

export function createGitSyncService(run = defaultRun) {
  let busy = false;

  const runLocked = async (operation) => {
    if (busy) {
      throw studioError('Git-синхронізація вже виконується. Зачекайте.');
    }
    busy = true;
    try {
      return await operation();
    } finally {
      busy = false;
    }
  };

  const git = (args) => run('git', args);

  const ensureMainBranch = async () => {
    const { stdout } = await git(['branch', '--show-current']);
    if (stdout !== 'main') {
      throw studioError(
        `Синхронізація Studio доступна лише в гілці main. Поточна: ${stdout || 'невідома'}.`,
      );
    }
  };

  return {
    async pushHero(heroSlug, heroName = heroSlug) {
      return runLocked(async () => {
        const slug = validateHeroSlug(heroSlug);
        const heroPath = `packages/client/public/assets/heroes/${slug}`;
        await ensureMainBranch();

        const stagedBefore = await git(['diff', '--cached', '--name-only']);
        assertOnlyStudioFiles(parsePathList(stagedBefore.stdout), slug);

        await run(process.execPath, [syncScript]);
        await git(['add', '--', heroPath, registryPath]);

        const stagedAfter = await git(['diff', '--cached', '--name-only']);
        const stagedFiles = parsePathList(stagedAfter.stdout);
        assertOnlyStudioFiles(stagedFiles, slug);

        let committed = false;
        if (stagedFiles.length) {
          await git([
            'commit',
            '-m',
            `Update ${heroName} animation`,
            '--',
            heroPath,
            registryPath,
          ]);
          committed = true;
        }

        const pushResult = await git(['push', 'origin', 'main']);
        const { stdout: commit } = await git(['rev-parse', '--short', 'HEAD']);
        return {
          operation: 'push',
          committed,
          commit,
          files: stagedFiles,
          message: committed
            ? `Збережено й відправлено: ${heroName} · ${commit}`
            : `Нових файлів для ${heroName} немає. GitHub синхронізовано · ${commit}`,
          detail: pushResult.stderr || pushResult.stdout,
        };
      });
    },

    async pullChanges() {
      return runLocked(async () => {
        await ensureMainBranch();
        const status = await git(['status', '--porcelain', '--untracked-files=all']);
        if (status.stdout) {
          throw studioError(
            'Є незбережені локальні зміни. Спочатку натисніть «Зберегти й відправити» або закомітьте їх вручну.',
          );
        }

        const { stdout: before } = await git(['rev-parse', '--short', 'HEAD']);
        const pullResult = await git(['pull', '--ff-only', 'origin', 'main']);
        await run(process.execPath, [syncScript]);
        const syncStatus = await git(['status', '--porcelain', '--', registryPath]);
        if (syncStatus.stdout) {
          throw studioError(
            'Отримані manifests не збігаються з каталогом анімацій. Попросіть автора виконати sync:animations і push.',
          );
        }
        const { stdout: after } = await git(['rev-parse', '--short', 'HEAD']);
        return {
          operation: 'pull',
          changed: before !== after,
          commit: after,
          message: before === after
            ? `Уже актуально · ${after}`
            : `Отримано нові зміни · ${before} → ${after}`,
          detail: pullResult.stdout || pullResult.stderr,
        };
      });
    },
  };
}

export const gitSyncService = createGitSyncService();
