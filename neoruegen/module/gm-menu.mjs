const CONTROL_NAME = 'neoruegen';
const REQUEST_CHECK_TOOL = 'requestCheck';
const MAX_REQUEST_COMBO = 9;

function buildDifficultyOptions() {
  return Object.entries(CONFIG.NEORUEGEN.difficulties).map(([key, difficulty]) => {
    const selected = key === 'normal' ? ' selected' : '';
    const modifier = difficulty.modifier >= 0 ? `+${difficulty.modifier}` : String(difficulty.modifier);
    return `<option value="${key}"${selected}>${game.i18n.localize(difficulty.label)} (${modifier})</option>`;
  }).join('');
}

function buildSkillButtons() {
  return [
    ...CONFIG.NEORUEGEN.skillGroups.core,
    ...CONFIG.NEORUEGEN.skillGroups.advanced,
  ].map((skillKey) => {
    const label = game.i18n.localize(CONFIG.NEORUEGEN.skills[skillKey].label);
    return `<button type="button" data-skill="${skillKey}">${label}</button>`;
  }).join('');
}

async function postRequestedCheck(skillKey, difficultyKey, combo) {
  const skill = CONFIG.NEORUEGEN.skills[skillKey];
  const difficulty = CONFIG.NEORUEGEN.difficulties[difficultyKey];

  if (!skill || !difficulty) return;

  const skillLabel = game.i18n.localize(skill.label);
  const difficultyLabel = game.i18n.localize(difficulty.label);
  const comboLine = combo > 0
    ? `<p>${combo} ${game.i18n.localize('NEORUEGEN.GMMenu.ComboAvailable')}</p>`
    : '';
  const content = `
    <div class="neoruegen-requested-check">
      <p><strong>${difficultyLabel} ${game.i18n.localize('NEORUEGEN.Action.Check')} auf ${skillLabel}</strong></p>
      ${comboLine}
      <button type="button" data-action="neoruegen-roll-request" data-skill="${skillKey}" data-difficulty="${difficultyKey}" data-combo="${combo}">
        ${game.i18n.localize('NEORUEGEN.GMMenu.RollRequestedCheck')}
      </button>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content,
  });
}

function activateRequestCheckDialog(html) {
  const element = html instanceof HTMLElement ? html : html[0];
  const form = element.querySelector('.neoruegen-request-check-dialog');
  const comboInput = form.querySelector('[name="combo"]');
  const comboValue = form.querySelector('.combo-stepper-value');
  const comboButtons = form.querySelectorAll('.combo-stepper button');
  const skillButtons = form.querySelectorAll('.skill-request-buttons button');

  const updateCombo = () => {
    const combo = Math.clamp(Number(comboInput.value) || 0, 0, MAX_REQUEST_COMBO);
    comboInput.value = combo;
    comboValue.textContent = String(combo);
  };

  for (const button of comboButtons) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const current = Number(comboInput.value) || 0;
      comboInput.value = event.currentTarget.dataset.action === 'increase'
        ? Math.min(current + 1, MAX_REQUEST_COMBO)
        : Math.max(current - 1, 0);
      updateCombo();
    });
  }

  for (const button of skillButtons) {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const difficultyKey = form.querySelector('[name="difficulty"]').value;
      const combo = Math.clamp(Number(comboInput.value) || 0, 0, MAX_REQUEST_COMBO);
      await postRequestedCheck(event.currentTarget.dataset.skill, difficultyKey, combo);
    });
  }

  updateCombo();
}

function openRequestCheckDialog(_event, active) {
  if (active === false) return;

  const content = `
    <form class="neoruegen-request-check-dialog">
      <div class="request-check-options">
        <div class="form-group">
          <label>${game.i18n.localize('NEORUEGEN.Dialog.Difficulty')}</label>
          <select name="difficulty">${buildDifficultyOptions()}</select>
        </div>
        <div class="combo-spend-control">
          <label>${game.i18n.localize('NEORUEGEN.Token.Combo')}</label>
          <div class="combo-stepper">
            <button type="button" data-action="decrease">-</button>
            <span class="combo-stepper-value">0</span>
            <input type="hidden" name="combo" value="0">
            <button type="button" data-action="increase">+</button>
          </div>
        </div>
      </div>
      <div class="skill-request-buttons">
        ${buildSkillButtons()}
      </div>
    </form>
  `;

  new Dialog({
    title: game.i18n.localize('NEORUEGEN.GMMenu.RequestCheck'),
    content,
    buttons: {
      close: {
        label: game.i18n.localize('Close'),
      },
    },
    default: 'close',
    render: activateRequestCheckDialog,
  }, {
    classes: ['neoruegen', 'dialog'],
  }).render(true);
}

function buildNeoRuegenControl() {
  return {
    name: CONTROL_NAME,
    title: game.i18n.localize('NEORUEGEN.GMMenu.Title'),
    icon: 'fa-solid fa-dice-d20',
    order: 0,
    visible: game.user?.isGM,
    tools: {
      [REQUEST_CHECK_TOOL]: {
        name: REQUEST_CHECK_TOOL,
        title: game.i18n.localize('NEORUEGEN.GMMenu.RequestCheck'),
        icon: 'fa-solid fa-circle-question',
        order: 0,
        button: true,
        visible: game.user?.isGM,
        onChange: openRequestCheckDialog,
      },
    },
  };
}

function addNeoRuegenControl(controls) {
  if (!game.user?.isGM) return;

  const control = buildNeoRuegenControl();

  if (Array.isArray(controls)) {
    if (controls.some((entry) => entry.name === CONTROL_NAME)) return;

    const notesIndex = controls.findIndex((entry) => ['notes', 'journal'].includes(entry.name));
    control.order = notesIndex >= 0 ? (controls[notesIndex].order ?? notesIndex) + 1 : controls.length;
    if (notesIndex >= 0) {
      controls.splice(notesIndex + 1, 0, control);
    }
    else {
      controls.push(control);
    }
    return;
  }

  if (controls[CONTROL_NAME]) return;

  const entries = Object.entries(controls);
  const notesIndex = entries.findIndex(([key, entry]) => ['notes', 'journal'].includes(key) || ['notes', 'journal'].includes(entry.name));

  if (notesIndex < 0) {
    control.order = entries.length;
    controls[CONTROL_NAME] = control;
    return;
  }

  control.order = (entries[notesIndex][1].order ?? notesIndex) + 1;
  const reordered = {};
  for (const [index, [key, value]] of entries.entries()) {
    reordered[key] = value;
    if (index === notesIndex) reordered[CONTROL_NAME] = control;
  }

  for (const key of Object.keys(controls)) delete controls[key];
  Object.assign(controls, reordered);
}

export function registerGMMenu() {
  Hooks.on('getSceneControlButtons', addNeoRuegenControl);
}
