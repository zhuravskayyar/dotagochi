import { describe, expect, it, vi } from 'vitest';
import {
  createGitHubAuthService,
  parseLoginOutput,
  profileFromGitHubUser,
} from '../../packages/server/src/features/animation-studio/github-auth.service.js';

describe('Animation Studio GitHub authentication', () => {
  it('extracts the device code without exposing credentials', () => {
    expect(parseLoginOutput(
      'First copy your one-time code: ABCD-EFGH\n'
      + 'Open https://github.com/login/device in your browser',
    )).toMatchObject({
      userCode: 'ABCD-EFGH',
      verificationUri: 'https://github.com/login/device',
    });
  });

  it('uses GitHub profile data and a noreply fallback email', () => {
    expect(profileFromGitHubUser({
      id: 12345,
      login: 'animator',
      name: null,
      email: null,
      avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      html_url: 'https://github.com/animator',
    })).toEqual({
      login: 'animator',
      name: 'animator',
      email: '12345+animator@users.noreply.github.com',
      avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
      profileUrl: 'https://github.com/animator',
    });
  });

  it('reuses a saved GitHub CLI session and configures Git for push', async () => {
    const profile = {
      login: 'animator',
      name: 'Animation Artist',
      email: 'artist@example.com',
      avatarUrl: '',
      profileUrl: 'https://github.com/animator',
    };
    const setupGit = vi.fn();
    const service = createGitHubAuthService({
      locateCli: vi.fn(async () => '/tools/gh'),
      execute: vi.fn(async () => ({ ok: true, stdout: '', stderr: '' })),
      getProfile: vi.fn(async () => profile),
      setupGit,
    });

    const result = await service.connect();

    expect(result).toMatchObject({
      cliInstalled: true,
      authenticated: true,
      phase: 'connected',
      profile,
      persistent: true,
    });
    expect(setupGit).toHaveBeenCalledWith('/tools/gh', profile);
  });
});
