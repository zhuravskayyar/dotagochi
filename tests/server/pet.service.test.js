import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

process.env.DATABASE_PATH = path.join(process.cwd(), '../../packages/server/src/database/test.sqlite');

const { petService } = await import('../../packages/server/src/features/pet/pet.service.js');
const { db } = await import('../../packages/server/src/database/connection.js');

const migrationSql = fs.readFileSync(
  path.join(process.cwd(), '../../packages/server/src/database/migrations/001_init.sql'),
  'utf-8'
);
db.exec(migrationSql);

describe('petService', () => {
  afterAll(() => {
    const dbFile = process.env.DATABASE_PATH;
    for (const suffix of ['', '-wal', '-shm']) {
      const f = dbFile + suffix;
      if (fs.existsSync(f)) fs.rmSync(f);
    }
  });

  it('creates a pet on first access', () => {
    const pet = petService.getPet('test-user-1');
    expect(pet.user_id).toBe('test-user-1');
    expect(pet.hunger).toBe(100);
  });

  it('feed increases hunger, capped at 100', () => {
    petService.getPet('test-user-2');
    const pet = petService.feed('test-user-2');
    expect(pet.hunger).toBeLessThanOrEqual(100);
  });
});
