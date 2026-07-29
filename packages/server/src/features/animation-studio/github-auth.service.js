import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const featureDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(featureDir, '../../../../..');
const toolsBin = path.join(projectRoot, '.tools', 'bin');
const githubHost = 'github.com';
const maxOutputLength = 8_000;
const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function serviceError(message, status = 409) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanOutput(value = '') {
  return String(value)
    .replaceAll(ansiPattern, '')
    .replaceAll(projectRoot, '.')
    .trim()
    .slice(-maxOutputLength);
}

function commandEnvironment({
  clearGitHubTokens = false,
  interactiveGitHubLogin = false,
} = {}) {
  const environment = {
    ...process.env,
    PATH: `${toolsBin}${path.delimiter}${process.env.PATH || ''}`,
  };
  if (clearGitHubTokens) {
    delete environment.GH_TOKEN;
    delete environment.GITHUB_TOKEN;
  }
  if (interactiveGitHubLogin) {
    delete environment.CI;
    delete environment.GITHUB_ACTIONS;
    delete environment.GH_PROMPT_DISABLED;
    delete environment.GH_BROWSER;
  }
  return environment;
}

async function run(
  command,
  args,
  { allowFailure = false, clearGitHubTokens = true } = {},
) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: projectRoot,
      env: commandEnvironment({ clearGitHubTokens }),
      maxBuffer: 5 * 1024 * 1024,
      windowsHide: true,
    });
    return {
      ok: true,
      stdout: cleanOutput(result.stdout),
      stderr: cleanOutput(result.stderr),
    };
  } catch (error) {
    const result = {
      ok: false,
      stdout: cleanOutput(error.stdout),
      stderr: cleanOutput(error.stderr || error.message),
    };
    if (allowFailure) return result;
    throw serviceError(result.stderr || `Не вдалося виконати ${command}.`, 502);
  }
}

function localGhPath() {
  return path.join(toolsBin, process.platform === 'win32' ? 'gh.exe' : 'gh');
}

async function executableWorks(command) {
  const result = await run(command, ['--version'], { allowFailure: true });
  return result.ok;
}

async function findGitHubCli() {
  const local = localGhPath();
  if (await executableWorks(local)) return local;
  if (await executableWorks('gh')) return 'gh';
  return '';
}

function releaseAssetSuffix() {
  const architectures = {
    x64: 'amd64',
    arm64: 'arm64',
  };
  const architecture = architectures[process.arch];
  if (!architecture) {
    throw serviceError(`GitHub CLI не підтримує архітектуру ${process.arch}.`, 501);
  }
  if (process.platform === 'win32') return `_windows_${architecture}.zip`;
  if (process.platform === 'linux') return `_linux_${architecture}.tar.gz`;
  if (process.platform === 'darwin') return `_macOS_${architecture}.zip`;
  throw serviceError(`Автоматичне встановлення GitHub CLI не підтримує ${process.platform}.`, 501);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Dota-Tamagotchi-Animation-Studio',
    },
  });
  if (!response.ok) {
    throw serviceError(`GitHub відповів кодом ${response.status}.`, 502);
  }
  return response.json();
}

async function download(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Dota-Tamagotchi-Animation-Studio' },
  });
  if (!response.ok) {
    throw serviceError(`Не вдалося завантажити GitHub CLI (${response.status}).`, 502);
  }
  return Buffer.from(await response.arrayBuffer());
}

function checksumFor(checksums, assetName) {
  const line = checksums
    .split(/\r?\n/)
    .find((entry) => entry.trim().endsWith(`  ${assetName}`));
  return line?.trim().split(/\s+/)[0] || '';
}

async function findFile(directory, name) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === name.toLowerCase()) {
      return candidate;
    }
    if (entry.isDirectory()) {
      const nested = await findFile(candidate, name);
      if (nested) return nested;
    }
  }
  return '';
}

export async function installGitHubCli() {
  const release = await fetchJson('https://api.github.com/repos/cli/cli/releases/latest');
  const suffix = releaseAssetSuffix();
  const asset = release.assets?.find((item) => item.name.endsWith(suffix));
  const checksumsAsset = release.assets?.find((item) => item.name.endsWith('_checksums.txt'));
  if (!asset || !checksumsAsset) {
    throw serviceError('У релізі GitHub CLI не знайдено потрібний файл.', 502);
  }

  const [archive, checksumsBuffer] = await Promise.all([
    download(asset.browser_download_url),
    download(checksumsAsset.browser_download_url),
  ]);
  const expectedHash = checksumFor(checksumsBuffer.toString('utf8'), asset.name);
  const actualHash = createHash('sha256').update(archive).digest('hex');
  if (!expectedHash || expectedHash !== actualHash) {
    throw serviceError('Контрольна сума GitHub CLI не збігається.', 502);
  }

  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dotagochi-gh-'));
  try {
    const archivePath = path.join(temporaryDirectory, asset.name);
    const extractDirectory = path.join(temporaryDirectory, 'extract');
    await fs.mkdir(extractDirectory, { recursive: true });
    await fs.writeFile(archivePath, archive);
    await run('tar', ['-xf', archivePath, '-C', extractDirectory]);

    const executableName = process.platform === 'win32' ? 'gh.exe' : 'gh';
    const extracted = await findFile(extractDirectory, executableName);
    if (!extracted) {
      throw serviceError('У завантаженому архіві GitHub CLI немає виконуваного файла.', 502);
    }

    await fs.mkdir(toolsBin, { recursive: true });
    const destination = localGhPath();
    await fs.copyFile(extracted, destination);
    if (process.platform !== 'win32') await fs.chmod(destination, 0o755);
    if (!await executableWorks(destination)) {
      throw serviceError('Завантажений GitHub CLI не запускається.', 502);
    }
    return destination;
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export function parseLoginOutput(output = '') {
  const clean = cleanOutput(output);
  return {
    userCode: clean.match(/\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/)?.[0] || '',
    verificationUri: clean.match(/https:\/\/github\.com\/login\/device\b/)?.[0]
      || 'https://github.com/login/device',
    detail: clean,
  };
}

export function profileFromGitHubUser(user = {}) {
  const login = String(user.login || '').trim();
  if (!login || !user.id) {
    throw serviceError('GitHub не повернув дані профілю.', 502);
  }
  return {
    login,
    name: String(user.name || login).trim(),
    email: String(user.email || `${user.id}+${login}@users.noreply.github.com`).trim(),
    avatarUrl: String(user.avatar_url || '').trim(),
    profileUrl: String(user.html_url || `https://github.com/${login}`).trim(),
  };
}

async function readProfile(gh) {
  const response = await run(gh, ['api', 'user']);
  let user;
  try {
    user = JSON.parse(response.stdout);
  } catch {
    throw serviceError('Не вдалося прочитати профіль GitHub.', 502);
  }
  return profileFromGitHubUser(user);
}

async function configureGit(gh, profile) {
  await run(gh, ['auth', 'setup-git', '--hostname', githubHost]);
  await run('git', ['config', '--local', 'user.name', profile.name]);
  await run('git', ['config', '--local', 'user.email', profile.email]);

  const remote = await run('git', ['remote', 'get-url', 'origin'], { allowFailure: true });
  const sshMatch = remote.stdout.match(/^git@github\.com:(.+)$/);
  if (sshMatch) {
    await run('git', ['remote', 'set-url', 'origin', `https://github.com/${sshMatch[1]}`]);
  }
}

export function createGitHubAuthService({
  locateCli = findGitHubCli,
  installCli = installGitHubCli,
  execute = run,
  spawnProcess = spawn,
  getProfile = readProfile,
  setupGit = configureGit,
} = {}) {
  let loginProcess = null;
  let state = {
    phase: 'idle',
    message: '',
    userCode: '',
    verificationUri: 'https://github.com/login/device',
    startedAt: null,
  };

  const authenticatedProfile = async (gh) => {
    const auth = await execute(
      gh,
      ['auth', 'status', '--hostname', githubHost, '--active'],
      { allowFailure: true },
    );
    if (!auth.ok) return null;
    return getProfile(gh);
  };

  const response = async (gh = '') => {
    const profile = gh ? await authenticatedProfile(gh) : null;
    return {
      cliInstalled: Boolean(gh),
      authenticated: Boolean(profile),
      phase: profile ? 'connected' : state.phase,
      message: profile ? `GitHub підключено як @${profile.login}.` : state.message,
      userCode: state.userCode,
      verificationUri: state.verificationUri,
      profile,
      persistent: Boolean(profile),
    };
  };

  const finishLogin = async (gh, exitCode) => {
    loginProcess = null;
    if (exitCode !== 0) {
      state = {
        ...state,
        phase: 'error',
        message: 'Вхід у GitHub не завершено. Спробуйте ще раз.',
      };
      return;
    }

    try {
      const profile = await getProfile(gh);
      await setupGit(gh, profile);
      state = {
        ...state,
        phase: 'connected',
        message: `GitHub підключено як @${profile.login}. Дані для push збережено.`,
      };
    } catch (error) {
      state = {
        ...state,
        phase: 'error',
        message: error.message,
      };
    }
  };

  return {
    async status() {
      const gh = await locateCli();
      return response(gh);
    },

    async connect() {
      let gh = await locateCli();
      if (!gh) {
        state = {
          ...state,
          phase: 'installing',
          message: 'Встановлюю офіційний GitHub CLI…',
        };
        gh = await installCli();
      }

      const currentProfile = await authenticatedProfile(gh);
      if (currentProfile) {
        await setupGit(gh, currentProfile);
        state = {
          ...state,
          phase: 'connected',
          message: `GitHub підключено як @${currentProfile.login}. Дані для push збережено.`,
        };
        return response(gh);
      }

      if (loginProcess) return response(gh);

      state = {
        phase: 'authorizing',
        message: 'Підтвердьте вхід у відкритій вкладці GitHub.',
        userCode: '',
        verificationUri: 'https://github.com/login/device',
        startedAt: new Date().toISOString(),
      };

      const child = spawnProcess(
        gh,
        ['auth', 'login', '--hostname', githubHost, '--git-protocol', 'https', '--web'],
        {
          cwd: projectRoot,
          env: commandEnvironment({
            clearGitHubTokens: true,
            interactiveGitHubLogin: true,
          }),
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      loginProcess = child;
      let loginSettled = false;
      let output = '';
      let signalCodeReady;
      const codeReady = new Promise((resolve) => {
        signalCodeReady = resolve;
      });
      const appendOutput = (chunk) => {
        output = `${output}${chunk}`.slice(-maxOutputLength);
        const parsed = parseLoginOutput(output);
        state = {
          ...state,
          userCode: parsed.userCode || state.userCode,
          verificationUri: parsed.verificationUri,
          message: parsed.userCode
            ? `Введіть код ${parsed.userCode} у GitHub.`
            : state.message,
        };
        if (parsed.userCode) signalCodeReady();
      };
      child.stdout?.on('data', appendOutput);
      child.stderr?.on('data', appendOutput);
      const settleLogin = (code) => {
        if (loginSettled) return;
        loginSettled = true;
        signalCodeReady();
        finishLogin(gh, code);
      };
      child.once('error', () => settleLogin(1));
      child.once('close', (code) => settleLogin(code ?? 1));

      await Promise.race([
        codeReady,
        new Promise((resolve) => setTimeout(resolve, 2_000)),
      ]);
      return response(gh);
    },
  };
}

export const githubAuthService = createGitHubAuthService();
