export const NEORUEGEN = {};

NEORUEGEN.attributes = {
  koerper: 'NEORUEGEN.Attribute.Koerper',
  verstand: 'NEORUEGEN.Attribute.Verstand',
  schneid: 'NEORUEGEN.Attribute.Schneid',
};

NEORUEGEN.skillGroups = {
  core: [
    'athletik',
    'fahren',
    'hacking',
    'heimlichkeit',
    'nahkampf',
    'schusswaffen',
    'sicherheitssysteme',
    'taeuschen',
    'technik',
    'ueberzeugen',
    'verhandeln',
    'wahrnehmung',
  ],
  advanced: [
    'biotech',
    'buerokratie',
    'chemie',
    'drohnensteuerung',
    'einschuechtern',
    'elektronik',
    'konstruktion',
    'kraftakt',
    'navigation',
    'programmierung',
    'schmuggel',
    'schwereWaffen',
    'sensorik',
    'stil',
    'taktik',
    'ueberleben',
    'verkleidung',
    'wissen',
  ],
};

NEORUEGEN.skills = {
  athletik: { label: 'NEORUEGEN.Skill.Athletik', attribute: 'koerper' },
  fahren: { label: 'NEORUEGEN.Skill.Fahren', attribute: 'schneid' },
  hacking: { label: 'NEORUEGEN.Skill.Hacking', attribute: 'verstand' },
  heimlichkeit: { label: 'NEORUEGEN.Skill.Heimlichkeit', attribute: 'koerper' },
  nahkampf: { label: 'NEORUEGEN.Skill.Nahkampf', attribute: 'koerper' },
  schusswaffen: { label: 'NEORUEGEN.Skill.Schusswaffen', attribute: 'koerper' },
  sicherheitssysteme: { label: 'NEORUEGEN.Skill.Sicherheitssysteme', attribute: 'verstand' },
  taeuschen: { label: 'NEORUEGEN.Skill.Taeuschen', attribute: 'schneid' },
  technik: { label: 'NEORUEGEN.Skill.Technik', attribute: 'verstand' },
  ueberzeugen: { label: 'NEORUEGEN.Skill.Ueberzeugen', attribute: 'schneid' },
  verhandeln: { label: 'NEORUEGEN.Skill.Verhandeln', attribute: 'schneid' },
  wahrnehmung: { label: 'NEORUEGEN.Skill.Wahrnehmung', attribute: 'verstand' },
  biotech: { label: 'NEORUEGEN.Skill.Biotech', attribute: 'verstand' },
  buerokratie: { label: 'NEORUEGEN.Skill.Buerokratie', attribute: 'verstand' },
  chemie: { label: 'NEORUEGEN.Skill.Chemie', attribute: 'verstand' },
  drohnensteuerung: { label: 'NEORUEGEN.Skill.Drohnensteuerung', attribute: 'verstand' },
  einschuechtern: { label: 'NEORUEGEN.Skill.Einschuechtern', attribute: 'schneid' },
  elektronik: { label: 'NEORUEGEN.Skill.Elektronik', attribute: 'verstand' },
  konstruktion: { label: 'NEORUEGEN.Skill.Konstruktion', attribute: 'verstand' },
  kraftakt: { label: 'NEORUEGEN.Skill.Kraftakt', attribute: 'koerper' },
  navigation: { label: 'NEORUEGEN.Skill.Navigation', attribute: 'verstand' },
  programmierung: { label: 'NEORUEGEN.Skill.Programmierung', attribute: 'verstand' },
  schmuggel: { label: 'NEORUEGEN.Skill.Schmuggel', attribute: 'schneid' },
  schwereWaffen: { label: 'NEORUEGEN.Skill.SchwereWaffen', attribute: 'koerper' },
  sensorik: { label: 'NEORUEGEN.Skill.Sensorik', attribute: 'verstand' },
  stil: { label: 'NEORUEGEN.Skill.Stil', attribute: 'schneid' },
  taktik: { label: 'NEORUEGEN.Skill.Taktik', attribute: 'verstand' },
  ueberleben: { label: 'NEORUEGEN.Skill.Ueberleben', attribute: 'verstand' },
  verkleidung: { label: 'NEORUEGEN.Skill.Verkleidung', attribute: 'schneid' },
  wissen: { label: 'NEORUEGEN.Skill.Wissen', attribute: 'verstand' },
};

NEORUEGEN.difficulties = {
  veryEasy: { label: 'NEORUEGEN.Difficulty.VeryEasy', modifier: 4 },
  easy: { label: 'NEORUEGEN.Difficulty.Easy', modifier: 2 },
  normal: { label: 'NEORUEGEN.Difficulty.Normal', modifier: 0 },
  hard: { label: 'NEORUEGEN.Difficulty.Hard', modifier: -2 },
  veryHard: { label: 'NEORUEGEN.Difficulty.VeryHard', modifier: -4 },
};

NEORUEGEN.maneuvers = {
  aimedShot: {
    label: 'NEORUEGEN.Maneuver.AimedShot.Name',
    skill: 'schusswaffen',
    skillValue: 2,
    complexity: 1,
    combo: 2,
    description: 'NEORUEGEN.Maneuver.AimedShot.Description',
  },
  feint: {
    label: 'NEORUEGEN.Maneuver.Feint.Name',
    skill: 'nahkampf',
    skillValue: 2,
    complexity: 0,
    combo: 1,
    description: 'NEORUEGEN.Maneuver.Feint.Description',
  },
};
