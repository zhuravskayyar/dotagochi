import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PetView } from '../../packages/client/src/features/pet/PetView.jsx';

const { actionSpy, petState } = vi.hoisted(() => ({
  actionSpy: vi.fn(),
  petState: {
    current: { name: 'Юзик', hunger: 80, happiness: 60 },
  },
}));

vi.mock('../../packages/client/src/shared/telegram/useTelegram.js', () => ({
  useTelegram: () => ({ isReady: true, userId: 'dev-user' }),
}));

vi.mock('../../packages/client/src/features/pet/usePet.js', () => ({
  usePet: () => ({
    pet: petState.current,
    loading: false,
    error: null,
    message: '',
    action: actionSpy,
    reload: vi.fn(),
  }),
}));

vi.mock('../../packages/client/src/features/notifications/useNotifications.js', () => ({
  useNotifications: () => ({
    settings: { enabled: 1 },
    updateSettings: vi.fn(),
  }),
}));

describe('PetView', () => {
  beforeEach(() => {
    petState.current = { name: 'Юзик', hunger: 80, happiness: 60 };
  });

  it('renders pet name', () => {
    render(<PetView />);
    expect(screen.getByText('Юзик')).toBeTruthy();
  });

  it('selects an action without running it until DECIDE is pressed', () => {
    actionSpy.mockClear();
    render(<PetView />);

    fireEvent.click(screen.getByRole('button', { name: 'ТРЕНУВАННЯ' }));
    expect(actionSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'DECIDE' }));
    expect(actionSpy).toHaveBeenCalledWith('train');
  });

  it('shows button and action lessons in settings', () => {
    render(<PetView />);
    fireEvent.click(screen.getByRole('button', { name: 'STATUS' }));
    fireEvent.click(screen.getByRole('button', { name: 'НАЛАШТУВАННЯ ТА НАВЧАННЯ' }));

    expect(screen.getByText('КНОПКИ КОРПУСУ')).toBeTruthy();
    expect(screen.getByText('ДІЇ ГЕРОЯ')).toBeTruthy();
    expect(screen.getByText('Підтверджує та виконує вибрану верхню дію.')).toBeTruthy();
  });

  it('uses the supplied animation and fallback sprite for Drow Ranger', () => {
    petState.current = {
      name: 'Drow Ranger',
      hero_name: 'Drow Ranger',
      hero_slug: 'drow_ranger',
      hunger: 80,
      mood: 70,
    };

    const { container } = render(<PetView />);
    const character = container.querySelector('.chroma-character');
    const video = character?.querySelector('video');
    const fallback = character?.querySelector('.chroma-fallback');

    expect(character).toBeTruthy();
    expect(character?.style.getPropertyValue('--chroma-aspect')).toBe('0.824716');
    expect(video?.getAttribute('src')).toContain('drow_ranger/idle-chroma-v1.mp4');
    expect(fallback?.getAttribute('src')).toContain('drow_ranger/sprite-v1.png');
    expect(screen.getByRole('img', { name: 'Drow Ranger' })).toBeTruthy();
  });
});
