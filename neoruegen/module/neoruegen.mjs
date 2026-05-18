// Import document classes.
import { NeoruegenActor } from './documents/actor.mjs';
// Import sheet classes.
import { NeoruegenActorSheet } from './sheets/actor-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { NEORUEGEN } from './helpers/config.mjs';
import { registerTokenComboThreat } from './token-combo-threat.mjs';
// Import DataModel classes.
import * as models from './data/_module.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.neoruegen = {
    NeoruegenActor,
  };

  // Add custom constants for configuration.
  CONFIG.NEORUEGEN = NEORUEGEN;

  // Define custom Document and DataModel classes.
  CONFIG.Actor.documentClass = NeoruegenActor;
  CONFIG.Actor.dataModels = {
    character: models.NeoruegenCharacter,
  };
  CONFIG.Actor.trackableAttributes = {
    character: {
      value: [
        'attributes.koerper.value',
        'attributes.verstand.value',
        'attributes.schneid.value',
      ],
    },
  };

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('neoruegen', NeoruegenActorSheet, {
    makeDefault: true,
    label: 'NEORUEGEN.SheetLabels.Actor',
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

registerTokenComboThreat();
