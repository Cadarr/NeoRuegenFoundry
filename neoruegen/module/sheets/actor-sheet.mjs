import { COMBO_FLAG_KEY, adjustTokenPoolValue, getTokenPoolValue } from '../token-combo-threat.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class NeoruegenActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['neoruegen', 'sheet', 'actor'],
      width: 600,
      height: 600,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'character',
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/neoruegen/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.document.toPlainObject();

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Adding a pointer to CONFIG.NEORUEGEN
    context.config = CONFIG.NEORUEGEN;
    context.skillGroups = this._prepareSkillGroups(context.system.skills);
    context.maneuvers = this._prepareManeuvers(context.system.maneuvers);

    // Enrich biography info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedBiography = await TextEditor.enrichHTML(
      this.actor.system.biography,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Data to fill in for inline rolls
        rollData: this.actor.getRollData(),
        // Relative UUID resolution
        relativeTo: this.actor,
      }
    );

    return context;
  }

  _prepareManeuvers(maneuvers) {
    return Object.entries(CONFIG.NEORUEGEN.maneuvers).map(([key, maneuver]) => {
      const skillConfig = CONFIG.NEORUEGEN.skills[maneuver.skill];
      const attributeKey = skillConfig.attribute;
      const learned = Boolean(maneuvers[key]?.learned);
      const currentSkillValue = Number(this.actor.system.skills[maneuver.skill]?.value ?? 0);
      const skillTooLow = currentSkillValue < maneuver.skillValue;

      return {
        key,
        learned,
        canLearn: learned || !skillTooLow,
        skillTooLow,
        label: game.i18n.localize(maneuver.label),
        skill: game.i18n.localize(skillConfig.label),
        skillValue: maneuver.skillValue,
        currentSkillValue,
        attribute: game.i18n.localize(CONFIG.NEORUEGEN.attributes[attributeKey]),
        complexity: maneuver.complexity,
        complexityLabel: this._getComplexityLabel(maneuver.complexity),
        combo: maneuver.combo,
        description: game.i18n.localize(maneuver.description),
      };
    });
  }

  _prepareSkillGroups(skills) {
    const buildSkillContext = (key) => {
      const skill = skills[key];
      const config = CONFIG.NEORUEGEN.skills[key];

      return {
        key,
        value: skill.value,
        label: game.i18n.localize(config.label),
        attributeKey: config.attribute,
        attribute: game.i18n.localize(CONFIG.NEORUEGEN.attributes[config.attribute]),
      };
    };

    return {
      core: CONFIG.NEORUEGEN.skillGroups.core.map(buildSkillContext),
      advanced: CONFIG.NEORUEGEN.skillGroups.advanced.map(buildSkillContext),
    };
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    html.on('click', '.skill-roll', this._onSkillRoll.bind(this));
  }

  /**
   * Handle skill checks.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onSkillRoll(event) {
    event.preventDefault();
    const skillKey = event.currentTarget.dataset.skill;
    const skillConfig = CONFIG.NEORUEGEN.skills[skillKey];

    if (!skillConfig) return;

    const skillValue = Number(this.actor.system.skills[skillKey]?.value ?? 0);
    const attributeKey = skillConfig.attribute;
    const attributeValue = Number(this.actor.system.attributes[attributeKey]?.value ?? 0);
    const skillLabel = game.i18n.localize(skillConfig.label);
    const attributeLabel = game.i18n.localize(CONFIG.NEORUEGEN.attributes[attributeKey]);
    const target = game.user.targets.first();
    const targetDocument = target?.document;
    const rollOptions = await this._promptSkillRollOptions(skillKey, skillValue, targetDocument);

    if (!rollOptions) return null;

    const difficultyModifier = rollOptions.difficulty?.modifier ?? 0;
    const complexity = rollOptions.maneuver?.complexity ?? 0;
    const comboSpend = rollOptions.comboSpend ?? 0;
    const comboDice = comboSpend * 2;
    const diceCount = Math.max(skillValue + attributeValue + difficultyModifier - complexity + comboDice, 0);
    const formula = diceCount > 0 ? `${diceCount}d12` : '0';
    const roll = await new Roll(formula).evaluate();
    const dice = roll.dice.flatMap((die) => die.results.map((result) => result.result));
    const successes = dice.filter((result) => result >= 10).length;
    const isSuccess = successes > 0;
    const comboPoints = Math.max(successes - 1, 0);
    const formattedDice = dice.map((result) => {
      if (result < 10) return String(result);
      return `<strong style="color: green;">${result}</strong>`;
    });
    const resultLine = isSuccess
      ? '<strong style="color: green;">Erfolg!</strong>'
      : '<strong style="color: red;">Misserfolg!</strong>';
    const comboLine = comboPoints > 0
      ? `${comboPoints} Combo-Punkte generiert`
      : 'Keine Combo-Punkte generiert';
    const maneuverComboCost = rollOptions.maneuver?.combo ?? 0;
    const totalComboCost = comboSpend + maneuverComboCost;
    let spentCombo = 0;
    if (targetDocument && totalComboCost > 0) {
      const currentCombo = getTokenPoolValue(targetDocument, COMBO_FLAG_KEY);
      spentCombo = Math.min(currentCombo, totalComboCost);
    }
    if (targetDocument && (spentCombo > 0 || comboPoints > 0)) {
      await adjustTokenPoolValue(targetDocument, COMBO_FLAG_KEY, comboPoints - spentCombo);
    }
    const spentComboLine = targetDocument && spentCombo > 0
      ? `<p>${spentCombo} Combo-Punkte von ${targetDocument.name} verbraucht</p>`
      : '';
    const targetLine = targetDocument && comboPoints > 0
      ? `<p>${comboPoints} Combo-Punkte auf ${targetDocument.name} hinzugefügt</p>`
      : '';
    const difficultyLine = `${game.i18n.localize(rollOptions.difficulty.label)} (${difficultyModifier >= 0 ? '+' : ''}${difficultyModifier})`;
    const complexityLine = complexity > 0
      ? `<div><dt>${game.i18n.localize('NEORUEGEN.Dialog.Complexity')}</dt><dd>${this._getComplexityLabel(complexity)} (-${complexity})</dd></div>`
      : '';
    const comboSpendLine = comboSpend > 0
      ? `<div><dt>${game.i18n.localize('NEORUEGEN.Token.Combo')}</dt><dd>${comboSpend} eingesetzt (+${comboDice}W12)</dd></div>`
      : '';
    const diceLine = `${diceCount}W12 -> ${formattedDice.length ? formattedDice.join(', ') : '-'}`;
    const maneuverLine = rollOptions.maneuver
      ? `<p><strong>${game.i18n.localize(rollOptions.maneuver.label)}</strong>: ${game.i18n.localize(rollOptions.maneuver.description)}</p>`
      : '';
    const content = `
      <p><strong>${skillLabel}</strong> <span>(${attributeLabel})</span></p>
      <dl class="neoruegen-roll-breakdown">
        <div><dt>${game.i18n.localize('NEORUEGEN.Dialog.Skill')}</dt><dd>${skillLabel} (${skillValue})</dd></div>
        <div><dt>${game.i18n.localize('NEORUEGEN.Dialog.Attribute')}</dt><dd>${attributeLabel} (${attributeValue})</dd></div>
        <div><dt>${game.i18n.localize('NEORUEGEN.Dialog.Difficulty')}</dt><dd>${difficultyLine}</dd></div>
        ${complexityLine}
        ${comboSpendLine}
      </dl>
      <p>${diceLine}</p>
      <p>${resultLine}</p>
      ${isSuccess ? `<p>${comboLine}</p>` : ''}
      ${maneuverLine}
      ${spentComboLine}
      ${targetLine}
    `;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${skillLabel} Probe`,
      content,
      rollMode: game.settings.get('core', 'rollMode'),
    });

    return roll;
  }

  _getComplexityLabel(complexity) {
    const labels = [
      'NEORUEGEN.Complexity.Simple',
      'NEORUEGEN.Complexity.Low',
      'NEORUEGEN.Complexity.Medium',
      'NEORUEGEN.Complexity.High',
      'NEORUEGEN.Complexity.Extreme',
    ];
    const index = Math.clamp(Number(complexity) || 0, 0, labels.length - 1);
    return game.i18n.localize(labels[index]);
  }

  async _promptSkillRollOptions(skillKey, skillValue, targetDocument) {
    const maneuvers = Object.entries(CONFIG.NEORUEGEN.maneuvers)
      .filter(([key, maneuver]) => maneuver.skill === skillKey && this.actor.system.maneuvers[key]?.learned)
      .map(([key, maneuver]) => ({ key, ...maneuver }));
    const targetCombo = targetDocument ? getTokenPoolValue(targetDocument, COMBO_FLAG_KEY) : 0;
    const comboSpendMax = targetDocument ? targetCombo : 5;
    const difficultyOptions = Object.entries(CONFIG.NEORUEGEN.difficulties).map(([key, difficulty]) => {
      const selected = key === 'normal' ? ' selected' : '';
      const modifier = difficulty.modifier >= 0 ? `+${difficulty.modifier}` : String(difficulty.modifier);
      return `<option value="${key}"${selected}>${game.i18n.localize(difficulty.label)} (${modifier})</option>`;
    }).join('');
    const maneuverRows = maneuvers.length
      ? maneuvers.map((maneuver) => {
        const lacksSkill = skillValue < maneuver.skillValue;
        const lacksCombo = targetDocument && targetCombo < maneuver.combo;
        const disabled = lacksSkill || lacksCombo ? ' disabled' : '';
        const classes = disabled ? ' class="maneuver-option disabled"' : ' class="maneuver-option"';
        const requirements = [
          `${game.i18n.localize('NEORUEGEN.Dialog.SkillValue')} ${maneuver.skillValue}`,
          `${game.i18n.localize('NEORUEGEN.Token.Combo')} ${maneuver.combo}`,
          `${game.i18n.localize('NEORUEGEN.Dialog.Complexity')} ${maneuver.complexity}`,
        ].join(' | ');
        const reason = lacksSkill
          ? `<em>${game.i18n.localize('NEORUEGEN.Dialog.SkillTooLow')}</em>`
          : lacksCombo
            ? `<em>${game.i18n.localize('NEORUEGEN.Dialog.NotEnoughCombo')}</em>`
            : '';

        return `
          <label${classes} data-skill-ok="${lacksSkill ? 'false' : 'true'}" data-combo-cost="${maneuver.combo}">
            <input type="radio" name="maneuver" value="${maneuver.key}"${disabled}>
            <span>
              <strong>${game.i18n.localize(maneuver.label)}</strong>
              <small>${requirements}</small>
              <small>${game.i18n.localize(maneuver.description)}</small>
              ${reason}
            </span>
          </label>
        `;
      }).join('')
      : '';
    const comboSpendControl = comboSpendMax > 0
      ? `
        <div class="combo-spend-control">
          <label>${game.i18n.localize('NEORUEGEN.Dialog.ComboSpend')}</label>
          <div class="combo-spend-stepper">
            <button type="button" data-action="decrease">-</button>
            <span class="combo-spend-value">0</span>
            <input type="hidden" name="comboSpend" value="0">
            <button type="button" data-action="increase">+</button>
          </div>
          <small>${targetDocument
            ? game.i18n.format('NEORUEGEN.Dialog.ComboSpendHint', { combo: targetCombo })
            : game.i18n.format('NEORUEGEN.Dialog.ComboSpendNoTargetHint', { combo: comboSpendMax })}</small>
        </div>
      `
      : '';
    const maneuverList = maneuverRows
      ? `<div class="maneuver-list">${maneuverRows}</div>`
      : '';
    const content = `
      <form class="neoruegen-roll-dialog">
        <div class="form-group">
          <label>${game.i18n.localize('NEORUEGEN.Dialog.Difficulty')}</label>
          <select name="difficulty">${difficultyOptions}</select>
        </div>
        ${comboSpendControl}
        ${maneuverList}
      </form>
    `;

    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: game.i18n.localize('NEORUEGEN.Dialog.SkillCheck'),
        content,
        buttons: {
          roll: {
            label: game.i18n.localize('NEORUEGEN.Action.Check'),
            callback: (html) => {
      const element = html instanceof HTMLElement ? html : html[0];
      const form = element.querySelector('.neoruegen-roll-dialog');
      const difficultyKey = form.querySelector('[name="difficulty"]').value;
      const comboSpendInput = form.querySelector('[name="comboSpend"]');
      const comboSpend = Math.clamp(Number(comboSpendInput?.value) || 0, 0, comboSpendMax);
              const maneuverInput = form.querySelector('[name="maneuver"]:checked:not(:disabled)');
              const maneuverKey = maneuverInput?.value ?? '';
              resolve({
                difficulty: CONFIG.NEORUEGEN.difficulties[difficultyKey],
                maneuver: maneuvers.find((maneuver) => maneuver.key === maneuverKey) ?? null,
                comboSpend,
              });
            },
          },
          cancel: {
            label: game.i18n.localize('Cancel'),
            callback: () => resolve(null),
          },
        },
        default: 'roll',
        render: (html) => this._activateRollDialogListeners(html, targetCombo, comboSpendMax),
        close: () => resolve(null),
      }, {
        classes: ['neoruegen', 'dialog'],
      });
      dialog.render(true);
    });
  }

  _activateRollDialogListeners(html, targetCombo, comboSpendMax) {
    const element = html instanceof HTMLElement ? html : html[0];
    const form = element.querySelector('.neoruegen-roll-dialog');
    const comboSpendInput = form?.querySelector('[name="comboSpend"]');
    const comboSpendValue = form?.querySelector('.combo-spend-value');
    const comboSpendButtons = Array.from(form?.querySelectorAll('.combo-spend-stepper button') ?? []);
    const maneuverOptions = Array.from(form?.querySelectorAll('.maneuver-option') ?? []);

    if (!comboSpendInput) return;

    const updateManeuvers = () => {
      const comboSpend = Math.clamp(Number(comboSpendInput.value) || 0, 0, comboSpendMax);
      comboSpendInput.value = comboSpend;
      comboSpendValue.textContent = String(comboSpend);
      const remainingCombo = targetCombo - comboSpend;

      for (const option of maneuverOptions) {
        const input = option.querySelector('[name="maneuver"]');
        const skillOk = option.dataset.skillOk === 'true';
        const comboCost = Number(option.dataset.comboCost) || 0;
        const disabled = !skillOk || (targetCombo > 0 && remainingCombo < comboCost);

        option.classList.toggle('disabled', disabled);
        input.disabled = disabled;
        if (disabled && input.checked) input.checked = false;
      }
    };

    comboSpendInput.addEventListener('input', updateManeuvers);
    comboSpendInput.addEventListener('change', updateManeuvers);
    for (const button of comboSpendButtons) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const current = Number(comboSpendInput.value) || 0;
        comboSpendInput.value = event.currentTarget.dataset.action === 'increase'
          ? Math.min(current + 1, comboSpendMax)
          : Math.max(current - 1, 0);
        updateManeuvers();
      });
    }
    updateManeuvers();
  }
}
