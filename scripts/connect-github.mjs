import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { installGitHubCli } from '../packages/server/src/features/animation-studio/github-auth.service.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const localGitHubCli = path.join(
  projectRoot,
  '.tools',
  'bin',
  process.platform === 'win32' ? 'gh.exe' : 'gh',
);

function execute(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    windowsHide: true,
    ...options,
  });
}

function commandWorks(command) {
  return execute(command, ['--version']).status === 0;
}

function findGitHubCli() {
  if (fs.existsSync(localGitHubCli) && commandWorks(localGitHubCli)) {
    return localGitHubCli;
  }
  return commandWorks('gh') ? 'gh' : '';
}

function authenticated(gh) {
  return execute(
    gh,
    ['auth', 'status', '--hostname', 'github.com', '--active'],
  ).status === 0;
}

function configureGit(gh) {
  const profileResult = execute(gh, ['api', 'user']);
  if (profileResult.status !== 0) return;

  const profile = JSON.parse(profileResult.stdout);
  const login = String(profile.login || '').trim();
  const name = String(profile.name || login).trim();
  const email = String(
    profile.email || `${profile.id}+${login}@users.noreply.github.com`,
  ).trim();

  execute(gh, ['auth', 'setup-git', '--hostname', 'github.com'], {
    stdio: 'inherit',
  });
  execute('git', ['config', '--local', 'user.name', name]);
  execute('git', ['config', '--local', 'user.email', email]);
  console.log(`✓ GitHub підключено як @${login}.`);
}

async function main() {
  let gh = findGitHubCli();
  if (!gh) {
    console.log('Встановлюю офіційний GitHub CLI у папку проєкту…');
    try {
      gh = await installGitHubCli();
    } catch (error) {
      console.warn(`GitHub CLI поки не встановлено: ${error.message}`);
      console.warn('Підключити акаунт можна пізніше кнопкою GITHUB AUTH у Studio.');
      return;
    }
  }

  if (!authenticated(gh)) {
    if (!process.stdin.isTTY) {
      console.warn('GitHub ще не підключено. Використайте кнопку GITHUB AUTH у Studio.');
      return;
    }

    console.log('Відкриваю безпечний вхід GitHub у браузері…');
    const loginEnvironment = { ...process.env };
    delete loginEnvironment.GH_TOKEN;
    delete loginEnvironment.GITHUB_TOKEN;
    const login = execute(
      gh,
      [
        'auth',
        'login',
        '--hostname',
        'github.com',
        '--git-protocol',
        'https',
        '--web',
      ],
      {
        env: loginEnvironment,
        stdio: 'inherit',
      },
    );
    if (login.status !== 0) {
      console.warn('Вхід GitHub пропущено. Studio запуститься без push.');
      return;
    }
  }

  configureGit(gh);
}

main().catch((error) => {
  console.warn(`GitHub не підключено: ${error.message}`);
  console.warn('Studio запуститься; авторизацію можна повторити всередині застосунку.');
});
