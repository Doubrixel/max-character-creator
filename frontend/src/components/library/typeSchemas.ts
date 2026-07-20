export interface FieldSchema {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'skillSelect' | 'statblock' | 'prerequisite' | 'checkbox'
  placeholder?: string
  required?: boolean
  options?: string[]
}

export const TYPE_SCHEMAS: Record<string, { label: string; fields: FieldSchema[] }> = {
  races: {
    label: 'Rassen',
    fields: [
      { key: 'spezieslaw', label: 'Spezieslaw (Regeltext)', type: 'textarea', required: true },
      { key: 'statblock_MU', label: 'MU (Mut)', type: 'number', placeholder: '0' },
      { key: 'statblock_KL', label: 'KL (Klugheit)', type: 'number', placeholder: '0' },
      { key: 'statblock_IN', label: 'IN (Intuition)', type: 'number', placeholder: '0' },
      { key: 'statblock_CH', label: 'CH (Charisma)', type: 'number', placeholder: '0' },
      { key: 'statblock_FF', label: 'FF (Fingerfertigkeit)', type: 'number', placeholder: '0' },
      { key: 'statblock_GE', label: 'GE (Gewandheit)', type: 'number', placeholder: '0' },
      { key: 'statblock_KO', label: 'KO (Konstitution)', type: 'number', placeholder: '0' },
      { key: 'statblock_KK', label: 'KK (Körperkraft)', type: 'number', placeholder: '0' },
      { key: 'statblock_SR', label: 'SR (Sinnenschärfe)', type: 'number', placeholder: '0' },
      { key: 'skillBonuses', label: 'Skill-Boni (JSON)', type: 'textarea', placeholder: '{"nahkampf":1,"wahrnehmung":2}' },
      { key: 'vorteile', label: 'Vorteile (JSON)', type: 'textarea', placeholder: '[{"name":"Dunkelsicht","effekt":"sieht im Dunkeln"}]' },
      { key: 'nachteile', label: 'Nachteile (JSON)', type: 'textarea', placeholder: '[{"name":"Lichtempfindlichkeit","effekt":"-2 bei Sonnenlicht"}]' },
    ],
  },
  cultures: {
    label: 'Kulturen',
    fields: [
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
      { key: 'kategorie', label: 'Kategorie', type: 'select', options: ['pflicht', 'bonus'] },
    ],
  },
  spells: {
    label: 'Spells',
    fields: [
      { key: 'level', label: 'Level', type: 'select', options: ['0', '1', '2'], required: true },
      { key: 'schule', label: 'Magieschule', type: 'skillSelect', placeholder: 'Magieschule auswählen...' },
      { key: 'kosten', label: 'Kosten', type: 'text', placeholder: 'z.B. 2 MP' },
      { key: 'effekt', label: 'Effekt', type: 'textarea', required: true },
      { key: 'maxSchulenwert', label: 'Max Schulenwert zum Lernen', type: 'number', placeholder: 'z.B. 1 für Lvl 0' },
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
      { key: 'attr_MU', label: 'MU', type: 'number', placeholder: '10' },
      { key: 'attr_KL', label: 'KL', type: 'number', placeholder: '10' },
      { key: 'attr_IN', label: 'IN', type: 'number', placeholder: '10' },
      { key: 'attr_CH', label: 'CH', type: 'number', placeholder: '10' },
      { key: 'attr_FF', label: 'FF', type: 'number', placeholder: '10' },
      { key: 'attr_GE', label: 'GE', type: 'number', placeholder: '10' },
      { key: 'attr_KO', label: 'KO', type: 'number', placeholder: '10' },
      { key: 'attr_KK', label: 'KK', type: 'number', placeholder: '10' },
      { key: 'attr_SR', label: 'SR', type: 'number', placeholder: '10' },
      { key: 'skills', label: 'Skills (JSON)', type: 'textarea', placeholder: '{"nahkampf":4,"wahrnehmung":3}' },
      { key: 'vorteile', label: 'Vorteile', type: 'textarea', placeholder: 'Dunkelsicht\nSchnelle Heilung' },
      { key: 'nachteile', label: 'Nachteile', type: 'textarea', placeholder: 'Lichtempfindlichkeit\nLangsam' },
    ],
  },
  'derived-values': {
    label: 'Abgeleitete Werte',
    fields: [
      { key: 'formel', label: 'Formel', type: 'text', placeholder: 'z.B. 10 + KO * 2', required: true },
      { key: 'benötigteAttribute', label: 'Benötigte Attribute', type: 'text', placeholder: 'z.B. KO,GE' },
    ],
  },
  skills: {
    label: 'Fähigkeiten',
    fields: [
      { key: 'kategorie', label: 'Kategorie', type: 'select', options: ['talent', 'waffe', 'magie'], required: true },
      { key: 'maxWert', label: 'Maximalwert', type: 'number', placeholder: '6' },
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
