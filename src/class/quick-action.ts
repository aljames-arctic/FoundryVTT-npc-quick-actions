import { ACTIVATION_CATEGORY, DISPLAY_CATEGORY, SPELL_SUBCATEGORY, SpellSubcategory } from '../constants';
import { Category } from '../quick-actions';
import { ShowOnlyFavorites } from '../settings';

export class QuickActivity {
  public name: string;
  public isHidden: boolean;
  public activationType: string;

  constructor(activity: any) {
    this.name = activity.name;
    this.isHidden = this.getIsHidden(activity);
    this.activationType = activity.activation.type;
  }

  private activationConditionMet(activity): boolean {
    /**
     * Safely evaluates a condition string in the context of an actor's roll data.
     * @param {string} condition    The condition string to evaluate.
     * @param {object} rollData     The actor's roll data.
     * @returns {boolean}           The result of the evaluation.
     */
    function evaluateCondition(condition : string, rollData) {
        if (!condition?.trim()) return true;
        try {
            const func = new Function(...Object.keys(rollData), `return ${condition};`);
            return func(...Object.values(rollData));
        } catch (err) {
            // console.error(`Error evaluating condition "${condition}":`, err);
            return true;
        }
    }

    const condition = activity.activation.condition ?? 'true';
    const rollData = activity.actor.getRollData();
    return evaluateCondition(condition, rollData);
  }

  private getIsHidden(activity: any): boolean {
    const isMidiAutomation = activity?.midiProperties?.automationOnly;
    if (isMidiAutomation) return true;

    // Activation conditions not met.
    if (!this.activationConditionMet(activity)) return true;

    // Only show potentially combat usable actions.
    const allowedTypes = ['action', 'bonus', 'reaction', 'legendary', 'mythic', 'lair', 'crew', 'special'];
    const activationType = activity?.activation?.type;
    if (!activationType || !allowedTypes.includes(activationType)) return true;

    return false;
  }
}

export class QuickItem {
  public name: string;
  public category: Category;
  public item: Item;
  public actor: Actor;
  public isHidden: boolean;
  public activities: QuickActivity[];
  public activationType: string;
  private spellSlotMap: any;

  constructor(item: Item, spellSlotMap: any) {
    this.item = item;
    this.actor = item.actor;
    this.name = item.name;
    this.spellSlotMap = spellSlotMap;
    this.activities = this.buildActivities(item);
    this.isHidden = this.getIsHidden();
    this.activationType = this.getActivationType();
    this.category = this.getCategory();
  }

  private getActivationType(): string {
    const visibleActivities = this.activities.filter((a) => !a.isHidden);
    if (visibleActivities.length === 0) return 'none';

    const firstType = visibleActivities[0].activationType;
    if (visibleActivities.every((a) => a.activationType === firstType)) return firstType;
    return 'mixedActivation';
  }

  private getCategory(): Category {
    const action = this.getActionCategory();
    const display = this.getDisplayCategory();

    const category: Category = {
      display,
      action,
    };

    if (display === DISPLAY_CATEGORY.spell) {
      const spellSubcategory = this.getSpellSubcategory();
      if (spellSubcategory) category.spell = spellSubcategory;
    }

    return category;
  }

  private getActionCategory(): ActivationCategory {
    const standardActions = ['action', 'bonus', 'reaction', 'mythic', 'lair', 'crew', 'special'];
    if (standardActions.includes(this.activationType)) return ACTIVATION_CATEGORY[this.activationType];
    if (this.activationType === 'legendary') return ACTIVATION_CATEGORY.legendaryAction;
    if (this.activationType == 'mixedActivation') return ACTIVATION_CATEGORY.mixed;
    return ACTIVATION_CATEGORY.undefined;
  }

  private getDisplayCategory(): DisplayCategory {
    // Special Cases
    if (this.activationType === 'legendary') return DISPLAY_CATEGORY.special;
    if (this.activationType === 'lair') return DISPLAY_CATEGORY.special;

    const itemType = this.item.type;
    switch (itemType) {
      case 'feat':
        return DISPLAY_CATEGORY.feature;
      case 'spell':
        return DISPLAY_CATEGORY.spell;
      case 'weapon':
      case 'equipment':
      case 'consumable':
      case 'tool':
      case 'backpack':
      case 'loot':
        return DISPLAY_CATEGORY.item;
      default:
        return DISPLAY_CATEGORY.undefined;
    }
  }

  private getSpellSubcategory(): SpellSubcategory | undefined {
    const spellSystem = this.item.system as dnd5e.documents.ItemSystemData.Spell;
    const preparationMode = spellSystem.method;
    const spellLevel = spellSystem.level;
    const actorSystem = this.actor.system as any;

    if (preparationMode === 'pact') {
      const subcategory = { ...SPELL_SUBCATEGORY.pact };
      const pact = actorSystem.spells?.pact;
      if (pact) {
        subcategory.level = pact.level;
        if (pact.max > 0) {
          subcategory.slots = { available: pact.value, maximum: pact.max };
        }
      }
      return subcategory;
    }
    if (preparationMode === 'atwill') return SPELL_SUBCATEGORY.atwill;
    if (preparationMode === 'innate') return SPELL_SUBCATEGORY.innate;

    if (spellLevel === 0) return SPELL_SUBCATEGORY.cantrip;
    if (spellLevel >= 1 && spellLevel <= 9) {
      const subcategory = { ...SPELL_SUBCATEGORY[`level${spellLevel}` as keyof typeof SPELL_SUBCATEGORY] };
      const spellN = actorSystem.spells?.[`spell${spellLevel}`];
      if (spellN && spellN.max > 0) {
        subcategory.slots = { available: spellN.value, maximum: spellN.max };
      }
      return subcategory;
    }

    return undefined;
  }

  private buildActivities(item: Item): QuickActivity[] {
    const activities: QuickActivity[] = [];
    if (item.system?.activities) {
      for (const activity of item.system.activities.values()) {
        activities.push(new QuickActivity(activity));
      }
    }
    return activities;
  }

  private isFavorite(): boolean {
    const actor = this.actor;
    if (!('favorites' in actor.system)) return true;
    const favorites = actor.system.favorites;
    if (!favorites?.length) return true;
    return favorites.some((favorite) => favorite.type === 'item' && favorite.id.endsWith(`.${this.item.id}`));
  }

  private shouldHideSpell(): boolean {
    const spellSystem = this.item.system as dnd5e.documents.ItemSystemData.Spell;
    const spellLevel = spellSystem.level;

    // Don't need to prepare these... no spell level cost either
    if (spellSystem.method === 'atwill' || spellSystem.method === 'innate' || spellLevel === 0) {
      return false;
    }

    // Check for if it is prepared
    if (spellSystem.prepared === 0) return true;

    // Pact Magic can only be cast with Pact Slots
    if (spellSystem.method === 'pact') {
      return (this.spellSlotMap.pact ?? 0) === 0;
    }

    // Requires spell slots
    if (spellLevel >= 1) {
      const availableSlots = this.spellSlotMap[`spell${spellLevel}`] ?? 0;
      if (availableSlots === 0) return true;
    }

    return false;
  }

  private getIsHidden(): boolean {
    if (this.item.type === 'spell' && this.shouldHideSpell()) return true;
    if (this.item.system.container) return true;
    if (ShowOnlyFavorites.get() && !this.isFavorite()) return true;
    if (this.item.system.properties?.has('trait')) return true;
    if (this.activities.length === 0) return true;
    return this.activities.every((activity) => activity.isHidden);
  }

  roll() {
    return this.item.use();
  }
}