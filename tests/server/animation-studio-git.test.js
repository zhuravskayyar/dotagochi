import { describe, expect, it, vi } from 'vitest';
import {
  assertOnlyStudioFiles,
  createGitSyncService,
  parsePathList,
} from '../../packages/server/src/features/animation-studio/git-sync.service.js';

describe('Animation Studio Git sync', () => {
  it('normalizes cross-platform Git path lists', () => {
    expect(parsePathList(
      'packages\\client\\public\\assets\\heroes\\pudge\\work.json\r\n'
      + 'packages/client/src/features/pet/hero-animations.json\n',
    )).toEqual([
      'packages/client/public/assets/heroes/pudge/work.json',
      'packages/client/src/features/pet/hero-animations.json',
    ]);
  });

  it('rejects unrelated staged files', () => {
    expect(() => assertOnlyStudioFiles([
      'packages/client/public/assets/heroes/pudge/work.json',
      'packages/server/src/index.js',
    ], 'pudge')).toThrow(/сторонні staged-файли/);
  });

  it('commits only the selected hero and registry before push', async () => {
    const calls = [];
    let stagedChecks = 0;
    const run = vi.fn(async (command, args) => {
      calls.push([command, args]);
      const signature = `${command} ${args.join(' ')}`;
      if (signature === 'git branch --show-current') {
        return { stdout: 'main', stderr: '' };
      }
      if (signature === 'git diff --cached --name-only') {
        stagedChecks += 1;
        return stagedChecks === 1
          ? { stdout: '', stderr: '' }
          : {
              stdout: [
                'packages/client/public/assets/heroes/pudge/work.json',
                'packages/client/src/features/pet/hero-animations.json',
              ].join('\n'),
              stderr: '',
            };
      }
      if (signature === 'git rev-parse --short HEAD') {
        return { stdout: 'abc1234', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const result = await createGitSyncService(run).pushHero('pudge', 'Pudge');
    const gitAdd = calls.find(([, args]) => args[0] === 'add');
    const gitCommit = calls.find(([, args]) => args[0] === 'commit');

    expect(gitAdd[1]).toEqual([
      'add',
      '--',
      'packages/client/public/assets/heroes/pudge',
      'packages/client/src/features/pet/hero-animations.json',
    ]);
    expect(gitCommit[1]).toContain('Update Pudge animation');
    expect(calls.some(([, args]) => args.includes('-A'))).toBe(false);
    expect(result.committed).toBe(true);
    expect(result.commit).toBe('abc1234');
  });

  it('refuses to pull over local work', async () => {
    const run = vi.fn(async (command, args) => {
      const signature = `${command} ${args.join(' ')}`;
      if (signature === 'git branch --show-current') {
        return { stdout: 'main', stderr: '' };
      }
      if (signature.startsWith('git status --porcelain')) {
        return { stdout: ' M local-file.js', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    await expect(
      createGitSyncService(run).pullChanges(),
    ).rejects.toThrow(/незбережені локальні зміни/);
    expect(run.mock.calls.some(([, args]) => args[0] === 'pull')).toBe(false);
  });
});
