import { PetView } from './features/pet/PetView.jsx';
import { useTelegram } from './shared/telegram/useTelegram.js';

export default function App() {
  const { isReady } = useTelegram();

  if (!isReady) {
    return <div className="app-loading">Загрузка...</div>;
  }

  return (
    <div className="app">
      <PetView />
    </div>
  );
}
