// ui.ts
import module from './module';
import { type Action, type ActivationCategory, getTokenActions, type SpellSubcategory, type DisplayCategory, DISPLAY_CATEGORY, type Category } from './quick-actions';
import { MinimumRole, ShowForNPCActors, ShowForPCActors, ShowForVehicleActors, ShowZeroUsesRemainActions } from './settings';

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

const actionsOuterContainer = document.createElement('div');
actionsOuterContainer.classList.add(CSS_OUTER_CONTAINER);

const actionsContainer = document.createElement('div');
actionsContainer.classList.add(CSS_CONTAINER);
actionsOuterContainer.appendChild(actionsContainer);

Hooks.once('ready', () => {
  document.body.appendChild(actionsOuterContainer);
});

export const hideTokenActions = () => {
  module.logger.debug('hide');
  actionsOuterContainer.classList.remove(CSS_ACTIVE);
  emptyNode(actionsContainer);
};

const COLLAPSED_FLAG = 'collapsed';

function createCollapsibleContainer(
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

    const collapsedData = (actor.getFlag(module.id, COLLAPSED_FLAG) || {}) as Record<string, {isCollapsed: boolean}>;
    
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
        let collapsedData = (actor.getFlag(module.id, COLLAPSED_FLAG) || {}) as Record<string, {isCollapsed: boolean}>;
        foundry.utils.mergeObject(collapsedData, {[`${key}.isCollapsed`]: isCollapsed});
        await actor.setFlag(module.id, COLLAPSED_FLAG, collapsedData);
    });

    const entriesContainer = document.createElement('div');
    entriesContainer.classList.add(entriesClass);
    wrapper.appendChild(entriesContainer);

    return entriesContainer;
}

const getDisplayCategoryName = (displayCategory: DisplayCategory) => {
  return module.localize(displayCategory.name);
};

const getActivationCategoryName = (activationCategory: ActivationCategory) => {
  return module.localize(activationCategory.name);
};

const getSpellSubcategoryName = (spellSubcategory: SpellSubcategory) => {
    let displayName = spellSubcategory.displayName;
    if (spellSubcategory.slots) {
        displayName = `${displayName} (${spellSubcategory.slots.available} / ${spellSubcategory.slots.maximum})`;
    }
    return displayName;
};

const isShownForActorType = (actor: dnd5e.documents.Actor5e) => {
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

export const showTokenActions = (token?: Token | null) => {
  hideTokenActions();
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
  if (!isShownForActorType(actor)) {
    module.logger.debug('showTokenActions() -> false, not shown for actor.type:', actor.type);
    return false;
  }

  const actions = getTokenActions(actor);
  if (!actions || actions.length === 0) {
    module.logger.debug('showTokenActions() -> true... but no actions:', actions);
    const noActions = document.createElement('div');
    noActions.classList.add(CSS_NO_ACTIONS);
    noActions.appendChild(document.createTextNode(module.localize('no-actions')));
    actionsContainer.appendChild(noActions);
  } else {
    const zeroSlotSpellSubcategories = new Set<string>();
    if (!ShowZeroUsesRemainActions.get()) {
        for (const action of actions) {
            if (action.category.spell?.slots?.available === 0) {
                zeroSlotSpellSubcategories.add(action.category.spell.name);
            }
        }
    }

    const filteredActions = actions.filter(action => 
        !action.category.spell || !zeroSlotSpellSubcategories.has(action.category.spell.name)
    );

    if (filteredActions.length === 0) {
        const noActions = document.createElement('div');
        noActions.classList.add(CSS_NO_ACTIONS);
        noActions.appendChild(document.createTextNode(module.localize('no-actions')));
        actionsContainer.appendChild(noActions);
        return true;
    }

    module.logger.debug('showTokenActions() -> true:', filteredActions);
    let lastDisplayCategory: DisplayCategory | null = null;
    let displayCategoryEntries: HTMLElement | null = null;

    let lastActivationCategory: ActivationCategory | null = null;
    let activationCategoryEntries: HTMLElement | null = null;

    let lastSpellSubcategory: SpellSubcategory | null = null;
    let spellSubcategoryEntries: HTMLElement | null = null;

    for (const action of filteredActions) {
        if (action.category.display.name !== lastDisplayCategory?.name) {
            lastDisplayCategory = action.category.display;
            const displayCategoryName = getDisplayCategoryName(action.category.display);
            
            // Display Category is the outermost level
            const key = action.category.display.name; 
            displayCategoryEntries = createCollapsibleContainer(displayCategoryName, key, actor, actionsContainer, 'div', CSS_DISPLAY_CATEGORY_WRAPPER, CSS_DISPLAY_CATEGORY_HEADER, CSS_DISPLAY_CATEGORY_ENTRIES);
            
            lastActivationCategory = null;
            lastSpellSubcategory = null;
        }

        if (action.category.display.name === DISPLAY_CATEGORY.spell.name && action.category.spell) {
            // Spell Subcategory (e.g., Cantrips, 1st Level, Innate)
            if (action.category.spell.name !== lastSpellSubcategory?.name) {
                lastSpellSubcategory = action.category.spell;
                const spellSubcategoryName = getSpellSubcategoryName(action.category.spell);
                // Nested key using a dot (which is the source of the issue)
                const key = `${lastDisplayCategory!.name}.${lastSpellSubcategory.name}`; 
                spellSubcategoryEntries = createCollapsibleContainer(spellSubcategoryName, key, actor, displayCategoryEntries!, 'div', CSS_SPELL_SUB_CATEGORY_WRAPPER, CSS_SPELL_SUB_CATEGORY_HEADER, CSS_SPELL_SUB_CATEGORY_ENTRIES);
                lastActivationCategory = null;
            }

            // Activation Category (e.g., Action, Bonus Action) inside a Spell Subcategory
            if (action.category.action.name !== lastActivationCategory?.name) {
                lastActivationCategory = action.category.action;
                const activationCategoryName = getActivationCategoryName(action.category.action);
                // Deeply nested key using dots (which is the source of the issue)
                const key = `${lastDisplayCategory!.name}.${lastSpellSubcategory!.name}.${lastActivationCategory.name}`;
                activationCategoryEntries = createCollapsibleContainer(activationCategoryName, key, actor, spellSubcategoryEntries!, 'div', CSS_ACTIVATION_CATEGORY_WRAPPER, CSS_ACTIVATION_CATEGORY_HEADER, CSS_ACTIVATION_CATEGORY_ENTRIES);
            }
            activationCategoryEntries!.appendChild(getActionRow(action));
        } else {
            // Activation Category (e.g., Action, Bonus Action) for non-spells (Items, Features, etc.)
            if (action.category.action.name !== lastActivationCategory?.name) {
                lastActivationCategory = action.category.action;
                const activationCategoryName = getActivationCategoryName(action.category.action);
                // Nested key using a dot (which is the source of the issue)
                const key = `${lastDisplayCategory!.name}.${lastActivationCategory.name}`;
                activationCategoryEntries = createCollapsibleContainer(activationCategoryName, key, actor, displayCategoryEntries!, 'div', CSS_ACTIVATION_CATEGORY_WRAPPER, CSS_ACTIVATION_CATEGORY_HEADER, CSS_ACTIVATION_CATEGORY_ENTRIES);
            }
            activationCategoryEntries!.appendChild(getActionRow(action));
        }
    }
  }
  repositionActionsOuterContainer(token as Token);

  return true;
};

const repositionActionsOuterContainer = (token: Token) => {
    // Phase 1: Calculate coordinates that DO NOT depend on the HUD's final position
    const lrOffset = 200;

    // Get world coordinates and dimensions of the token
    const tokenWidth = token.w * (game.canvas.stage?.scale?.x ?? 1);
    const leftOffset = Math.floor(token.worldTransform.tx - lrOffset);
    const rightOffset = Math.ceil(token.worldTransform.tx + tokenWidth + lrOffset);

    // Apply the horizontal positioning immediately
    actionsOuterContainer.style.left = `${leftOffset}px`;
    actionsOuterContainer.style.right = `calc(100% - ${rightOffset}px)`;
    actionsOuterContainer.classList.add(CSS_ACTIVE);

    // Phase 2: Defer vertical positioning until the HUD coordinates are stable
    // Use setTimeout(0) or requestAnimationFrame for stable coordinates
    setTimeout(() => {
        // 1. Calculate the desired default position (above the HUD)
        const hudTop = getTokenHUDTop();
        let bottomOffset = hudTop - 6;

        // 2. Apply the default positioning (Above Token HUD)
        actionsOuterContainer.style.top = ''; // Clear 'top' style
        actionsOuterContainer.style.bottom = `calc(100% - ${bottomOffset}px)`;

        // 3. Check for boundary collision (runs AFTER position is set)
        const rect = actionsOuterContainer.getBoundingClientRect();

        // If the box is going off the top of the screen (rect.top <= 0), move it underneath
        if (rect && rect.top <= 0) {
            const hudBottom = getTokenHUDBottom();
            const topOffset = hudBottom + 6;
            actionsOuterContainer.style.bottom = '';
            actionsOuterContainer.style.top = `${topOffset}px`;
        }
    }, 0);
};

function getTokenHUDTop() {
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

function getTokenHUDBottom() {
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

declare global {
  interface HookCallbacks {
    'illandril-npc-quick-actions.ActionClick': (event: Event, action: Action) => void;
    'illandril-npc-quick-actions.ActionHoverOn': (event: Event, action: Action) => void;
    'illandril-npc-quick-actions.ActionHoverOff': (event: Event, action: Action) => void;
  }
}

function getActionRow(action: Action) {
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

function emptyNode(node: Node) {
  while (node.lastChild) {
    node.removeChild(node.lastChild);
  }
}
