import { ACTIVATION_CATEGORY, DISPLAY_CATEGORY } from '../constants';
import { Category } from '../quick-actions';

export class QuickActivity {
    public name: string;
    public isHidden: boolean;

    constructor(activity: any) {
        this.name = activity.name;
        this.isHidden = this.getIsHidden(activity);
    }

    private getIsHidden(activity: any): boolean {
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

  private getIsHidden(): boolean {
    if (this.activities.length === 0) {
      return true;
    }
    return this.activities.every(activity => activity.isHidden);
  }

  roll() {
    return this.item.use();
  }
}