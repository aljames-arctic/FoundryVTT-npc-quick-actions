export class QuickActionItem { 
  constructor(item) {
    this.name = item.name;
    this.activities = item.activities.array.map(activity => { QuickActionActivity(activity); });
    this.action = determineActionCategory();
    this.type = getType(item);
    this.subtype = getSubtype(item);
    this.usable = isUsable();
  }

  static determineActionCategory() {
    const activities = this.activities;
    const uniqueActivation = new Set();
    for (let activity of activities) {
        if (!activity.activation) continue;
        if (!activity.usable) continue;

        uniqueActivation.add(activity.activation);
        if (uniqueActivation.size > 1) break;
    }

    switch (uniqueActivation.size) {
        case 0: return null;
        case 1: return uniqueActivation.first();
        case 2: return 'mixed'
    }
  }

  static isUsable() {
    return true;
  }

  static getType(item) {
    switch (item.type) {
        case 'weapon':
            return 'item'
        case 'spell':
            return 'spell'
        default:
            return null
    }
  }

  static getSubtype(item) {
    if (!this.type == 'spell') return null;
    return null;
  }
}

export class QuickActionActivity {
    constructor(activity) {
        this.name = activity.name;
        this.activation = activity.activation.type;
        this.usable = isUsable();
    }

    static isUsable() {
        return true;
    }
}