import { calculateUsesForItem as dnd5eCalculateUsesForItem } from './dnd5e';

const getItemSystemCalculator = () => {
  switch (game.system.id) {
    case 'dnd5e':
        return dnd5eCalculateUsesForItem;
    default:
        return null;
  }
};

export const calculateUsesForItem = (item: dnd5e.documents.Item5e) => {
  const itemSystemCalculator = getItemSystemCalculator();
  if (!itemSystemCalculator) { return null; }
  return itemSystemCalculator(item);
};
