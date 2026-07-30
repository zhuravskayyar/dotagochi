import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const environmentFile = process.env.DOTA_TAMAGOTCHI_ENV_FILE
  || path.join(projectRoot, '.env');
const dataDirectory = process.env.DOTA_TAMAGOTCHI_DATA_DIR
  || path.join(
    process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'),
    'dota-tamagotchi',
  );
const backupsDirectory = path.join(dataDirectory, 'backups');
const defaultDatabasePath = path.join(dataDirectory, 'dota-tamagotchi.sqlite');
const maximumBackups = 7;

function parseDatabasePath(contents = '') {
  const line = contents
    .split(/\r?\n/)
    .find((entry) => /^\s*DATABASE_PATH\s*=/.test(entry));
  if (!line) return '';

  const value = line
    .replace(/^\s*DATABASE_PATH\s*=\s*/, '')
    .trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

function quoteEnvironmentValue(value) {
  return `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function upsertDatabasePath(contents, databasePath) {
  const line = `DATABASE_PATH=${quoteEnvironmentValue(databasePath)}`;
  if (/^\s*DATABASE_PATH\s*=.*$/m.test(contents)) {
    return contents.replace(/^\s*DATABASE_PATH\s*=.*$/m, line);
  }
  const separator = contents && !contents.endsWith('\n') ? '\n' : '';
  return `${contents}${separator}\n# Persistent local SQLite database\n${line}\n`;
}

async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

async function snapshotDatabase(sourcePath, destinationPath) {
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  const source = new Database(sourcePath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    await source.backup(destinationPath);
  } finally {
    source.close();
  }
}

function timestamp() {
  return new Date().toISOString().replaceAll(':', '-').replace('.', '-');
}

async function rotateBackups() {
  const entries = await fs.readdir(backupsDirectory, { withFileTypes: true });
  const backups = entries
    .filter((entry) => entry.isFile() && /^dota-tamagotchi-.*\.sqlite$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  await Promise.all(
    backups.slice(maximumBackups).map((name) =>
      fs.rm(path.join(backupsDirectory, name), { force: true })),
  );
}

async function main() {
  let environmentContents = '';
  try {
    environmentContents = await fs.readFile(environmentFile, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const configuredPath = parseDatabasePath(environmentContents);
  const databasePath = configuredPath && path.isAbsolute(configuredPath)
    ? configuredPath
    : defaultDatabasePath;
  const legacyCandidates = [
    configuredPath && !path.isAbsolute(configuredPath)
      ? path.join(projectRoot, 'packages', 'server', configuredPath
        .replace(/^\.\/?src\/database\//, ''))
      : '',
    path.join(projectRoot, 'packages', 'server', 'dota-tamagotchi.sqlite'),
    path.join(
      projectRoot,
      'packages',
      'server',
      'src',
      'database',
      'dota-tamagotchi.sqlite',
    ),
  ].filter((candidate, index, items) =>
    candidate
    && path.resolve(candidate) !== path.resolve(databasePath)
    && items.indexOf(candidate) === index);

  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  await fs.mkdir(backupsDirectory, { recursive: true });

  if (!await fileExists(databasePath)) {
    for (const candidate of legacyCandidates) {
      if (!await fileExists(candidate)) continue;
      await snapshotDatabase(candidate, databasePath);
      console.log(`[database] перенесено локальні дані: ${candidate}`);
      break;
    }
  }

  if (await fileExists(databasePath)) {
    const backupPath = path.join(
      backupsDirectory,
      `dota-tamagotchi-${timestamp()}.sqlite`,
    );
    await snapshotDatabase(databasePath, backupPath);
    await rotateBackups();
    console.log(`[database] резервна копія: ${backupPath}`);
  }

  const nextEnvironmentContents = upsertDatabasePath(
    environmentContents,
    databasePath,
  );
  await fs.mkdir(path.dirname(environmentFile), { recursive: true });
  await fs.writeFile(environmentFile, nextEnvironmentContents, {
    encoding: 'utf8',
    mode: 0o600,
  });
  console.log(`[database] постійне сховище: ${databasePath}`);
}

main().catch((error) => {
  console.error(`[database] ${error.message}`);
  process.exitCode = 1;
});
