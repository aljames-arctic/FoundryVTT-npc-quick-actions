import { 
    DISPLAY_CATEGORY, 
    type ActivationCategory, 
    type DisplayCategory, 
    type SpellSubcategory, 
} from './constants';
import { QuickAction } from './class/quick-action';

// --- Utility Functions ---

function caseInsensitiveCompare(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

// --- Action and Category Types & Constants ---

export type Category = {
  display: DisplayCategory;
  spell?: SpellSubcategory;
  action: ActivationCategory;
};

export type Action = {
  roll: () => void;
  actor: Actor;
  item: Item;
  name: string;
  category: Category;
  newTurnReset?: (() => Promise<void>) | null;
};

// --- Main Exported Function ---

const sortActions = (actions: Action[]) => {
  actions.sort((a, b) => {
    const displayCategoryDelta = a.category.display.sort - b.category.display.sort;
    if (displayCategoryDelta !== 0) { return displayCategoryDelta; }

    const activationCategoryDelta = a.category.action.sort - b.category.action.sort;

    if (a.category.display.name === DISPLAY_CATEGORY.spell.name) {
      // Spells: Display -> Activation -> Spell Sub
      if (activationCategoryDelta !== 0) { return activationCategoryDelta; }
      const subcategoryDelta = (a.category.spell?.level ?? 0) - (b.category.spell?.level ?? 0);
      if (subcategoryDelta !== 0) { return subcategoryDelta; }
    } else {
      // Non-spells: Display -> Activation
      if (activationCategoryDelta !== 0) { return activationCategoryDelta; }
    }

    return caseInsensitiveCompare(a.name, b.name);
  });
};

export const getTokenActions = (actor: Actor) : Action[] => {
  const actions: Action[] = [];
  if (actor) {
    for (const item of actor.items) {
        actions.push(new QuickAction(item));
    }
    sortActions(actions);
  }
  return actions;
};
