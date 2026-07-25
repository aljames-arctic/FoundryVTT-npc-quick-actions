import './styles.scss';
import module from './module';
import { ShowDeprecationWarning } from './settings';
import ui from './ui';

let shownToken: Token | null = null;

Hooks.on('init', () => {
  const originalClose = foundry.applications.hud.TokenHUD.prototype.close;
  foundry.applications.hud.TokenHUD.prototype.close = function () {
    originalClose.call(this);
    shownToken = null;
    ui.hideTokenActions();
  };
});

Hooks.on('ready', () => {
  if (!ShowDeprecationWarning.get()) return;

  const DialogV2 = (foundry.applications as any)?.api?.DialogV2;
  if (!DialogV2) return;

  new DialogV2({
    window: {
      title: module.localize('deprecation.title'),
    },
    position: {
      width: 400,
    },
    content: `<p>${module.localize('deprecation.body')}</p>`,
    buttons: [
      {
        action: 'acknowledge',
        label: module.localize('deprecation.acknowledge'),
        default: true,
      },
    ],
    modal: true,
  }).render(true);
});

Hooks.on('updateToken', (token) => {
  if (shownToken && shownToken.document.id === token.id) {
    setTimeout(() => {
      ui.showTokenActions(shownToken);
    }, 1);
  }
});

Hooks.on('updateItem', (item) => {
  if (shownToken && shownToken.actor === item.parent) {
    setTimeout(() => {
      ui.showTokenActions(shownToken);
    }, 1);
  }
});

Hooks.on('updateActor', (actor) => {
  if (shownToken && shownToken.actor === actor) {
    setTimeout(() => {
      ui.showTokenActions(shownToken);
    }, 1);
  }
});

Hooks.on('renderTokenHUD', (tokenHUD) => {
  const token = tokenHUD.object;
  if (ui.showTokenActions(token)) {
    shownToken = token ?? null;
  }
});
