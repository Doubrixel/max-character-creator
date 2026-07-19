export interface FieldSchema {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select'
  placeholder?: string
  required?: boolean
  options?: string[]
}

export const TYPE_SCHEMAS: Record<string, { label: string; fields: FieldSchema[] }> = {
  races: {
    label: 'Rassen',
    fields: [
      { key: 'spezieslaw', label: 'Spezieslaw', type: 'textarea', placeholder: 'Regeltext der Rasse...' },
      { key: 'vorteile', label: 'Vorteile', type: 'textarea', placeholder: 'z.B. +1 auf Wahrnehmung...' },
      { key: 'nachteile', label: 'Nachteile', type: 'textarea', placeholder: 'z.B. Lichtempfindlichkeit...' },
      { key: 'bildUrl', label: 'Bild-URL', type: 'text', placeholder: 'https://...' },
    ],
  },
  cultures: {
    label: 'Kulturen',
    fields: [
      { key: 'talente', label: 'Verfügbare Talente', type: 'text', placeholder: 'z.B. akrobatik,schleichen,wahrnehmung' },
      { key: 'waffen', label: 'Verfügbare Waffen', type: 'text', placeholder: 'z.B. nahkampf,distanz,schild' },
      { key: 'magie', label: 'Magieschulen', type: 'text', placeholder: 'z.B. elementar,heilung' },
      { key: 'staerken', label: 'Stärken (Stufe 1)', type: 'text', placeholder: 'z.B. zaeh,schnell,scharfsinn,charisma' },
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
      { key: 'voraussetzung', label: 'Voraussetzung', type: 'text', placeholder: 'z.B. nahkampf >= 6' },
      { key: 'effekt', label: 'Effekt', type: 'textarea', placeholder: 'Beschreibung des Effekts...' },
      { key: 'kosten', label: 'Kosten (Punkte)', type: 'number', placeholder: '1' },
    ],
  },
  spells: {
    label: 'Spells',
    fields: [
      { key: 'level', label: 'Level', type: 'select', options: ['0', '1', '2'] },
      { key: 'schule', label: 'Magieschule', type: 'select', options: ['elementar', 'heilung'] },
      { key: 'kosten', label: 'Kosten', type: 'text', placeholder: 'z.B. 2 MP' },
      { key: 'effekt', label: 'Effekt', type: 'textarea', placeholder: 'Was der Spell bewirkt...' },
    ],
  },
  resources: {
    label: 'Ressourcen',
    fields: [
      { key: 'startwert', label: 'Startwert', type: 'number', placeholder: '0' },
      { key: 'maximalwert', label: 'Maximalwert', type: 'number', placeholder: '10' },
    ],
  },
  items: {
    label: 'Items',
    fields: [
      { key: 'typ', label: 'Typ', type: 'select', options: ['Waffe', 'Rüstung', 'Zubehör', 'Verbrauchsgegenstand', 'Diverses'] },
      { key: 'gewicht', label: 'Gewicht (kg)', type: 'number', placeholder: '1' },
      { key: 'kosten', label: 'Kosten (Silber)', type: 'number', placeholder: '10' },
      { key: 'effekt', label: 'Effekt', type: 'textarea', placeholder: 'Was das Item bewirkt...' },
    ],
  },
  statblocks: {
    label: 'Statblöcke',
    fields: [
      { key: 'attribute', label: 'Attribute (JSON)', type: 'textarea', placeholder: '{"MU":12,"KL":10,...}' },
      { key: 'skills', label: 'Skills (JSON)', type: 'textarea', placeholder: '{"nahkampf":4,"wahrnehmung":3,...}' },
      { key: 'vorteile', label: 'Vorteile', type: 'textarea', placeholder: 'Liste der Vorteile...' },
      { key: 'nachteile', label: 'Nachteile', type: 'textarea', placeholder: 'Liste der Nachteile...' },
    ],
  },
  'derived-values': {
    label: 'Abgeleitete Werte',
    fields: [
      { key: 'formel', label: 'Formel', type: 'text', placeholder: 'z.B. 10 + KO * 2' },
    ],
  },
  skills: {
    label: 'Fähigkeiten',
    fields: [
      { key: 'kategorie', label: 'Kategorie', type: 'select', options: ['Talent', 'Waffe', 'Magie'] },
    ],
  },
}
