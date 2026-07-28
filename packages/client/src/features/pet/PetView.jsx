import { useTelegram } from '../../shared/telegram/useTelegram.js';
import { usePet } from './usePet.js';
import { Button } from '../../design-system/components/Button.jsx';
import { ProgressBar } from '../../design-system/components/ProgressBar.jsx';

export function PetView() {
  const { userId } = useTelegram();
  const { pet, loading, error, feed, play } = usePet(userId);

  if (loading) return <div>Загрузка питомца...</div>;
  if (error) return <div>Не удалось загрузить питомца</div>;
  if (!pet) return <div>Питомец не найден</div>;

  return (
    <div className="pet-view">
      <h1>{pet.name}</h1>
      <ProgressBar value={pet.hunger} label="Сытость" />
      <ProgressBar value={pet.happiness} label="Настроение" />
      <div className="pet-actions">
        <Button onClick={feed}>Покормить</Button>
        <Button onClick={play}>Поиграть</Button>
      </div>
    </div>
  );
}
