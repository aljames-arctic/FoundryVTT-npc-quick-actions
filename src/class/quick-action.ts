import { ACTIVATION_CATEGORY, DISPLAY_CATEGORY } from '../constants';
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
    this.category = {
      display: DISPLAY_CATEGORY.unidentified,
      action: ACTIVATION_CATEGORY.unidentified,
    };
    this.activities = this.buildActivities(item);
    this.isHidden = this.getIsHidden();
    this.activationType = this.getActivationType();
  }

  private getActivationType(): string {
    const visibleActivities = this.activities.filter(a => !a.isHidden);
    if (visibleActivities.length === 0) return 'none';

    const firstType = visibleActivities[0].activationType;
    if (visibleActivities.every(a => a.activationType === firstType)) return firstType;
    return 'mixedActivation';
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
