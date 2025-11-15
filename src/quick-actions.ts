import { 
    DISPLAY_CATEGORY, 
    type ActivationCategory, 
    type DisplayCategory, 
    type SpellSubcategory, 
} from './constants';
import { QuickItem } from './class/quick-action';

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
    if (displayCategoryDelta !== 0) {
      return displayCategoryDelta;
    }

    const activationCategoryDelta = a.category.action.sort - b.category.action.sort;

    if (a.category.display.name === DISPLAY_CATEGORY.spell.name) {
      // Spells: Display -> Activation -> Spell Sub
      if (activationCategoryDelta !== 0) {
        return activationCategoryDelta;
      }
      const subcategoryDelta = (a.category.spell?.sort ?? 0) - (b.category.spell?.sort ?? 0);
      if (subcategoryDelta !== 0) {
        return subcategoryDelta;
      }
    } else {
      // Non-spells: Display -> Activation
      if (activationCategoryDelta !== 0) {
        return activationCategoryDelta;
      }
    }

    return caseInsensitiveCompare(a.name, b.name);
  });
};

function getSpellSlotMap(actor) {
  const actorSystem = actor.system as any;
  const spellSlotMap: Record<string, number> = {};

  if (!actorSystem.spells) return spellSlotMap;

  const pact = actorSystem.spells.pact;
  const pactSlots = pact?.value ?? 0;
  if (pact) {
    spellSlotMap.pact = pactSlots;
  }

  let cumulativeSlots = 0;
  for (let i = 9; i >= 1; i--) {
    const spellLevelKey = `spell${i}`;
    const currentLevelSlots = actorSystem.spells[spellLevelKey]?.value ?? 0;
    cumulativeSlots += currentLevelSlots;

    let totalSlots = cumulativeSlots;
    if (pact && pact.level >= i) {
      totalSlots += pactSlots;
    }

    spellSlotMap[spellLevelKey] = totalSlots;
  }

  return spellSlotMap;
}

export const getTokenActions = (actor: Actor): Action[] => {
  const actions: Action[] = [];
  if (actor) {
    const spellSlotMap = getSpellSlotMap(actor);
    for (const item of actor.items) {
      const action = new QuickItem(item, spellSlotMap);
      if (!action.isHidden) {
        actions.push(action);
      }
    }
    sortActions(actions);
  }
  return actions;
};
