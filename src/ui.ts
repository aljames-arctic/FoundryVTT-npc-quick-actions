// ui.ts
import { QuickActionsUI } from './class/quick-action-ui';
import { type Action } from './quick-actions';

export default new QuickActionsUI();

declare global {
  interface HookCallbacks {
    'illandril-npc-quick-actions.ActionClick': (event: Event, action: Action) => void;
    'illandril-npc-quick-actions.ActionHoverOn': (event: Event, action: Action) => void;
    'illandril-npc-quick-actions.ActionHoverOff': (event: Event, action: Action) => void;
  }
}