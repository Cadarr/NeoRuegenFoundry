import { NeoruegenActorSheet } from './sheets/actor-sheet.mjs';

const CONTROL_NAME = 'neoruegen';
const REQUEST_CHECK_TOOL = 'requestCheck';

function getHtmlElement(html) {
  return html instanceof HTMLElement ? html : html[0];
}

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

async function postRequestedCheck(skillKey, difficultyKey) {
  const skill = CONFIG.NEORUEGEN.skills[skillKey];
  const difficulty = CONFIG.NEORUEGEN.difficulties[difficultyKey];

  if (!skill || !difficulty) return;

  const skillLabel = game.i18n.localize(skill.label);
  const difficultyLabel = game.i18n.localize(difficulty.label);
  const target = game.user.targets.first();
  const targetUuid = target?.document.uuid ?? '';
  const targetLine = target
    ? `<p>${game.i18n.localize('NEORUEGEN.GMMenu.Target')}: ${target.document.name}</p>`
    : '';
  const content = `
    <div class="neoruegen-requested-check">
      <p><strong>${difficultyLabel} ${game.i18n.localize('NEORUEGEN.Action.Check')} auf ${skillLabel}</strong></p>
      ${targetLine}
      ${targetUuid ? `
      <button type="button" data-action="neoruegen-set-request-target" data-target-uuid="${targetUuid}">
        ${game.i18n.localize('NEORUEGEN.GMMenu.SetTarget')}
      </button>` : ''}
      <button type="button" data-action="neoruegen-roll-request" data-skill="${skillKey}" data-difficulty="${difficultyKey}">
        ${game.i18n.localize('NEORUEGEN.GMMenu.RollRequestedCheck')}
      </button>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content,
  });
}

function getRequestedCheckActor() {
  const token = canvas.tokens.controlled[0];
  const actor = token?.actor ?? (!game.user.isGM ? game.user.character : null);

  if (!actor) {
    ui.notifications.warn(game.i18n.localize('NEORUEGEN.GMMenu.NoActorForRequestedCheck'));
    return null;
  }

  if (!actor.testUserPermission(game.user, 'OWNER')) {
    ui.notifications.warn(game.i18n.localize('NEORUEGEN.GMMenu.NoActorPermission'));
    return null;
  }

  return actor;
}

async function setRequestedTarget(targetUuid) {
  if (!targetUuid) return null;

  const tokenDocument = await fromUuid(targetUuid);
  const token = tokenDocument?.object ?? canvas.tokens.get(tokenDocument?.id);

  if (!token) {
    ui.notifications.warn(game.i18n.localize('NEORUEGEN.GMMenu.TargetNotFound'));
    return false;
  }

  token.setTarget(true, { user: game.user, releaseOthers: true, groupSelection: true });
  game.user.updateTokenTargets([token.id]);
  return token;
}

async function waitForRequestedTarget(token) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (game.user.targets.has(token)) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return game.user.targets.has(token);
}

async function onRequestedCheckButton(event) {
  event.preventDefault();

  const button = event.currentTarget;
  const actor = getRequestedCheckActor();

  if (!actor) return;

  const sheet = actor.sheet instanceof NeoruegenActorSheet
    ? actor.sheet
    : new NeoruegenActorSheet(actor);

  try {
    await sheet.rollSkill(button.dataset.skill, {
      difficultyKey: button.dataset.difficulty,
    });
  }
  catch (error) {
    console.error(error);
    ui.notifications.error(game.i18n.localize('NEORUEGEN.GMMenu.RequestedCheckFailed'));
  }
}

async function onSetRequestTargetButton(event) {
  event.preventDefault();

  const target = await setRequestedTarget(event.currentTarget.dataset.targetUuid);

  if (!target) return;
  if (!await waitForRequestedTarget(target)) {
    ui.notifications.warn(game.i18n.localize('NEORUEGEN.GMMenu.TargetNotFound'));
  }
}

function activateRequestedCheckMessage(_message, html) {
  const element = getHtmlElement(html);
  const rollButtons = element.querySelectorAll('[data-action="neoruegen-roll-request"]');
  const targetButtons = element.querySelectorAll('[data-action="neoruegen-set-request-target"]');

  for (const button of rollButtons) {
    button.addEventListener('click', onRequestedCheckButton);
  }
  for (const button of targetButtons) {
    button.addEventListener('click', onSetRequestTargetButton);
  }
}

function activateRequestCheckDialog(html) {
  const element = getHtmlElement(html);
  const form = element.querySelector('.neoruegen-request-check-dialog');
  const skillButtons = form.querySelectorAll('.skill-request-buttons button');

  for (const button of skillButtons) {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const difficultyKey = form.querySelector('[name="difficulty"]').value;
      await postRequestedCheck(event.currentTarget.dataset.skill, difficultyKey);
    });
  }
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
  Hooks.on('renderChatMessage', activateRequestedCheckMessage);
}
