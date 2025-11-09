import { ACTIVATION_CATEGORY, DISPLAY_CATEGORY } from '../constants';
import { Category } from '../quick-actions';

export class QuickAction {
  public name: string;
  public category: Category;
  public item: Item;
  public actor: Actor;
  public isHidden: boolean;

  constructor(item: Item) {
    this.item = item;
    this.actor = item.actor;
    this.name = item.name;
    this.category = {
      display: DISPLAY_CATEGORY.unidentified,
      action: ACTIVATION_CATEGORY.unidentified,
    };
    this.isHidden = this.getIsHidden();
  }

  private getIsHidden(): boolean {
    // More complex logic can be added here later.
    return false;
  }

  roll() {
    return this.item.use();
  }
}
