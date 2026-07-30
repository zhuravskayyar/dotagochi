import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const installerCommand = [
  'curl -fsSL ',
  'https://raw.githubusercontent.com/zhuravskayyar/dotagochi/main/install-linux.sh',
  ' | bash',
].join('');

describe('Linux installer page', () => {
  it('copies the one-line installer command from the primary button', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const html = fs.readFileSync(
      path.resolve(process.cwd(), '../../index.html'),
      'utf8',
    );
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'https://zhuravskayyar.github.io/dotagochi/',
      beforeParse(window) {
        Object.defineProperty(window.navigator, 'clipboard', {
          configurable: true,
          value: { writeText },
        });
      },
    });

    try {
      const button = dom.window.document.querySelector('#installButton');
      const command = dom.window.document.querySelector('#commandText');
      const status = dom.window.document.querySelector('#status');

      expect(button).not.toBeNull();
      expect(command?.textContent).toBe(installerCommand);

      button.click();

      expect(writeText).toHaveBeenCalledWith(installerCommand);
      await vi.waitFor(() => {
        expect(status?.textContent).toContain('Встав команду в Terminal');
      });
    } finally {
      dom.window.close();
    }
  });
});
