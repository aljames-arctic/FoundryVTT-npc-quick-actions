import { ACTIVATION_CATEGORY, DISPLAY_CATEGORY, SPELL_SUBCATEGORY } from '../constants';
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

    private getIsHidden(activity: any): boolean {
        // Only show potentially combat usable actions.
        const allowedTypes = ['action', 'bonus', 'reaction', 'legendary', 'mythic', 'lair', 'crew', 'special'];
        const activationType = activity?.activation?.type;
        if (!activationType || !allowedTypes.includes(activationType)) return true;

        const isMidiAutomation = activity?.midiProperties?.automationOnly;
        return isMidiAutomation ?? false;
    }
}

export class QuickAction {
  public name: string;
  public category: Category;
  public item: Item;
  public actor: Actor;
  public isHidden: boolean;
  public activities: QuickActivity[];
  public activationType: string;

  constructor(item: Item) {
    this.item = item;
    this.actor = item.actor;
    this.name = item.name;
    this.activities = this.buildActivities(item);
    this.isHidden = this.getIsHidden();
    this.activationType = this.getActivationType();
    this.category = this.getCategory();
  }

  private getActivationType(): string {
    const visibleActivities = this.activities.filter(a => !a.isHidden);
    if (visibleActivities.length === 0) return 'none';

    const firstType = visibleActivities[0].activationType;
    if (visibleActivities.every(a => a.activationType === firstType)) return firstType;
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
      if (spellSubcategory) {
        category.spell = spellSubcategory;
      }
    }

    return category;
  }

  private getActionCategory(): ActivationCategory {
    switch (this.activationType) {
      case 'action':
        return ACTIVATION_CATEGORY.action;
      case 'bonus':
        return ACTIVATION_CATEGORY.bonus;
      case 'reaction':
        return ACTIVATION_CATEGORY.reaction;
      case 'legendary':
        return ACTIVATION_CATEGORY.legendaryAction;
      case 'mythic':
        return ACTIVATION_CATEGORY.mythic;
      case 'lair':
        return ACTIVATION_CATEGORY.lair;
      case 'crew':
        return ACTIVATION_CATEGORY.crew;
      case 'special':
        return ACTIVATION_CATEGORY.special;
      case 'mixedActivation':
        return ACTIVATION_CATEGORY.mixed;
      default:
        return ACTIVATION_CATEGORY.undefined;
    }
  }

  private getDisplayCategory(): DisplayCategory {
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
    const preparationMode = spellSystem.preparation?.mode;
    const spellLevel = spellSystem.level;

    if (preparationMode === 'pact') return SPELL_SUBCATEGORY.pact;
    if (preparationMode === 'atwill') return SPELL_SUBCATEGORY.atwill;
    if (preparationMode === 'innate') return SPELL_SUBCATEGORY.innate;
    if (spellSystem.properties?.has('ritual')) return SPELL_SUBCATEGORY.ritual;

    if (spellLevel === 0) return SPELL_SUBCATEGORY.cantrip;
    if (spellLevel >= 1 && spellLevel <= 9) {
      return SPELL_SUBCATEGORY[`level${spellLevel}` as keyof typeof SPELL_SUBCATEGORY];
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
    return favorites.some(favorite => favorite.type === 'item' && favorite.id.endsWith(`.${this.item.id}`));
  }

  private getIsHidden(): boolean {
    if (this.item.system.container) return true;
    if (ShowOnlyFavorites.get() && !this.isFavorite()) return true;
    if (this.item.system.properties?.has('trait')) return true;
    if (this.activities.length === 0) return true;
    return this.activities.every(activity => activity.isHidden);
  }

  roll() {
    return this.item.use();
  }
}
