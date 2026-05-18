import { COMBO_FLAG_KEY, getTokenPoolValue, setTokenPoolValue } from '../token-combo-threat.mjs';

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
    const diceCount = Math.max(skillValue + attributeValue + difficultyModifier - complexity, 0);
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
    if (targetDocument && comboPoints > 0) {
      const currentCombo = getTokenPoolValue(targetDocument, COMBO_FLAG_KEY);
      await setTokenPoolValue(targetDocument, COMBO_FLAG_KEY, currentCombo + comboPoints);
    }
    const targetLine = targetDocument && comboPoints > 0
      ? `<p>${comboPoints} Combo-Punkte auf ${targetDocument.name} hinzugefügt</p>`
      : '';
    const difficultyLine = `${game.i18n.localize(rollOptions.difficulty.label)} (${difficultyModifier >= 0 ? '+' : ''}${difficultyModifier})`;
    const complexityLine = `${this._getComplexityLabel(complexity)} (-${complexity})`;
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
        <div><dt>${game.i18n.localize('NEORUEGEN.Dialog.Complexity')}</dt><dd>${complexityLine}</dd></div>
      </dl>
      <p>${diceLine}</p>
      <p>${resultLine}</p>
      ${isSuccess ? `<p>${comboLine}</p>` : ''}
      ${maneuverLine}
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
      .filter(([, maneuver]) => maneuver.skill === skillKey)
      .map(([key, maneuver]) => ({ key, ...maneuver }));
    const targetCombo = targetDocument ? getTokenPoolValue(targetDocument, COMBO_FLAG_KEY) : 0;
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
          <label${classes}>
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
      : `<p class="maneuver-empty">${game.i18n.localize('NEORUEGEN.Dialog.NoManeuvers')}</p>`;
    const content = `
      <form class="neoruegen-roll-dialog">
        <div class="form-group">
          <label>${game.i18n.localize('NEORUEGEN.Dialog.Difficulty')}</label>
          <select name="difficulty">${difficultyOptions}</select>
        </div>
        <div class="maneuver-list">
          <label class="maneuver-option">
            <input type="radio" name="maneuver" value="" checked>
            <span>${game.i18n.localize('NEORUEGEN.Dialog.NoManeuver')}</span>
          </label>
          ${maneuverRows}
        </div>
      </form>
    `;

    return new Promise((resolve) => {
      new Dialog({
        title: game.i18n.localize('NEORUEGEN.Dialog.SkillCheck'),
        content,
        buttons: {
          roll: {
            label: game.i18n.localize('NEORUEGEN.Action.Check'),
            callback: (html) => {
              const element = html instanceof HTMLElement ? html : html[0];
              const form = element.querySelector('.neoruegen-roll-dialog');
              const difficultyKey = form.querySelector('[name="difficulty"]').value;
              const maneuverKey = form.querySelector('[name="maneuver"]:checked').value;
              resolve({
                difficulty: CONFIG.NEORUEGEN.difficulties[difficultyKey],
                maneuver: maneuvers.find((maneuver) => maneuver.key === maneuverKey) ?? null,
              });
            },
          },
          cancel: {
            label: game.i18n.localize('Cancel'),
            callback: () => resolve(null),
          },
        },
        default: 'roll',
        close: () => resolve(null),
      }, {
        classes: ['neoruegen', 'dialog'],
      }).render(true);
    });
  }
}
