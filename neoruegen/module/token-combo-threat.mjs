const MODULE_ID = 'neoruegen';
const COMBO_FLAG_KEY = 'combo';
const THREAT_FLAG_KEY = 'threat';

function getPoolValue(document, key) {
  return Number(document.getFlag(MODULE_ID, key) ?? 0);
}

async function setPoolValue(document, key, value) {
  const parsed = Math.max(Number.parseInt(value, 10) || 0, 0);

  if (parsed > 0) {
    await document.setFlag(MODULE_ID, key, parsed);
  }
  else {
    await document.unsetFlag(MODULE_ID, key);
  }
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
        <input type="number" min="0" step="1" value="${getPoolValue(tokenDocument, key)}">
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
      await setPoolValue(tokenDocument, pool, event.currentTarget.value);
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
      const current = getPoolValue(tokenDocument, pool);
      const next = event.currentTarget.dataset.action === 'increase'
        ? current + 1
        : Math.max(current - 1, 0);

      await setPoolValue(tokenDocument, pool, next);
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

  const combo = getPoolValue(token.document, COMBO_FLAG_KEY);
  const threat = getPoolValue(token.document, THREAT_FLAG_KEY);

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
  Hooks.on('renderTokenHUD', renderTokenHUD);
  Hooks.on('refreshToken', drawTokenComboThreat);
  Hooks.on('drawToken', drawTokenComboThreat);
  Hooks.on('updateToken', (document) => drawTokenComboThreat(document.object));
}
