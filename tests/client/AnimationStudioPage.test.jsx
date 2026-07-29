import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AnimationStudioPage } from '../../packages/client/src/features/animation-studio/AnimationStudioPage.jsx';
import { HeroAnimationPreviewPage } from '../../packages/client/src/features/animation-studio/HeroAnimationPreviewPage.jsx';

const { importSpy, listSpy, statusSpy } = vi.hoisted(() => ({
  importSpy: vi.fn(),
  listSpy: vi.fn(),
  statusSpy: vi.fn(),
}));

vi.mock(
  '../../packages/client/src/features/animation-studio/animationStudioApi.js',
  () => ({
    animationStudioApi: {
      listHeroes: listSpy,
      setCompleted: statusSpy,
      importAnimation: importSpy,
    },
  }),
);

vi.mock(
  '../../packages/client/src/features/pet/ChromaKeyVideo.jsx',
  () => ({
    ChromaKeyVideo: ({ label, src }) => (
      <div role="img" aria-label={label} data-src={src} />
    ),
  }),
);

const heroes = [
  {
    id: 2,
    slug: 'axe',
    name: 'Axe',
    portrait: '/assets/heroes/axe/portrait.png',
    completed: false,
    animation: null,
  },
  {
    id: 6,
    slug: 'drow_ranger',
    name: 'Drow Ranger',
    portrait: '/assets/heroes/drow_ranger/portrait.png',
    completed: true,
    animation: {
      src: 'assets/heroes/drow_ranger/idle-chroma-v1.mp4',
      fallbackSrc: 'assets/heroes/drow_ranger/sprite-v1.png',
      aspectRatio: 0.82,
    },
  },
];

describe('AnimationStudioPage', () => {
  beforeEach(() => {
    listSpy.mockResolvedValue({ heroes });
    statusSpy.mockImplementation(async (slug, completed) => ({
      hero: {
        ...heroes.find((hero) => hero.slug === slug),
        completed,
      },
    }));
    importSpy.mockResolvedValue({
      hero: {
        ...heroes[0],
        completed: true,
        chromaKey: '0x00ff00',
        animation: {
          src: 'assets/heroes/axe/idle-chroma-v1.mp4',
          fallbackSrc: 'assets/heroes/axe/sprite-v1.png',
          aspectRatio: 1,
        },
        work: {
          importedAt: '2026-07-29T10:30:00.000Z',
          version: 1,
          chromaKey: '0x00ff00',
          aspectRatio: 1,
          files: {
            idle: 'axe.mp4',
            image: null,
            sleep: null,
            wake: null,
          },
        },
        history: [{
          importedAt: '2026-07-29T10:30:00.000Z',
          version: 1,
          files: { idle: 'axe.mp4' },
        }],
      },
    });
    window.history.replaceState({}, '', '/');
    URL.createObjectURL = vi.fn(() => 'blob:idle-preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('shows completion progress and opens a saved preview', async () => {
    render(<AnimationStudioPage />);

    await screen.findByText('Drow Ranger');
    expect(screen.getByText('1/2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Drow Ranger/ }));

    const preview = await screen.findByRole('img', {
      name: 'Прев’ю Drow Ranger',
    });
    expect(preview.getAttribute('data-src')).toContain(
      'drow_ranger/idle-chroma-v1.mp4',
    );
  });

  it('opens an immediate local preview, imports it and marks the hero done', async () => {
    const { container } = render(<AnimationStudioPage />);
    await screen.findByRole('heading', { name: 'Axe' });

    const idleInput = container.querySelector('input[name="idle"]');
    const idleFile = new File(['video'], 'axe.mp4', { type: 'video/mp4' });
    fireEvent.change(idleInput, { target: { files: [idleFile] } });

    const preview = await screen.findByRole('img', { name: 'Прев’ю Axe' });
    expect(preview.getAttribute('data-src')).toBe('blob:idle-preview');

    fireEvent.submit(container.querySelector('.studio-import-form'));

    await waitFor(() => expect(importSpy).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/ГОТОВО: Axe/)).toBeTruthy();
    expect(screen.getByLabelText('Axe: виконано').checked).toBe(true);
    expect(screen.getByText('ЗБЕРЕЖЕНА РОБОТА')).toBeTruthy();
    expect(screen.getByText('axe.mp4')).toBeTruthy();
  });

  it('opens a saved hero in the full Tamagotchi preview page', async () => {
    window.history.replaceState({}, '', '/tamagotchi-preview?hero=drow_ranger');
    render(<HeroAnimationPreviewPage />);

    expect(await screen.findByRole('img', {
      name: 'Прев’ю Drow Ranger',
    })).toBeTruthy();
    expect(screen.getByText('ПОВНЕ ПРЕВ’Ю ТАМАГОЧІ')).toBeTruthy();
  });
});
