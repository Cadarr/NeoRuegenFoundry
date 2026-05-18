const CONTROL_NAME = 'neoruegen';
const REQUEST_CHECK_TOOL = 'requestCheck';

function openRequestCheckDialog(_event, active) {
  if (active === false) return;

  new Dialog({
    title: game.i18n.localize('NEORUEGEN.GMMenu.RequestCheck'),
    content: `<p>${game.i18n.localize('NEORUEGEN.GMMenu.RequestCheckPlaceholder')}</p>`,
    buttons: {
      close: {
        label: game.i18n.localize('Close'),
      },
    },
    default: 'close',
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
    onToolChange: (_event, tool, active) => {
      if (tool?.name === REQUEST_CHECK_TOOL && active !== false) openRequestCheckDialog();
    },
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
