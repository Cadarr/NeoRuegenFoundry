const MODULE_ID = 'neoruegen';
const FLAG_KEY = 'comboThreat';
const TYPE_FLAG_KEY = 'comboThreatType';
const THREAT_TYPE = 'threat';
const COMBO_TYPE = 'combo';

function getComboThreat(document) {
  return Number(document.getFlag(MODULE_ID, FLAG_KEY) ?? 0);
}

function getComboThreatType(document) {
  return document.getFlag(MODULE_ID, TYPE_FLAG_KEY) === COMBO_TYPE ? COMBO_TYPE : THREAT_TYPE;
}

async function setComboThreat(document, value) {
  const parsed = Math.max(Number.parseInt(value, 10) || 0, 0);

  if (parsed > 0) {
    await document.setFlag(MODULE_ID, FLAG_KEY, parsed);
  }
  else {
    await document.unsetFlag(MODULE_ID, FLAG_KEY);
  }
}

async function setComboThreatType(document, type) {
  await document.setFlag(MODULE_ID, TYPE_FLAG_KEY, type === COMBO_TYPE ? COMBO_TYPE : THREAT_TYPE);
}

function getHudElement(html) {
  return html instanceof HTMLElement ? html : html[0];
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
    <select aria-label="${game.i18n.localize('NEORUEGEN.Token.ComboThreat')}">
      <option value="${THREAT_TYPE}">${game.i18n.localize('NEORUEGEN.Token.Threat')}</option>
      <option value="${COMBO_TYPE}">${game.i18n.localize('NEORUEGEN.Token.Combo')}</option>
    </select>
    <div class="neoruegen-token-combo-threat-stepper">
      <button type="button" data-action="decrease">-</button>
      <input type="number" min="0" step="1" value="${getComboThreat(tokenDocument)}">
      <button type="button" data-action="increase">+</button>
    </div>
  `;

  const input = control.querySelector('input');
  const select = control.querySelector('select');
  const buttons = control.querySelectorAll('button');
  select.value = getComboThreatType(tokenDocument);
  input.addEventListener('change', async (event) => {
    await setComboThreat(tokenDocument, event.currentTarget.value);
    drawTokenComboThreat(token);
  });
  input.addEventListener('click', (event) => event.stopPropagation());
  input.addEventListener('pointerdown', (event) => event.stopPropagation());
  select.addEventListener('change', async (event) => {
    await setComboThreatType(tokenDocument, event.currentTarget.value);
    drawTokenComboThreat(token);
  });
  select.addEventListener('click', (event) => event.stopPropagation());
  select.addEventListener('pointerdown', (event) => event.stopPropagation());
  for (const button of buttons) {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const current = getComboThreat(tokenDocument);
      const next = event.currentTarget.dataset.action === 'increase'
        ? current + 1
        : Math.max(current - 1, 0);

      await setComboThreat(tokenDocument, next);
      input.value = next;
      drawTokenComboThreat(token);
    });
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
  }

  rightColumn.append(control);
}

function drawTokenComboThreat(token) {
  if (!token) return;

  token.neoruegenComboThreatText?.destroy();
  token.neoruegenComboThreatText = null;

  const value = getComboThreat(token.document);
  if (value <= 0) return;

  const type = getComboThreatType(token.document);
  const stroke = type === COMBO_TYPE ? '#1b5cff' : '#7d1717';
  const text = new PIXI.Text(String(value), {
    fill: '#ffffff',
    fontFamily: 'Roboto, sans-serif',
    fontSize: 24,
    fontWeight: '700',
    stroke,
    strokeThickness: 5,
  });

  text.anchor.set(1, 0);
  text.position.set(token.w - 4, 4);
  text.zIndex = 1000;

  token.addChild(text);
  token.neoruegenComboThreatText = text;
}

export function registerTokenComboThreat() {
  Hooks.on('renderTokenHUD', renderTokenHUD);
  Hooks.on('refreshToken', drawTokenComboThreat);
  Hooks.on('drawToken', drawTokenComboThreat);
  Hooks.on('updateToken', (document) => drawTokenComboThreat(document.object));
}
