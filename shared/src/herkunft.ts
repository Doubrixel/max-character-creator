export interface ChoiceItem {
  type: 'skill' | 'resource'
  name: string
  value: number
}

export type Choice = ChoiceItem[]
export type Row = Choice[]

export interface Origin {
  id: string
  name: string
  rows: Row[]
}

export interface SocialClass {
  id: string
  name: string
  origins: Origin[]
}

export function sk(name: string, value = 3): ChoiceItem { return { type: 'skill', name, value } }
export function res(name: string, value = 1): ChoiceItem { return { type: 'resource', name, value } }

export const GENERIC_SKILL_NAMES = ['Kampf', 'Magie'] as const

export function choiceKey(choice: Choice): string {
  return choice.map((c) => `${c.name}:${c.value}`).join('+')
}

export function choiceLabel(choice: Choice): string {
  return choice.map((c) => `${c.name} +${c.value}`).join(' + ')
}

export function parseChoiceKey(key: string): ChoiceItem[] {
  return key.split('+').map((part) => {
    const [name, valStr] = part.split(':')
    const value = parseInt(valStr, 10)
    const isResource = ['Geld', 'Ruf', 'Kontakt', 'Kontakte', 'Artefakt', 'Begleiter', 'Organisation'].includes(name)
    return { type: isResource ? 'resource' : 'skill', name, value }
  })
}

export const socialClasses: SocialClass[] = [
  {
    id: 'bettler', name: 'Bettler', origins: [
      { id: 'strassenkind', name: 'Straßenkind', rows: [
        [[sk('Heimlichkeit')], [sk('Athletik')]],
        [[sk('Straßenkunde')], [sk('Überleben')]],
        [[res('Kontakt')]],
        [[res('Organisation')], [res('Geld')]],
      ]},
      { id: 'krueppel', name: 'Krüppel / Versehrter', rows: [
        [[sk('Heilkunde')], [sk('Überleben')]],
        [[sk('Athletik')], [sk('Darbietung')]],
        [[res('Kontakt')]],
        [[res('Geld')], [res('Artefakt')]],
      ]},
      { id: 'ausgestossener', name: 'Ausgestoßener', rows: [
        [[sk('Naturkunde')], [sk('Überleben')]],
        [[sk('Heimlichkeit')], [sk('Überleben')]],
        [[res('Kontakt')]],
        [[res('Begleiter')], [res('Geld')]],
      ]},
      { id: 'tageloehner', name: 'Tagelöhner', rows: [
        [[sk('Athletik')], [sk('Zähigkeit')]],
        [[sk('Handwerk')], [sk('Kampf')]],
        [[res('Kontakt')]],
        [[res('Geld')], [res('Organisation')]],
      ]},
      { id: 'wanderprediger', name: 'Wanderprediger', rows: [
        [[sk('Götter und Okkultismus')], [sk('Empathie')]],
        [[sk('Überleben')], [sk('Diplomatie')]],
        [[res('Artefakt')]],
        [[res('Ruf')], [res('Geld')]],
      ]},
      { id: 'kleinkrimineller', name: 'Kleinkrimineller', rows: [
        [[sk('Heimlichkeit')], [sk('Kampf')]],
        [[sk('Athletik')], [sk('Redegewandtheit')]],
        [[res('Geld')]],
        [[res('Organisation')], [res('Ruf')]],
      ]},
    ],
  },
  {
    id: 'bauer', name: 'Bauer', origins: [
      { id: 'bauer', name: 'Bauer', rows: [
        [[sk('Naturkunde')], [sk('Handwerk')]],
        [[sk('Tierführung')], [sk('Zähigkeit')]],
        [[res('Kontakt', 2)], [res('Begleiter', 2)]],
        [[res('Geld')], [res('Begleiter')]],
      ]},
      { id: 'hirte', name: 'Hirte', rows: [
        [[sk('Tierführung')], [sk('Wahrnehmung')]],
        [[sk('Überleben')], [sk('Tierführung')]],
        [[res('Begleiter', 2)], [res('Kontakt', 2)]],
        [[res('Geld')], [res('Begleiter')]],
      ]},
      { id: 'holzaehler', name: 'Holzfäller', rows: [
        [[sk('Handwerk')], [sk('Athletik')]],
        [[sk('Zähigkeit')], [sk('Naturkunde')]],
        [[res('Kontakt', 2)], [res('Organisation', 2)]],
        [[res('Geld')], [res('Kontakt')]],
      ]},
      { id: 'jaeger', name: 'Jäger', rows: [
        [[sk('Wahrnehmung')], [sk('Naturkunde')]],
        [[sk('Überleben')], [sk('Tierführung')]],
        [[res('Begleiter', 2)], [res('Kontakt', 2)]],
        [[res('Kontakt')], [res('Geld')]],
      ]},
      { id: 'bote', name: 'Bote', rows: [
        [[sk('Tierführung')], [sk('Athletik')]],
        [[sk('Wahrnehmung')], [sk('Heimlichkeit')]],
        [[res('Organisation', 2)], [res('Begleiter', 2)]],
        [[res('Kontakt')], [res('Geld')]],
      ]},
      { id: 'seemann', name: 'Seemann', rows: [
        [[sk('Seefahrt')], [sk('Akrobatik')]],
        [[sk('Schwimmen')], [sk('Zähigkeit')]],
        [[res('Organisation', 2)], [res('Kontakt', 2)]],
        [[res('Kontakt')], [res('Geld')]],
      ]},
    ],
  },
  {
    id: 'buerger', name: 'Bürger', origins: [
      { id: 'haendler', name: 'Händler', rows: [
        [[sk('Diplomatie')], [sk('Redegewandtheit')]],
        [[sk('Straßenkunde')], [sk('Darbietung')]],
        [[res('Geld', 2)], [res('Organisation'), res('Kontakt')]],
        [[res('Geld'), res('Organisation')], [res('Begleiter', 2)]],
      ]},
      { id: 'handwerker', name: 'Handwerker', rows: [
        [[sk('Handwerk')], [sk('Zähigkeit')]],
        [[sk('Handwerk')], [sk('Athletik')]],
        [[res('Artefakt', 2)], [res('Geld'), res('Kontakt')]],
        [[res('Organisation'), res('Geld')], [res('Kontakt', 2)]],
      ]},
      { id: 'krimineller', name: 'Krimineller', rows: [
        [[sk('Anführen')], [sk('Feinmotorik')]],
        [[sk('Heimlichkeit')], [sk('Akrobatik')]],
        [[res('Ruf', 2)], [res('Organisation'), res('Geld')]],
        [[res('Geld'), res('Kontakt')], [res('Geld', 2)]],
      ]},
      { id: 'kuenstler', name: 'Künstler', rows: [
        [[sk('Edelhandwerk')], [sk('Darbietung')]],
        [[sk('Straßenkunde')], [sk('Redegewandtheit')]],
        [[res('Geld'), res('Ruf')], [res('Kontakt', 2)]],
        [[res('Begleiter', 2)], [res('Geld'), res('Kontakt')]],
      ]},
      { id: 'schreiber', name: 'Schreiber', rows: [
        [[sk('Edelhandwerk')], [sk('Diplomatie')]],
        [[sk('Redegewandtheit')], [sk('Feinmotorik')]],
        [[res('Geld', 2)], [res('Organisation', 2)]],
        [[res('Geld'), res('Kontakt')], [res('Geld'), res('Organisation')]],
      ]},
      { id: 'krieger', name: 'Krieger', rows: [
        [[sk('Kampf')], [sk('Zähigkeit')]],
        [[sk('Akrobatik')], [sk('Athletik')]],
        [[res('Geld', 2)], [res('Geld'), res('Artefakt')]],
        [[res('Kontakt', 2)], [res('Artefakt', 2)]],
      ]},
    ],
  },
  {
    id: 'gelehrter', name: 'Gelehrter', origins: [
      { id: 'mediziner', name: 'Mediziner', rows: [
        [[sk('Heilkunde')], [sk('Magie')]],
        [[sk('Naturkunde')], [sk('Empathie')]],
        [[res('Geld')], [res('Ruf')]],
        [[res('Geld', 2)], [res('Organisation', 2)]],
        [[res('Organisation', 2)], [res('Geld'), res('Kontakt')]],
      ]},
      { id: 'erfinder', name: 'Erfinder', rows: [
        [[sk('Mechanik')], [sk('Arkane Kunde')]],
        [[sk('Handwerk')], [sk('Edelhandwerk')]],
        [[res('Geld')], [res('Ruf')]],
        [[res('Artefakt', 2)], [res('Kontakt', 2)]],
        [[res('Artefakt'), res('Kontakt')], [res('Geld', 2)]],
      ]},
      { id: 'lehrer', name: 'Lehrer', rows: [
        [[sk('Anführen')], [sk('Diplomatie')]],
        [[sk('Straßenkunde')], [sk('Geschichten und Mythen')]],
        [[res('Organisation')], [res('Ruf')]],
        [[res('Organisation', 2)], [res('Kontakt', 2)]],
        [[res('Geld', 2)], [res('Organisation'), res('Geld')]],
      ]},
      { id: 'bibliothekar', name: 'Bibliothekar', rows: [
        [[sk('Geschichten und Mythen')], [sk('Länderkunde')]],
        [[sk('Götter und Okkultismus')], [sk('Arkane Kunde')]],
        [[res('Geld')], [res('Kontakt')]],
        [[res('Artefakt', 2)], [res('Geld', 2)]],
        [[res('Organisation', 2)], [res('Kontakt', 2)]],
      ]},
      { id: 'geweihter', name: 'Geweihter', rows: [
        [[sk('Götter und Okkultismus')], [sk('Diplomatie')]],
        [[sk('Entschlossenheit')], [sk('Anführen')]],
        [[res('Geld')], [res('Organisation')]],
        [[res('Artefakt', 2)], [res('Organisation'), res('Geld')]],
        [[res('Kontakt', 2)], [res('Organisation'), res('Geld')]],
      ]},
      { id: 'magier', name: 'Magier', rows: [
        [[sk('Magie')], [sk('Arkane Kunde')]],
        [[sk('Geschichten und Mythen')], [sk('Magie')]],
        [[res('Kontakt')], [res('Organisation')]],
        [[res('Artefakt', 2)], [res('Geld', 2)]],
        [[res('Kontakt', 2)], [res('Artefakt', 2)]],
      ]},
    ],
  },
  {
    id: 'patrizier', name: 'Patrizier', origins: [
      { id: 'grosskapitalist', name: 'Großkapitalist', rows: [
        [[sk('Darbietung')], [sk('Anführen')]],
        [[sk('Diplomatie')], [sk('Redegewandtheit')]],
        [[res('Geld')], [res('Kontakt')]],
        [[res('Geld', 2)], [res('Ruf', 2)]],
        [[res('Geld'), res('Kontakt')], [res('Kontakt', 2)]],
      ]},
      { id: 'beamte', name: 'Beamte', rows: [
        [[sk('Diplomatie')], [sk('Wahrnehmung')]],
        [[sk('Anführen')], [sk('Redegewandtheit')]],
        [[res('Geld')], [res('Kontakt')]],
        [[res('Geld', 2)], [res('Kontakt'), res('Ruf')]],
        [[res('Kontakt', 2)], [res('Ruf'), res('Geld')]],
      ]},
      { id: 'berater', name: 'Berater', rows: [
        [[sk('Arkane Kunde')], [sk('Anführen')]],
        [[sk('Diplomatie')], [sk('Kampf')]],
        [[res('Kontakt')], [res('Geld')]],
        [[res('Kontakt', 2)], [res('Geld'), res('Kontakt')]],
        [[res('Organisation', 2)], [res('Geld', 2)]],
      ]},
      { id: 'gildenmeister', name: 'Gildenmeister', rows: [
        [[sk('Kampf')], [sk('Arkane Kunde')]],
        [[sk('Anführen')], [sk('Magie')]],
        [[res('Organisation')], [res('Kontakt')]],
        [[res('Organisation', 2)], [res('Geld', 2)]],
        [[res('Kontakt'), res('Organisation')], [res('Geld'), res('Artefakt')]],
      ]},
      { id: 'verbrecher', name: 'Verbrecher', rows: [
        [[sk('Anführen')], [sk('Heimlichkeit')]],
        [[sk('Feinmotorik')], [sk('Kampf')]],
        [[res('Organisation')], [res('Ruf')]],
        [[res('Geld', 2)], [res('Organisation', 2)]],
        [[res('Ruf'), res('Geld')], [res('Kontakt', 2)]],
      ]},
      { id: 'glaubensoberhaupt', name: 'Glaubensoberhaupt', rows: [
        [[sk('Götter und Okkultismus')], [sk('Anführen')]],
        [[sk('Länderkunde')], [sk('Geschichten und Mythen')]],
        [[res('Organisation')], [res('Ruf')]],
        [[res('Geld', 2)], [res('Organisation', 2)]],
        [[res('Artefakt', 2)], [res('Geld', 2)]],
      ]},
    ],
  },
  {
    id: 'adel', name: 'Adel', origins: [
      { id: 'ritter', name: 'Ritter', rows: [
        [[sk('Anführen')], [sk('Kampf')]],
        [[sk('Diplomatie')], [sk('Athletik')]],
        [[res('Geld', 2)], [res('Begleiter'), res('Ruf')]],
        [[res('Artefakt', 2)], [res('Begleiter', 2)]],
        [[res('Geld'), res('Kontakt')], [res('Begleiter'), res('Geld')]],
      ]},
      { id: 'fuerst', name: 'Fürst', rows: [
        [[sk('Anführen')], [sk('Länderkunde')]],
        [[sk('Kampf')], [sk('Diplomatie')]],
        [[res('Kontakt', 2)], [res('Geld'), res('Ruf')]],
        [[res('Geld', 2)], [res('Kontakt'), res('Geld')]],
        [[res('Geld'), res('Kontakt')], [res('Artefakt', 2)]],
      ]},
      { id: 'graf', name: 'Graf', rows: [
        [],
        [[sk('Kampf')]],
        [[res('Geld'), res('Ruf')], [res('Kontakt'), res('Ruf')]],
        [[res('Geld'), res('Kontakt')], [res('Geld'), res('Artefakt')]],
        [[res('Kontakt'), res('Geld')], [res('Kontakt'), res('Artefakt')]],
      ]},
      { id: 'herzog', name: 'Herzog', rows: [
        [[sk('Anführen')], [sk('Länderkunde')]],
        [[sk('Kampf')], [sk('Magie')]],
        [[res('Ruf'), res('Geld')], [res('Ruf'), res('Kontakt')]],
        [[res('Ruf'), res('Geld')], [res('Ruf'), res('Begleiter')]],
        [[res('Begleiter', 2)], [res('Artefakt', 2)]],
      ]},
      { id: 'erzherzog', name: 'Erzherzog', rows: [
        [[sk('Diplomatie')], [sk('Arkane Kunde')]],
        [[sk('Kampf')], [sk('Anführen')]],
        [[res('Ruf'), res('Geld', 2)], [res('Ruf'), res('Kontakt', 2)]],
        [[res('Ruf'), res('Geld')], [res('Ruf'), res('Begleiter', 2)]],
        [[res('Begleiter', 2), res('Geld')], [res('Artefakt', 2), res('Geld')]],
      ]},
      { id: 'herrscher', name: 'Herrscher', rows: [
        [[sk('Anführen')], [sk('Länderkunde')]],
        [[sk('Diplomatie')], [sk('Kampf')]],
        [[res('Ruf', 2), res('Geld', 2)], [res('Ruf', 2), res('Begleiter', 2)]],
        [[res('Ruf'), res('Geld', 2)], [res('Ruf'), res('Begleiter'), res('Artefakt')]],
        [[res('Geld'), res('Begleiter', 2)], [res('Geld', 2), res('Artefakt')]],
      ]},
    ],
  },
]
