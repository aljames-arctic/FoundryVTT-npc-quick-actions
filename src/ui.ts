// ui.ts
import { 
    ACTIVATION_CATEGORY, 
    DISPLAY_CATEGORY,
    type ActivationCategory, 
    type DisplayCategory, 
    type SpellSubcategory 
} from './constants';
import module from './module';
import { getTokenActions, type Action, type Category } from './quick-actions';
import { MinimumRole, ShowForNPCActors, ShowForPCActors, ShowForVehicleActors, QuickActionBackgroundOpacity, QuickActionTextOpacity } from './settings';

const CSS_ACTIVE = module.cssPrefix.child('active');
const CSS_OUTER_CONTAINER = module.cssPrefix.child('outer-container');
const CSS_CONTAINER = module.cssPrefix.child('container');
const CSS_ENTRY = module.cssPrefix.child('entry');
const CSS_NO_ACTIONS = module.cssPrefix.child('no-actions');
const CSS_COLLAPSED = module.cssPrefix.child('collapsed');

const CSS_DISPLAY_CATEGORY_WRAPPER = module.cssPrefix.child('display-category-wrapper');
const CSS_DISPLAY_CATEGORY_HEADER = module.cssPrefix.child('display-category-header');
const CSS_DISPLAY_CATEGORY_ENTRIES = module.cssPrefix.child('display-category-entries');

const CSS_ACTIVATION_CATEGORY_WRAPPER = module.cssPrefix.child('activation-category-wrapper');
const CSS_ACTIVATION_CATEGORY_HEADER = module.cssPrefix.child('activation-category-header');
const CSS_ACTIVATION_CATEGORY_ENTRIES = module.cssPrefix.child('activation-category-entries');

const CSS_SPELL_SUB_CATEGORY_WRAPPER = module.cssPrefix.child('spell-sub-category-wrapper');
const CSS_SPELL_SUB_CATEGORY_HEADER = module.cssPrefix.child('spell-sub-category-header');
const CSS_SPELL_SUB_CATEGORY_ENTRIES = module.cssPrefix.child('spell-sub-category-entries');

export class QuickActionsUI {
  private actionsOuterContainer: HTMLDivElement;
  private actionsContainer: HTMLDivElement;

  private static COLLAPSED_FLAG = 'collapsed';

  constructor() {
    this.actionsOuterContainer = document.createElement('div');
    this.actionsOuterContainer.classList.add(CSS_OUTER_CONTAINER);

    this.actionsContainer = document.createElement('div');
    this.actionsContainer.classList.add(CSS_CONTAINER);
    this.actionsOuterContainer.appendChild(this.actionsContainer);

    Hooks.once('ready', () => {
      document.body.appendChild(this.actionsOuterContainer);
    });
  }

  public hideTokenActions = () => {
    module.logger.debug('hide');
    this.actionsOuterContainer.classList.remove(CSS_ACTIVE);
    QuickActionsUI.emptyNode(this.actionsContainer);
  };

  private createCollapsibleContainer(
    title: string,
    key: string,
    actor: dnd5e.documents.Actor5e,
    parent: HTMLElement,
    headerLevel: 'div',
    wrapperClass: string,
    headerClass: string,
    entriesClass: string
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.classList.add(wrapperClass);
    parent.appendChild(wrapper);

    const collapsedData = (actor.getFlag(module.id, QuickActionsUI.COLLAPSED_FLAG) || {}) as Record<string, {isCollapsed: boolean}>;
    
    // DEBUG: Log state retrieval before applying class
    const isInitiallyCollapsed = foundry.utils.getProperty(collapsedData, `${key}.isCollapsed`) ?? false;

    if (isInitiallyCollapsed) {
        wrapper.classList.add(CSS_COLLAPSED);
    }

    const header = document.createElement(headerLevel);
    header.classList.add(headerClass);
    header.textContent = title;
    wrapper.appendChild(header);

    header.addEventListener('click', async () => {
        const isCollapsed = wrapper.classList.toggle(CSS_COLLAPSED);
        let collapsedData = (actor.getFlag(module.id, QuickActionsUI.COLLAPSED_FLAG) || {}) as Record<string, {isCollapsed: boolean}>;
        foundry.utils.mergeObject(collapsedData, {[`${key}.isCollapsed`]: isCollapsed});
        await actor.setFlag(module.id, QuickActionsUI.COLLAPSED_FLAG, collapsedData);
    });

    const entriesContainer = document.createElement('div');
    entriesContainer.classList.add(entriesClass);
    wrapper.appendChild(entriesContainer);

    return entriesContainer;
  }

  private getActivationCategoryNameWithUses = (
    category: SpellSubcategory | ActivationCategory,
    actor: dnd5e.documents.Actor5e
  ) => {
    if ('level' in category) { // It's a SpellSubcategory
        const spellSubcategory = category as SpellSubcategory;
        let displayName = module.localize(spellSubcategory.name);
        if (spellSubcategory.slots) {
            const displayAmount = `${spellSubcategory.slots.available} / ${spellSubcategory.slots.maximum}`;
            const display = (spellSubcategory.slots.available) ? displayAmount : `UPCAST`;
            displayName = `${displayName} (${display})`;
        }
        return displayName;
    } else { // It's an ActivationCategory
        const activationCategory = category as ActivationCategory;
        let displayName = module.localize(activationCategory.name);
        switch (activationCategory.name) {
            case ACTIVATION_CATEGORY.legendaryAction.name:
                const legact = actor.system.resources.legact;
                if (legact && legact.max > 0) displayName = `${displayName} (${legact.value} / ${legact.max})`;
                break;
            case ACTIVATION_CATEGORY.legendaryResist.name:
                const legres = actor.system.resources.legres;
                if (legres && legres.max > 0) displayName = `${displayName} (${legres.value} / ${legres.max})`;
                break;
        }
        return displayName;
    }
  };

  private isShownForActorType = (actor: dnd5e.documents.Actor5e) => {
    if (actor.type === 'character') {
      return ShowForPCActors.get();
    }
    if (actor.type === 'npc') {
      return ShowForNPCActors.get();
    }
    if (actor.type === 'vehicle') {
      return ShowForVehicleActors.get();
    }
    module.logger.debug('isShownForActorType saw a type it does not recognize:', actor.type);
    return true;
  };

  private buildActionsList = (actions: Action[], actor: dnd5e.documents.Actor5e) => {
    let lastDisplayCategory: DisplayCategory | null = null;
    let displayCategoryEntries: HTMLElement | null = null;

    let lastActivationCategory: ActivationCategory | null = null;
    let activationCategoryEntries: HTMLElement | null = null;

    let lastSpellSubcategory: SpellSubcategory | null = null;
    let spellSubcategoryEntries: HTMLElement | null = null;

    for (const action of actions) {
        if (action.category.display.name !== lastDisplayCategory?.name) {
            lastDisplayCategory = action.category.display;
            const displayCategoryName = module.localize(action.category.display.name);
            
            // Display Category is the outermost level
            const key = action.category.display.name; 
            displayCategoryEntries = this.createCollapsibleContainer(displayCategoryName, key, actor, this.actionsContainer, 'div', CSS_DISPLAY_CATEGORY_WRAPPER, CSS_DISPLAY_CATEGORY_HEADER, CSS_DISPLAY_CATEGORY_ENTRIES);
            
            lastActivationCategory = null;
            lastSpellSubcategory = null;
        }

        if (action.category.display.name === DISPLAY_CATEGORY.spell.name && action.category.spell) {
            // Activation Category (e.g., Action, Bonus Action)
            if (action.category.action.name !== lastActivationCategory?.name) {
                lastActivationCategory = action.category.action;
                const activationCategoryName = module.localize(action.category.action.name);
                const key = `${lastDisplayCategory!.name}.${lastActivationCategory.name}`;
                activationCategoryEntries = this.createCollapsibleContainer(activationCategoryName, key, actor, displayCategoryEntries!, 'div', CSS_ACTIVATION_CATEGORY_WRAPPER, CSS_ACTIVATION_CATEGORY_HEADER, CSS_ACTIVATION_CATEGORY_ENTRIES);
                lastSpellSubcategory = null;
            }

            // Spell Subcategory (e.g., Cantrips, 1st Level, Innate) inside an Activation Category
            if (action.category.spell.name !== lastSpellSubcategory?.name) {
                lastSpellSubcategory = action.category.spell;
                const spellSubcategoryName = this.getActivationCategoryNameWithUses(action.category.spell, actor);
                const key = `category.${lastDisplayCategory!.name}.${lastActivationCategory!.name}.${lastSpellSubcategory.name}`;
                spellSubcategoryEntries = this.createCollapsibleContainer(spellSubcategoryName, key, actor, activationCategoryEntries!, 'div', CSS_SPELL_SUB_CATEGORY_WRAPPER, CSS_SPELL_SUB_CATEGORY_HEADER, CSS_SPELL_SUB_CATEGORY_ENTRIES);
            }
            spellSubcategoryEntries!.appendChild(this.getActionRow(action));
        } else {
            // Activation Category (e.g., Action, Bonus Action) for non-spells (Items, Features, etc.)
            if (action.category.action.name !== lastActivationCategory?.name) {
                lastActivationCategory = action.category.action;
                const activationCategoryName = this.getActivationCategoryNameWithUses(action.category.action, actor);
                // Nested key using a dot (which is the source of the issue)
                const key = `category.${lastDisplayCategory!.name}.${lastActivationCategory.name}`;
                activationCategoryEntries = this.createCollapsibleContainer(activationCategoryName, key, actor, displayCategoryEntries!, 'div', CSS_ACTIVATION_CATEGORY_WRAPPER, CSS_ACTIVATION_CATEGORY_HEADER, CSS_ACTIVATION_CATEGORY_ENTRIES);
            }
            activationCategoryEntries!.appendChild(this.getActionRow(action));
        }
    }
  };

  public showTokenActions = (token?: Token | null) => {
    this.hideTokenActions();
    module.logger.debug('showTokenActions()', token);

    if (!game?.canvas?.hud?.token?.element?.children) {
      module.logger.debug('showTokenActions() -> false, no token HUD on token:', token);
      return false;
    }

    if (!(token?.document?.isOwner && game.user?.hasRole(MinimumRole.get()))) {
      module.logger.debug('showTokenActions() -> false, not owner or insufficient role for token:', token);
      return false;
    }

    const actor = token.actor as dnd5e.documents.Actor5e;
    if (!this.isShownForActorType(actor)) {
      module.logger.debug('showTokenActions() -> false, not shown for actor.type:', actor.type);
      return false;
    }

    const actions = getTokenActions(actor);
    if (!actions || actions.length === 0) {
      module.logger.debug('showTokenActions() -> true... but no actions:', actions);
      const noActions = document.createElement('div');
      noActions.classList.add(CSS_NO_ACTIONS);
      noActions.appendChild(document.createTextNode(module.localize('no-actions')));
      this.actionsContainer.appendChild(noActions);
    }

    module.logger.debug('showTokenActions() -> true:', actions);
    this.buildActionsList(actions, actor);
    this.repositionActionsOuterContainer(token as Token);
    return true;
  };

  private repositionActionsOuterContainer = (token: Token) => {
    // Phase 1: Calculate coordinates that DO NOT depend on the HUD's final position
    const lrOffset = 200;

    // Get world coordinates and dimensions of the token
    const tokenWidth = token.w * (game.canvas.stage?.scale?.x ?? 1);
    const leftOffset = Math.floor(token.worldTransform.tx - lrOffset);
    const rightOffset = Math.ceil(token.worldTransform.tx + tokenWidth + lrOffset);

    // Apply the horizontal positioning immediately
    this.actionsOuterContainer.style.left = `${leftOffset}px`;
    this.actionsOuterContainer.style.right = `calc(100% - ${rightOffset}px)`;
    
    const backgroundOpacity = QuickActionBackgroundOpacity.get();
    this.actionsContainer.style.backgroundColor = `rgba(255, 255, 255, ${backgroundOpacity})`;
    this.actionsContainer.style.borderColor = `rgba(255, 255, 255, ${backgroundOpacity})`;
    this.actionsContainer.style.setProperty('--illandril-qaa-text-opacity', QuickActionTextOpacity.get().toString());

    this.actionsOuterContainer.classList.add(CSS_ACTIVE);

    // Phase 2: Defer vertical positioning until the HUD coordinates are stable
    // Use setTimeout(0) or requestAnimationFrame for stable coordinates
    setTimeout(() => {
        // 1. Calculate the desired default position (above the HUD)
        const hudTop = this.getTokenHUDTop();
        let bottomOffset = hudTop - 6;

        // 2. Apply the default positioning (Above Token HUD)
        this.actionsOuterContainer.style.top = ''; // Clear 'top' style
        this.actionsOuterContainer.style.bottom = `calc(100% - ${bottomOffset}px)`;

        // 3. Check for boundary collision (runs AFTER position is set)
        const rect = this.actionsOuterContainer.getBoundingClientRect();

        // If the box is going off the top of the screen (rect.top <= 0), move it underneath
        if (rect && rect.top <= 0) {
            const hudBottom = this.getTokenHUDBottom();
            const topOffset = hudBottom + 6;
            this.actionsOuterContainer.style.bottom = '';
            this.actionsOuterContainer.style.top = `${topOffset}px`;
        }
    }, 0);
  };

  private getTokenHUDTop() {
    // Why not just get the offset().top of the token HUD element, or the columns?
    // Because the columns flow outside the HUD element, and often have lots of empty space in them
    let bestTop = Number.POSITIVE_INFINITY;
    const collection = game?.canvas?.hud?.token?.element?.children;
    if (collection?.length) {
      Array.from(collection).forEach(element => {
          const rect = element.getBoundingClientRect();
          bestTop = Math.min(bestTop, rect.top ?? bestTop);
      });
    }

    module.logger.debug('getTokenHUDTop() ->', bestTop);
    return bestTop;
  }

  private getTokenHUDBottom() {
    // Why not just get the offset().top + outerHeight() of the token HUD element, or the columns?
    // Because the columns flow outside the HUD element, and often have lots of empty space in them
    let bestBottom = Number.NEGATIVE_INFINITY;
    const collection = game?.canvas?.hud?.token?.element?.children;
    if (collection?.length) {
      Array.from(collection).forEach(element => {
          const rect = element.getBoundingClientRect();
          bestBottom = Math.max(bestBottom, rect.bottom ?? bestBottom);
      });
    }
    module.logger.debug('getTokenHUDBottom() ->', bestBottom);
    return bestBottom;
  }

  private getActionRow(action: Action) {
    const row = document.createElement('div');
    row.classList.add(CSS_ENTRY);
    row.setAttribute('data-testid', 'action');
    row.addEventListener('click', (event) => {
      Hooks.callAll(`${module.id}.ActionClick`, event, action);
      action.roll();
    });
    row.addEventListener('mouseenter', (event) => {
      Hooks.callAll(`${module.id}.ActionHoverOn`, event, action);
    });
    row.addEventListener('mouseleave', (event) => {
      Hooks.callAll(`${module.id}.ActionHoverOff`, event, action);
    });
    row.appendChild(document.createTextNode(action.name));
    return row;
  }

  private static emptyNode(node: Node) {
    while (node.lastChild) {
      node.removeChild(node.lastChild);
    }
  }
}

export default new QuickActionsUI();

declare global {
  interface HookCallbacks {
    'illandril-npc-quick-actions.ActionClick': (event: Event, action: Action) => void;
    'illandril-npc-quick-actions.ActionHoverOn': (event: Event, action: Action) => void;
    'illandril-npc-quick-actions.ActionHoverOff': (event: Event, action: Action) => void;
  }
}