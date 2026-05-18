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
    const diceCount = Math.max(skillValue + attributeValue, 0);
    const skillLabel = game.i18n.localize(skillConfig.label);
    const attributeLabel = game.i18n.localize(CONFIG.NEORUEGEN.attributes[attributeKey]);
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
    const target = game.user.targets.first();
    const targetDocument = target?.document;
    if (targetDocument && comboPoints > 0) {
      const currentCombo = getTokenPoolValue(targetDocument, COMBO_FLAG_KEY);
      await setTokenPoolValue(targetDocument, COMBO_FLAG_KEY, currentCombo + comboPoints);
    }
    const targetLine = targetDocument && comboPoints > 0
      ? `<p>${comboPoints} Combo-Punkte auf ${targetDocument.name} hinzugefügt</p>`
      : '';
    const content = `
      <p><strong>${skillLabel}</strong> <span>(${attributeLabel})</span></p>
      <p>${skillValue} + ${attributeValue} = ${diceCount}W12</p>
      <p>${formattedDice.length ? formattedDice.join(', ') : '-'}</p>
      <p>${resultLine}</p>
      ${isSuccess ? `<p>${comboLine}</p>` : ''}
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
}
