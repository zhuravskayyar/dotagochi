import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PetView } from '../../packages/client/src/features/pet/PetView.jsx';

const { actionSpy } = vi.hoisted(() => ({ actionSpy: vi.fn() }));

vi.mock('../../packages/client/src/shared/telegram/useTelegram.js', () => ({
  useTelegram: () => ({ isReady: true, userId: 'dev-user' }),
}));

vi.mock('../../packages/client/src/features/pet/usePet.js', () => ({
  usePet: () => ({
    pet: { name: 'Юзик', hunger: 80, happiness: 60 },
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
});
