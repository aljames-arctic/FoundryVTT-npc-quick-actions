import { ACTIVATION_CATEGORY, DISPLAY_CATEGORY } from '../constants';
import { Category } from '../quick-actions';

export class QuickAction {
  public name: string;
  public category: Category;
  public item: Item;
  public actor: Actor;

  constructor(item: Item) {
    this.item = item;
    this.actor = item.actor;
    this.name = item.name;
    this.category = {
      display: DISPLAY_CATEGORY.unidentified,
      action: ACTIVATION_CATEGORY.unidentified,
    };
  }

  roll() {
    return this.item.use();
  }
}