const MODULE_ID = 'neoruegen';
const SOCKET_NAME = `system.${MODULE_ID}`;
export const COMBO_FLAG_KEY = 'combo';
const THREAT_FLAG_KEY = 'threat';

export function getTokenPoolValue(document, key) {
  return Number(document.getFlag(MODULE_ID, key) ?? 0);
}

export async function setTokenPoolValue(document, key, value) {
  const parsed = Math.max(Number.parseInt(value, 10) || 0, 0);

  if (!document.canUserModify(game.user, 'update')) {
    return requestGMTokenPoolChange({
      type: 'set',
      tokenUuid: document.uuid,
      key,
      value: parsed,
    });
  }

  if (parsed > 0) {
    await document.setFlag(MODULE_ID, key, parsed);
  }
  else {
    await document.unsetFlag(MODULE_ID, key);
  }

  return parsed;
}

export async function adjustTokenPoolValue(document, key, delta) {
  const parsedDelta = Number.parseInt(delta, 10) || 0;

  if (parsedDelta === 0) return getTokenPoolValue(document, key);

  if (!document.canUserModify(game.user, 'update')) {
    return requestGMTokenPoolChange({
      type: 'adjust',
      tokenUuid: document.uuid,
      key,
      delta: parsedDelta,
    });
  }

  const next = Math.max(getTokenPoolValue(document, key) + parsedDelta, 0);
  await setTokenPoolValue(document, key, next);
  return next;
}

function getPrimaryGM() {
  return game.users.find((user) => user.active && user.isGM);
}

async function requestGMTokenPoolChange(data) {
  const gm = getPrimaryGM();

  if (!gm) {
    ui.notifications.warn(game.i18n.localize('NEORUEGEN.Token.NoActiveGM'));
    return null;
  }

  if (game.user.isGM) return executeTokenPoolChange(data);

  game.socket.emit(SOCKET_NAME, { ...data, gmId: gm.id });
  return null;
}

async function executeTokenPoolChange(data) {
  const tokenDocument = await fromUuid(data.tokenUuid);

  if (!tokenDocument) throw new Error(game.i18n.localize('NEORUEGEN.Token.TokenNotFound'));

  if (data.type === 'adjust') {
    const next = Math.max(getTokenPoolValue(tokenDocument, data.key) + (Number.parseInt(data.delta, 10) || 0), 0);
    await setTokenPoolValue(tokenDocument, data.key, next);
    return next;
  }

  return setTokenPoolValue(tokenDocument, data.key, data.value);
}

function registerTokenPoolSocket() {
  game.socket.on(SOCKET_NAME, async (data) => {
    if (!game.user.isGM || data.gmId !== game.user.id) return;

    try {
      await executeTokenPoolChange(data);
    }
    catch (error) {
      ui.notifications.error(error.message);
    }
  });
}

function getHudElement(html) {
  return html instanceof HTMLElement ? html : html[0];
}

function buildPoolControl(tokenDocument, key, label) {
  return `
    <div class="neoruegen-token-pool" data-pool="${key}">
      <span>${label}</span>
      <div class="neoruegen-token-pool-stepper">
        <button type="button" data-action="decrease">-</button>
        <input type="number" min="0" step="1" value="${getTokenPoolValue(tokenDocument, key)}">
        <button type="button" data-action="increase">+</button>
      </div>
    </div>
  `;
}

function renderTokenHUD(app, html) {
  const token = app.object;
  const tokenDocument = token?.document;
  const root = getHudElement(html);

  if (!tokenDocument || !root) return;

  const rightColumn = root.querySelector('.col.right') ?? root;
  const control = document.createElement('div');
  control.classList.add('control-icon', 'neoruegen-token-combo-threat');
  control.title = game.i18n.localize('NEORUEGEN.Token.ComboThreat');
  control.innerHTML = `
    ${buildPoolControl(tokenDocument, COMBO_FLAG_KEY, game.i18n.localize('NEORUEGEN.Token.Combo'))}
    ${buildPoolControl(tokenDocument, THREAT_FLAG_KEY, game.i18n.localize('NEORUEGEN.Token.Threat'))}
  `;

  const inputs = control.querySelectorAll('input');
  const buttons = control.querySelectorAll('button');
  for (const input of inputs) {
    input.addEventListener('change', async (event) => {
      const pool = event.currentTarget.closest('.neoruegen-token-pool').dataset.pool;
      await setTokenPoolValue(tokenDocument, pool, event.currentTarget.value);
      drawTokenComboThreat(token);
    });
    input.addEventListener('click', (event) => event.stopPropagation());
    input.addEventListener('pointerdown', (event) => event.stopPropagation());
  }
  for (const button of buttons) {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const poolElement = event.currentTarget.closest('.neoruegen-token-pool');
      const pool = poolElement.dataset.pool;
      const input = poolElement.querySelector('input');
      const current = getTokenPoolValue(tokenDocument, pool);
      const next = event.currentTarget.dataset.action === 'increase'
        ? current + 1
        : Math.max(current - 1, 0);

      await setTokenPoolValue(tokenDocument, pool, next);
      input.value = next;
      drawTokenComboThreat(token);
    });
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
  }

  control.addEventListener('click', (event) => event.stopPropagation());
  control.addEventListener('pointerdown', (event) => event.stopPropagation());

  rightColumn.append(control);
}

function destroyTokenPoolTexts(token) {
  token.neoruegenComboText?.destroy();
  token.neoruegenThreatText?.destroy();
  token.neoruegenComboText = null;
  token.neoruegenThreatText = null;
}

function createTokenPoolText(value, stroke) {
  return new PIXI.Text(String(value), {
    fill: '#ffffff',
    fontFamily: 'Roboto, sans-serif',
    fontSize: 24,
    fontWeight: '700',
    stroke,
    strokeThickness: 5,
  });
}

function drawTokenComboThreat(token) {
  if (!token) return;

  destroyTokenPoolTexts(token);

  const combo = getTokenPoolValue(token.document, COMBO_FLAG_KEY);
  const threat = getTokenPoolValue(token.document, THREAT_FLAG_KEY);

  if (combo > 0) {
    const text = createTokenPoolText(combo, '#1b5cff');
    text.anchor.set(0, 0);
    text.position.set(4, 4);
    text.zIndex = 1000;
    token.addChild(text);
    token.neoruegenComboText = text;
  }

  if (threat > 0) {
    const text = createTokenPoolText(threat, '#7d1717');
    text.anchor.set(1, 0);
    text.position.set(token.w - 4, 4);
    text.zIndex = 1000;
    token.addChild(text);
    token.neoruegenThreatText = text;
  }
}

export function registerTokenComboThreat() {
  Hooks.once('ready', registerTokenPoolSocket);
  Hooks.on('renderTokenHUD', renderTokenHUD);
  Hooks.on('refreshToken', drawTokenComboThreat);
  Hooks.on('drawToken', drawTokenComboThreat);
  Hooks.on('updateToken', (document) => drawTokenComboThreat(document.object));
}
