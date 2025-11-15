import module from './module';

// --- Utility Functions ---

function getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

export function getSpellLevelLabel(level: number): string {
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
export const SPELL_SUBCATEGORY: Record<string, Omit<SpellSubcategory, 'slots'>> = {
    additional: { name: 'spell_additional', displayName: '', sort: 0, level: -1 },
    pact: { name: 'spell_pact', displayName: '', sort: 1, level: -1 },
    atwill: { name: 'spell_atwill', displayName: '', sort: 2, level: 0 },
    ritual: { name: 'spell_ritual', displayName: '', sort: 3, level: -1 },
    innate: { name: 'spell_innate', displayName: '', sort: 4, level: -1 },
    cantrip: { name: 'spell_cantrip', displayName: '', sort: 5, level: 0 },
    level1: { name: 'spell_level1', displayName: '', sort: 6, level: 1 },
    level2: { name: 'spell_level2', displayName: '', sort: 7, level: 2 },
    level3: { name: 'spell_level3', displayName: '', sort: 8, level: 3 },
    level4: { name: 'spell_level4', displayName: '', sort: 9, level: 4 },
    level5: { name: 'spell_level5', displayName: '', sort: 10, level: 5 },
    level6: { name: 'spell_level6', displayName: '', sort: 11, level: 6 },
    level7: { name: 'spell_level7', displayName: '', sort: 12, level: 7 },
    level8: { name: 'spell_level8', displayName: '', sort: 13, level: 8 },
    level9: { name: 'spell_level9', displayName: '', sort: 14, level: 9 },
};

export type DisplayCategory = {
  sort: number;
  name: string;
};
export const DISPLAY_CATEGORY = {
  item: { sort: 1, name: 'display_item' },
  feature: { sort: 2, name: 'display_feature' },
  spell: { sort: 3, name: 'display_spell' },
  special: { sort: 4, name: 'display_special' },
  undefined: { sort: 5, name: 'display_undefined' },
};

export type ActivationCategory = {
  sort: number;
  name: string;
};
export const ACTIVATION_CATEGORY: Record<string, ActivationCategory> = {
    action: { name: 'activation_action', sort: 0 },
    bonus: { name: 'activation_bonus', sort: 1 },
    reaction: { name: 'activation_reaction', sort: 2 },
    mixed: { name: 'activation_mixed', sort: 3 },
    mythic: { name: 'activation_mythic', sort: 4 },
    legendaryAction: { name: 'activation_legendaryAction', sort: 5 },
    legendaryResist: { name: 'activation_legendaryResist', sort: 6 },
    lair: { name: 'activation_lair', sort: 7 },
    special: { name: 'activation_special', sort: 8 },
    crew: { name: 'activation_crew', sort: 9 },
    newTurn: { name: 'activation_new-turn', sort: 10 },
    undefined: { name: 'activation_undefined', sort: 99 },
};

export type TypeCategory = {
  sort: number;
  name: string;
};
export const TYPE_CATEGORY = {
  weapon: { sort: 1, name: "type_weapon" },
  equipment: { sort: 2, name: "type_equipment"},
  consumable: { sort: 3, name: "type_consumable"},
  other: { sort: 4, name: "type_other"},
  feature: { sort: 5, name: "type_feature" },
  spell: { sort: 6, name: "type_spell" },
};
