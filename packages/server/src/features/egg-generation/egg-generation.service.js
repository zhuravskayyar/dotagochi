// Заглушка: процедурная генерация "яйца" питомца
export const eggGenerationService = {
  generate(userId) {
    const seed = `${userId}-${Date.now()}`;
    return { userId, seed, rarity: 'common' };
  },
};
