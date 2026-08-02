export interface FieldSchema {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'skillSelect' | 'raceSelect' | 'libraryPick' | 'statblock' | 'prerequisite' | 'checkbox' | 'schoolValues'
  placeholder?: string
  required?: boolean
  options?: string[]
}

export const TYPE_SCHEMAS: Record<string, { label: string; fields: FieldSchema[] }> = {
  races: {
    label: 'Rassen',
    fields: [
      { key: 'beschreibung', label: 'Beschreibung', type: 'textarea' },
      { key: 'groessenklasse', label: 'Großenklasse (GK)', type: 'number', placeholder: '1-5' },
      { key: 'staerken', label: 'Stärken', type: 'libraryPick', placeholder: 'Stärken auswählen...' },
      { key: 'schwaechen', label: 'Schwächen', type: 'libraryPick', placeholder: 'Schwächen auswählen...' },
    ],
  },
  cultures: {
    label: 'Kulturen',
    fields: [
      { key: 'gaengigFuer', label: 'Gängig für', type: 'raceSelect' },
      { key: 'verfuegbareTalente', label: 'Verfügbare Talente', type: 'skillSelect', placeholder: 'Talente auswählen...' },
      { key: 'verfuegbareWaffen', label: 'Verfügbare Waffenskills', type: 'skillSelect', placeholder: 'Waffenskills auswählen...' },
      { key: 'verfuegbareMagie', label: 'Verfügbare Magieschulen', type: 'skillSelect', placeholder: 'Magieschulen auswählen...' },
      { key: 'verfuegbareStaerken', label: 'Verfügbare Stärken', type: 'text', placeholder: 'zaeh,schnell,scharfsinn,charisma' },
      { key: 'meisterschaften', label: 'Kultur-Meisterschaften', type: 'text', placeholder: 'meister-hieb,meisterschuss' },
      { key: 'skillBudget', label: 'Skill-Punkte (Kultur)', type: 'number', placeholder: '20' },
    ],
  },
  trainings: {
    label: 'Ausbildungen',
    fields: [
      { key: 'staerkenPunkte', label: 'Stärken-Punkte', type: 'number', placeholder: '2' },
      { key: 'fertigkeitenPunkte', label: 'Fertigkeiten-Punkte', type: 'number', placeholder: '30' },
      { key: 'magieMaxProSchritt', label: 'Magie max pro Schritt', type: 'number', placeholder: '3' },
      { key: 'magieMaxGesamt', label: 'Magie max Gesamt', type: 'number', placeholder: '4' },
      { key: 'ressourcenPunkte', label: 'Ressourcen-Punkte', type: 'number', placeholder: '2' },
    ],
  },
  masteries: {
    label: 'Meisterschaften',
    fields: [
      { key: 'voraussetzung_typ', label: 'Voraussetzung Typ', type: 'select', options: ['skill >= wert', 'magie >= wert'] },
      { key: 'voraussetzung_id', label: 'Voraussetzung ID', type: 'skillSelect', placeholder: 'Skill auswählen...' },
      { key: 'voraussetzung_wert', label: 'Voraussetzung Min-Wert', type: 'number', placeholder: '6' },
      { key: 'effekt', label: 'Effekt', type: 'textarea', required: true },
      { key: 'kosten', label: 'Kosten (Punkte)', type: 'number', placeholder: '1' },
    ],
  },
  spells: {
    label: 'Spells',
    fields: [
      { key: 'typus', label: 'Typus', type: 'text', placeholder: 'z.B. Objekt, Kontrolle' },
      { key: 'schwierigkeit', label: 'Schwierigkeit', type: 'text', placeholder: 'z.B. 15, KW' },
      { key: 'kosten', label: 'Kosten', type: 'text', placeholder: 'z.B. K1, K16V4' },
      { key: 'zauberdauer', label: 'Zauberdauer', type: 'text', placeholder: 'z.B. 1 Tick, 5 Minuten' },
      { key: 'reichweite', label: 'Reichweite', type: 'text', placeholder: 'z.B. Berührung, Zauberer' },
      { key: 'artefakt', label: 'Artefakt', type: 'select', options: ['Spruch', 'Ritus'] },
      { key: 'schulen', label: 'Schulen', type: 'schoolValues' },
      { key: 'wirkungsdauer', label: 'Wirkungsdauer', type: 'text', placeholder: 'z.B. kanalisiert, sofort' },
      { key: 'wirkungsbereich', label: 'Wirkungsbereich', type: 'text', placeholder: 'z.B. 5 m' },
      { key: 'erfolgsgrade', label: 'Erfolgsgrade', type: 'textarea', placeholder: '• ...\n• ...' },
      { key: 'level', label: 'Level', type: 'number', placeholder: '0' },
    ],
  },
  resources: {
    label: 'Ressourcen',
    fields: [
      { key: 'startwert', label: 'Startwert', type: 'number', placeholder: '0' },
      { key: 'maximalwert', label: 'Maximalwert', type: 'number', placeholder: '10' },
      { key: 'typ', label: 'Typ', type: 'select', options: ['physisch', 'sozial', 'magisch', 'finanzen'] },
    ],
  },
  items: {
    label: 'Items',
    fields: [
      { key: 'typ', label: 'Typ', type: 'select', options: ['Waffe', 'Rüstung', 'Zubehör', 'Verbrauchsgegenstand', 'Diverses'], required: true },
      { key: 'gewicht', label: 'Gewicht (kg)', type: 'number', placeholder: '1' },
      { key: 'kosten', label: 'Kosten (Silber)', type: 'number', placeholder: '10' },
      { key: 'effekt', label: 'Effekt', type: 'textarea' },
    ],
  },
  statblocks: {
    label: 'Statblöcke',
    fields: [
      { key: 'attr_MUT', label: 'MUT', type: 'number', placeholder: '10' },
      { key: 'attr_KLU', label: 'KLU', type: 'number', placeholder: '10' },
      { key: 'attr_INT', label: 'INT', type: 'number', placeholder: '10' },
      { key: 'attr_CHA', label: 'CHA', type: 'number', placeholder: '10' },
      { key: 'attr_HIN', label: 'HIN', type: 'number', placeholder: '10' },
      { key: 'attr_MYS', label: 'MYS', type: 'number', placeholder: '10' },
      { key: 'attr_FF', label: 'FF', type: 'number', placeholder: '10' },
      { key: 'attr_GEW', label: 'GEW', type: 'number', placeholder: '10' },
      { key: 'attr_KON', label: 'KON', type: 'number', placeholder: '10' },
      { key: 'attr_KRA', label: 'KRA', type: 'number', placeholder: '10' },
      { key: 'skills', label: 'Skills (JSON)', type: 'textarea', placeholder: '{"klingenwaffen":4,"wahrnehmung":3}' },
      { key: 'vorteile', label: 'Vorteile', type: 'textarea', placeholder: 'Dunkelsicht\nSchnelle Heilung' },
      { key: 'nachteile', label: 'Nachteile', type: 'textarea', placeholder: 'Lichtempfindlichkeit\nLangsam' },
    ],
  },
  'derived-values': {
    label: 'Abgeleitete Werte',
    fields: [
      { key: 'formel', label: 'Formel', type: 'text', placeholder: 'z.B. ( GK + KON ) * 5', required: true },
    ],
  },
  skills: {
    label: 'Fähigkeiten',
    fields: [
      { key: 'kategorie', label: 'Kategorie', type: 'select', options: ['fertigkeit', 'kampf', 'magie'], required: true },
      { key: 'beschreibung', label: 'Beschreibung', type: 'textarea' },
    ],
  },
  strengths: {
    label: 'Stärken',
    fields: [
      { key: 'kosten', label: 'Kosten (Punkte)', type: 'number', placeholder: '1' },
      { key: 'nur_bei_erstellung', label: 'Nur bei Erstellung wählbar', type: 'checkbox' },
    ],
  },
}

export const SKILL_OPTIONS = [
  { id: 'nahkampf', name: 'Nahkampf' },
  { id: 'distanz', name: 'Distanz' },
  { id: 'schild', name: 'Schild' },
  { id: 'akrobatik', name: 'Akrobatik' },
  { id: 'schleichen', name: 'Schleichen' },
  { id: 'wahrnehmung', name: 'Wahrnehmung' },
  { id: 'ueberleben', name: 'Überleben' },
  { id: 'wissen', name: 'Wissen' },
  { id: 'elementar', name: 'Elementarmagie' },
  { id: 'heilung', name: 'Heilungsmagie' },
]

export const STRENGTH_OPTIONS = [
  { id: 'zaeh', name: 'Zäh' },
  { id: 'schnell', name: 'Schnell' },
  { id: 'scharfsinn', name: 'Scharfsinn' },
  { id: 'charisma', name: 'Charisma' },
]

export const MASTERY_OPTIONS = [
  { id: 'm_nah_1', name: 'Klingensturm' },
  { id: 'm_nah_2', name: 'Meisterparade' },
  { id: 'm_dis_1', name: 'Scharfschütze' },
  { id: 'm_dis_2', name: 'Schnellfeuer' },
  { id: 'm_akr_1', name: 'Luftsprung' },
  { id: 'm_akr_2', name: 'Fallmeister' },
  { id: 'm_sch_1', name: 'Unsichtbar' },
  { id: 'm_sch_2', name: 'Schattenritt' },
  { id: 'm_wah_1', name: 'Adlerauge' },
  { id: 'm_wah_2', name: 'Gefahrensinn' },
  { id: 'm_wis_1', name: 'Gelehrter' },
  { id: 'm_wis_2', name: 'Analytiker' },
  { id: 'm_ele_1', name: 'Elementarbeherrschung' },
  { id: 'm_ele_2', name: 'Sturmrufer' },
  { id: 'm_hei_1', name: 'Wundheiler' },
  { id: 'm_hei_2', name: 'Reinigung' },
  { id: 'm_ueb_1', name: 'Wegweiser' },
  { id: 'm_ueb_2', name: 'Jäger' },
  { id: 'meister-hieb', name: 'Meisterhieb' },
  { id: 'meisterschuss', name: 'Meisterschuss' },
  { id: 'arkaner-strom', name: 'Arkaner Strom' },
]

export const MAGIC_SCHOOL_OPTIONS = [
  { id: 'elementar', name: 'Elementarmagie' },
  { id: 'heilung', name: 'Heilungsmagie' },
]

export const FULL_MAGIC_SKILLS = [
  { id: 'bannmagie', name: 'Bannmagie' },
  { id: 'beherrschungsmagie', name: 'Beherrschungsmagie' },
  { id: 'bewegungsmagie', name: 'Bewegungsmagie' },
  { id: 'erkenntnismagie', name: 'Erkenntnismagie' },
  { id: 'felsmagie', name: 'Felsmagie' },
  { id: 'feuermagie', name: 'Feuermagie' },
  { id: 'heilungsmagie', name: 'Heilungsmagie' },
  { id: 'illusionsmagie', name: 'Illusionsmagie' },
  { id: 'kampfmagie', name: 'Kampfmagie' },
  { id: 'lichtmagie', name: 'Lichtmagie' },
  { id: 'naturmagie', name: 'Naturmagie' },
  { id: 'raummagie', name: 'Raummagie' },
  { id: 'schattenmagie', name: 'Schattenmagie' },
  { id: 'schicksalsmagie', name: 'Schicksalsmagie' },
  { id: 'schutzmagie', name: 'Schutzmagie' },
  { id: 'staerkungsmagie', name: 'Stärkungsmagie' },
  { id: 'todesmagie', name: 'Todesmagie' },
  { id: 'verwandlungsmagie', name: 'Verwandlungsmagie' },
  { id: 'wassermagie', name: 'Wassermagie' },
  { id: 'windmagie', name: 'Windmagie' },
]

export const SCHOOL_SHORT_MAP: Record<string, { id: string; name: string }> = {
  'Bann': { id: 'bannmagie', name: 'Bannmagie' },
  'Beherrschung': { id: 'beherrschungsmagie', name: 'Beherrschungsmagie' },
  'Bewegung': { id: 'bewegungsmagie', name: 'Bewegungsmagie' },
  'Erkenntnis': { id: 'erkenntnismagie', name: 'Erkenntnismagie' },
  'Fels': { id: 'felsmagie', name: 'Felsmagie' },
  'Feuer': { id: 'feuermagie', name: 'Feuermagie' },
  'Heilung': { id: 'heilungsmagie', name: 'Heilungsmagie' },
  'Illusion': { id: 'illusionsmagie', name: 'Illusionsmagie' },
  'Kampf': { id: 'kampfmagie', name: 'Kampfmagie' },
  'Licht': { id: 'lichtmagie', name: 'Lichtmagie' },
  'Natur': { id: 'naturmagie', name: 'Naturmagie' },
  'Schatten': { id: 'schattenmagie', name: 'Schattenmagie' },
  'Schicksal': { id: 'schicksalsmagie', name: 'Schicksalsmagie' },
  'Schutz': { id: 'schutzmagie', name: 'Schutzmagie' },
  'Stärkung': { id: 'staerkungsmagie', name: 'Stärkungsmagie' },
  'Tod': { id: 'todesmagie', name: 'Todesmagie' },
  'Verwandlung': { id: 'verwandlungsmagie', name: 'Verwandlungsmagie' },
  'Wasser': { id: 'wassermagie', name: 'Wassermagie' },
  'Wind': { id: 'windmagie', name: 'Windmagie' },
}
