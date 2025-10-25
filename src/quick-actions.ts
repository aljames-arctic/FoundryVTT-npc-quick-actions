import * as ItemSystem from './item-system';
import module from './module';
import { ShowOnlyFavorites, ShowZeroUsesRemainActions, showUnequippedItems, showUnpreparedSpells } from './settings';

// --- Utility Functions ---

function caseInsensitiveCompare(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

function getSpellLevelLabel(level: number): string {
    if (level === 0) {
        return module.localize('spell-abbr.cantrip');
    }
    const suffix = getOrdinalSuffix(level);
    return `${level}${suffix} ${module.localize('spell-level-label')}`;
}

// --- Action and Category Types & Constants ---

export type SpellSubcategory = {
  name: string;
  displayName: string;
  sort: number;
  level: number;
  slots?: { available: number; maximum: number };
};

const SPELL_SUBCATEGORY = {
    pact: { name: 'spell_pact', sort: 0 },
    atwill: { name: 'spell_atwill', sort: 1 },
    ritual: { name: 'spell_ritual', sort: 2 },
    innate: { name: 'spell_innate', sort: 3 },
    cantrip: { name: 'spell_cantrip', sort: 4 },
    level1: { name: 'spell_level1', sort: 5 },
    level2: { name: 'spell_level2', sort: 6 },
    level3: { name: 'spell_level3', sort: 7 },
    level4: { name: 'spell_level4', sort: 8 },
    level5: { name: 'spell_level5', sort: 9 },
    level6: { name: 'spell_level6', sort: 10 },
    level7: { name: 'spell_level7', sort: 11 },
    level8: { name: 'spell_level8', sort: 12 },
    level9: { name: 'spell_level9', sort: 13 },
}

export type DisplayCategory = {
  sort: number;
  name: string;
};

export const DISPLAY_CATEGORY = {
  item: { sort: 1, name: 'display_item' },
  feature: { sort: 2, name: 'display_feature' },
  spell: { sort: 3, name: 'display_spell' },
  other: { sort: 4, name: 'display_other' },
  legendary: { sort: 5, name: 'display_legendary' },
  lair: { sort: 6, name: 'display_lair' },
};

export type ActivationCategory = {
  sort: number;
  name: string;
};
const ACTIVATION_CATEGORY = {
  action: { sort: 1, name: 'activation_action' },
  bonus: { sort: 2, name: 'activation_bonus' },
  reaction: { sort: 3, name: 'activation_reaction' },
  mixed: { sort: 3.5, name: 'activation_mixed' },
  legendary: { sort: 4, name: 'activation_legendary' },
  legendaryResistance: { sort: 5, name: 'activation_legendaryResistance' },
  lair: { sort: 6, name: 'activation_lair' },
  special: { sort: 7, name: 'activation_special' },
  crew: { sort: 8, name: 'activation_crew' },
  newTurn: { sort: 99, name: 'activation_newTurn' },
};

type TypeCategory = {
  sort: number;
  name: string;
};
const TYPE_CATEGORY = {
  weapon: { sort: 1, name: "type_weapon" },
  equipment: { sort: 2, name: "type_equipment"},
  consumable: { sort: 3, name: "type_consumable"},
  other: { sort: 4, name: "type_other"},
  feature: { sort: 5, name: "type_feature" },
  spell: { sort: 6, name: "type_spell" },
};

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

const ITEM_TYPE_MAPPING: Record<string, TypeCategory> = {
    weapon: TYPE_CATEGORY.weapon,
    equipment: TYPE_CATEGORY.equipment,
    consumable: TYPE_CATEGORY.consumable,
};

// --- Category Logic Helpers ---

const getActivationCategoryFromType = (activationType: string | undefined): ActivationCategory | null => {
    if (!activationType) { return null; }
    const key = activationType.toLowerCase(); 
    return ACTIVATION_CATEGORY[key as keyof typeof ACTIVATION_CATEGORY] ?? null;
};

const getActivationCategoryFromActivity = (activity: any): ActivationCategory | null => {
  if (activity?.consumption?.targets?.some((target: any) => target?.target === 'resources.legres.value')) {
    return ACTIVATION_CATEGORY.legendaryResistance;
  }
  return getActivationCategoryFromType(activity?.activation?.type);
};

function getDisplayCategory(typeCategory: TypeCategory, activationCategory: ActivationCategory): DisplayCategory {
    switch (activationCategory.name) {
        case ACTIVATION_CATEGORY.legendary.name:
        case ACTIVATION_CATEGORY.legendaryResistance.name:
            return DISPLAY_CATEGORY.legendary;
        case ACTIVATION_CATEGORY.lair.name:
            return DISPLAY_CATEGORY.lair;
    }

    switch (typeCategory.name) {
        case TYPE_CATEGORY.weapon.name:
        case TYPE_CATEGORY.equipment.name:
            return DISPLAY_CATEGORY.item;
        case TYPE_CATEGORY.feature.name:
            return DISPLAY_CATEGORY.feature;
        case TYPE_CATEGORY.spell.name:
            return DISPLAY_CATEGORY.spell;
        case TYPE_CATEGORY.consumable.name:
        case TYPE_CATEGORY.other.name:
            return DISPLAY_CATEGORY.other;
    }
    return DISPLAY_CATEGORY.other;
}

type ItemCategoryData = {
  typeCategory: TypeCategory;
  spellSubcategory?: SpellSubcategory;
};

// --- Spell Type Helpers ---

const shouldFilterUnpreparedSpell = (item: Item): boolean => {
    return (
        item.actor?.type !== 'npc' && 
        !item.system.prepared && 
        !showUnpreparedSpells(item.actor)
    );
};

const getSpellLevelCategory = (item: Item): ItemCategoryData => {
    const actor = item.actor;
    const level = item.system.level ?? 0;
    const spellLevelKey = level === 0 ? 'cantrip' : `level${level}`;
    
    let slots: { available: number; maximum: number } | undefined;
    if (actor && level > 0) {
        const spellSlots = actor.system.spells[`spell${level}` as keyof typeof actor.system.spells];
        if (spellSlots) {
            slots = { available: spellSlots.value, maximum: spellSlots.max };
        }
    }

    const spellSubcategory: SpellSubcategory = {
        name: SPELL_SUBCATEGORY[spellLevelKey as keyof typeof SPELL_SUBCATEGORY]?.name ?? `spell_level${level}`,
        displayName: getSpellLevelLabel(level),
        sort: 4 + level,
        level,
        slots,
    };

    return {
        typeCategory: TYPE_CATEGORY.spell,
        spellSubcategory,
    };
};

const SPELL_METHOD_MAP: Record<string, { name: string, sort: number, level: number }> = {
    pact: { name: 'pact', sort: SPELL_SUBCATEGORY.pact.sort, level: 0.5 },
    atwill: { name: 'atwill-ritual', sort: SPELL_SUBCATEGORY.atwill.sort, level: -20 },
    ritual: { name: 'atwill-ritual', sort: SPELL_SUBCATEGORY.ritual.sort, level: -20 },
    innate: { name: 'innate', sort: SPELL_SUBCATEGORY.innate.sort, level: -10 },
};

const getSpellMethodCategory = (item: Item): ItemCategoryData => {
    const actor = item.actor;
    const method = item.system.method ?? '';
    
    const methodData = SPELL_METHOD_MAP[method];

    if (methodData) {
        let slots: { available: number; maximum: number } | undefined;
        if (method === 'pact' && actor) {
            const pact = actor.system.spells.pact;
            if (pact) { slots = { available: pact.value, maximum: pact.max }; }
        }
        
        const subcategory: SpellSubcategory = {
            name: SPELL_SUBCATEGORY[method as keyof typeof SPELL_SUBCATEGORY]?.name ?? `spell_${method}`,
            displayName: module.localize(`spell-abbr.${methodData.name}`),
            sort: methodData.sort,
            level: methodData.level,
            slots,
        };

        return {
            typeCategory: TYPE_CATEGORY.spell,
            spellSubcategory: subcategory,
        };
    }

    // Default case for unknown spell methods (should be dead code)
    const subcategory: SpellSubcategory = {
        name: 'spell_unknown',
        displayName: module.localize('spell-abbr.unknown'),
        sort: 99,
        level: -30,
    };
    return {
        typeCategory: TYPE_CATEGORY.spell,
        spellSubcategory: subcategory,
    };
};

const getSpellTypeCategory = (item: Item): ItemCategoryData | null => {
    const method = item.system.method ?? '';
    if (method === 'spell') {
        if (shouldFilterUnpreparedSpell(item)) { return null; }
        return getSpellLevelCategory(item);
    }
    
    return getSpellMethodCategory(item);
};

const getDefaultTypeCategory = (item: Item): ItemCategoryData | null => {
    const itemType = item.type;
    const typeCategory = ITEM_TYPE_MAPPING[itemType] ?? TYPE_CATEGORY.other;

    if (item.actor?.type !== 'npc' && !foundry.utils.getProperty(item.system, 'equipped')) {
        if (!showUnequippedItems(item.actor)) { return null; }
    }
    
    return { typeCategory };
};

const categorizeItem = (item: Item): ItemCategoryData | null => {
  switch (item.type) {
    case 'feat':
      return { typeCategory: TYPE_CATEGORY.feature };
    case 'spell':
      return getSpellTypeCategory(item);
    default:
      return getDefaultTypeCategory(item);
  }
};

// Returns all categories for the activities of an item
const categorizeActivities = (item: Item): ActivationCategory[] => {
  // INDIVIDUALLY REVIEWED AND APPROVED
  const activities = item?.system?.activities?.entries() ?? [];
  const uniqueActivities = new Map<string, ActivationCategory>();
  for (const [_, activity] of activities) {
    const currentCategory = getActivationCategoryFromActivity(activity);
    if (currentCategory) {
        if (!uniqueActivities.has(currentCategory.name)) {
            uniqueActivities.set(currentCategory.name, currentCategory);
        }
    }
  }
  return Array.from(uniqueActivities.values());
};

// --- Filtering Helpers ---

const hasNoFavoritesOrIsInFavorites = (actor: Actor, item: Item): boolean => {
    // INDIVIDUALLY REVIEWED AND APPROVED
    if (!('favorites' in actor.system)) return true;
    const favorites = actor.system.favorites;
    if (!favorites?.length) return true;
    return favorites.some(favorite => favorite.type === 'item' && favorite.id.endsWith(`.${item.id}`));
};

// --- Action Construction Helpers ---

const getActionNameWithUses = (item: Item): string | null => {
    // INDIVIDUALLY REVIEWED AND APPROVED
    const uses = ItemSystem.calculateUsesForItem(item);
    if (!uses) { return item.name; }
    if (item.type == "spell") {     // Only show count for atwill / ritual / innate
        if (["pact", "spell", undefined].includes(item.method)) { return item.name; }
    }
    if (!ShowZeroUsesRemainActions.get()) { 
        if (uses.available === 0) { return null; }
    }

    let usageCount = (uses.maximum) ? `${uses.available} / ${uses.maximum}` : `${uses.available}`;
    return `${item.name} (${usageCount})`;
};

const getActionForItem = (actor: Actor, item: Item): Action | null => {
  if (ShowOnlyFavorites.get()) { // Module setting to show only favorite items
    if (!hasNoFavoritesOrIsInFavorites(actor, item)) { return null; }
  }
  
  const itemCategoryData = categorizeItem(item);
  if (!itemCategoryData) { return null; }

  // Get the line item display name including usage amounts
  let displayName = getActionNameWithUses(item);
  if (!displayName) { return null; }
  
  const activationCategories = categorizeActivities(item);
  if (activationCategories.length === 0) { return null; }

  const activationCategory = (activationCategories.length > 1) ? ACTIVATION_CATEGORY.mixed : activationCategories[0];
  const displayCategory = getDisplayCategory(itemCategoryData.typeCategory, activationCategory);
  
  const category: Category = {
      display: displayCategory,
      action: activationCategory,
      spell: itemCategoryData.spellSubcategory,
  };

  const roll = () => { void item.use(); };
  const action: Action = {
      roll,
      actor,
      item,
      name: displayName,
      category,
      newTurnReset: null,
  };

  return action;
};

// --- Main Exported Function ---

export const getTokenActions = (actor: Actor) => {
  // INDIVIDUALLY REVIEWED AND APPROVED
  if (!actor) { return null;}
  const actions: Action[] = [];
  
  for (const item of actor.items) {
    if (item.system.properties?.has('trait')) continue;
    const action = getActionForItem(actor, item);
    if (action) { actions.push(action); }
  }
  
  actions.sort((a, b) => {
    const displayCategoryDelta = a.category.display.sort - b.category.display.sort;
    if (displayCategoryDelta !== 0) { return displayCategoryDelta; }

    // Spells: Display -> Spell Sub -> Activation
    if (a.category.display.name === DISPLAY_CATEGORY.spell.name) {
      const subcategoryDelta = (a.category.spell?.level ?? 0) - (b.category.spell?.level ?? 0);
      if (subcategoryDelta !== 0) { return subcategoryDelta; }
    }
    
    // Non-spells: Display -> Activation
    const activationCategoryDelta = a.category.action.sort - b.category.action.sort;
    if (activationCategoryDelta !== 0) { return activationCategoryDelta; }

    return caseInsensitiveCompare(a.name, b.name);
  });

  return actions;
};