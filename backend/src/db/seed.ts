import { randomUUID } from 'crypto';
import { db } from './index';
import {
  resources,
  items,
  derivedValues,
  races,
  cultures,
  spells,
  masteries,
  statblocks,
  skills,
  strengths,
} from './schema';

async function isEmpty(table: any): Promise<boolean> {
  const rows = await db.select().from(table).limit(1);
  return rows.length === 0;
}

function skillId(name: string): string {
  return name.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Fertigkeiten (27) + Kampffertigkeiten (7) + Magieschulen (20) = 54
const SKILL_SEED: Array<{ name: string; kategorie: string; a1: string; a2: string; beschreibung: string }> = [
  { name: 'Akrobatik', kategorie: 'fertigkeit', a1: 'FF', a2: 'GEW', beschreibung: 'Akrobatische Kunststücke, Balance, Sprünge' },
  { name: 'Alchemie', kategorie: 'fertigkeit', a1: 'INT', a2: 'FF', beschreibung: 'Alchemistische Substanzen, Tränke, Gifte herstellen' },
  { name: 'Anführen', kategorie: 'fertigkeit', a1: 'CHA', a2: 'HIN', beschreibung: 'Befehlen, Anleiten, Kampfkommandos' },
  { name: 'Arkane Kunde', kategorie: 'fertigkeit', a1: 'INT', a2: 'MYS', beschreibung: 'Magisches Wissen, Theorie, Artefakte' },
  { name: 'Athletik', kategorie: 'fertigkeit', a1: 'GEW', a2: 'KRA', beschreibung: 'Laufen, Klettern, Sportliche Leistungen' },
  { name: 'Diplomatie', kategorie: 'fertigkeit', a1: 'CHA', a2: 'INT', beschreibung: 'Verhandeln, Überzeugen, Intrigen' },
  { name: 'Darbietung', kategorie: 'fertigkeit', a1: 'CHA', a2: 'MUT', beschreibung: 'Musik, Schauspiel, Geschichten erzählen' },
  { name: 'Edelhandwerk', kategorie: 'fertigkeit', a1: 'FF', a2: 'INT', beschreibung: 'Kunstvolle Handwerkskunst, Schmuck, Feinarbeit' },
  { name: 'Empathie', kategorie: 'fertigkeit', a1: 'CHA', a2: 'HIN', beschreibung: 'Gefühle und Stimmungen anderer erkennen' },
  { name: 'Entschlossenheit', kategorie: 'fertigkeit', a1: 'MUT', a2: 'KON', beschreibung: 'Willenskraft, Ausdauer gegen psychischen Druck' },
  { name: 'Geschichten und Mythen', kategorie: 'fertigkeit', a1: 'INT', a2: 'CHA', beschreibung: 'Historisches Wissen, Sagen, Legenden' },
  { name: 'Götter und Okkultismus', kategorie: 'fertigkeit', a1: 'MUT', a2: 'MYS', beschreibung: 'Götter, Kulte, okkultes Wissen' },
  { name: 'Handwerk', kategorie: 'fertigkeit', a1: 'FF', a2: 'KRA', beschreibung: 'Handwerkliche Fertigkeiten, Werkzeuge, Materialien' },
  { name: 'Heilkunde', kategorie: 'fertigkeit', a1: 'INT', a2: 'FF', beschreibung: 'Verwundungen behandeln, Krankheiten heilen' },
  { name: 'Heimlichkeit', kategorie: 'fertigkeit', a1: 'FF', a2: 'GEW', beschreibung: 'Schleichen, Verstecken, Lärmlos bewegen' },
  { name: 'Länderkunde', kategorie: 'fertigkeit', a1: 'INT', a2: 'CHA', beschreibung: 'Geografie, Kulturen, Handelswege' },
  { name: 'Mechanik', kategorie: 'fertigkeit', a1: 'INT', a2: 'FF', beschreibung: 'Mechanismen verstehen, Konstrukte, Fallen' },
  { name: 'Motorik', kategorie: 'fertigkeit', a1: 'FF', a2: 'GEW', beschreibung: 'Feinmotorik, Geschicklichkeit der Hände' },
  { name: 'Naturkunde', kategorie: 'fertigkeit', a1: 'INT', a2: 'HIN', beschreibung: 'Pflanzen, Tiere, Ökosysteme verstehen' },
  { name: 'Redegewandtheit', kategorie: 'fertigkeit', a1: 'CHA', a2: 'MUT', beschreibung: 'Überzeugen, Lügen, Reden halten' },
  { name: 'Schwimmen', kategorie: 'fertigkeit', a1: 'GEW', a2: 'KRA', beschreibung: 'Schwimmen, Tauchen, Wasserverhalten' },
  { name: 'Seefahrt', kategorie: 'fertigkeit', a1: 'GEW', a2: 'KON', beschreibung: 'Schiffe führen, Segel, Navigation auf dem Wasser' },
  { name: 'Straßenkunde', kategorie: 'fertigkeit', a1: 'HIN', a2: 'CHA', beschreibung: 'Ortsunkundig zurechtfinden, Kontakte finden' },
  { name: 'Tierführung', kategorie: 'fertigkeit', a1: 'CHA', a2: 'HIN', beschreibung: 'Tiere verstehen, abrichten, führen' },
  { name: 'Überleben', kategorie: 'fertigkeit', a1: 'HIN', a2: 'KON', beschreibung: 'In der Wildnis überleben, Lager, Feuer' },
  { name: 'Wahrnehmung', kategorie: 'fertigkeit', a1: 'HIN', a2: 'MUT', beschreibung: 'Umgebung wahrnehmen, Details bemerken' },
  { name: 'Zähigkeit', kategorie: 'fertigkeit', a1: 'KON', a2: 'KRA', beschreibung: 'Schmerz ertragen, Ausdauer, Belastbarkeit' },
  { name: 'Handgemenge', kategorie: 'kampf', a1: 'GEW', a2: 'KRA', beschreibung: 'Kampf ohne Waffen (Faustkampf, Würgegriffe)' },
  { name: 'Hiebwaffen', kategorie: 'kampf', a1: 'GEW', a2: 'KRA', beschreibung: 'Kampf mit Hiebwaffen (Streitkolben, Äxte)' },
  { name: 'Kettenwaffen', kategorie: 'kampf', a1: 'GEW', a2: 'KRA', beschreibung: 'Kampf mit Kettenwaffen (Kettenstäbe, Flegel)' },
  { name: 'Klingenwaffen', kategorie: 'kampf', a1: 'GEW', a2: 'KRA', beschreibung: 'Kampf mit Klingenwaffen (Schwerter, Dolche)' },
  { name: 'Schusswaffen', kategorie: 'kampf', a1: 'FF', a2: 'GEW', beschreibung: 'Kampf mit Schusswaffen (Bögen, Armbrüste)' },
  { name: 'Stangenwaffen', kategorie: 'kampf', a1: 'GEW', a2: 'KRA', beschreibung: 'Kampf mit Stangenwaffen (Speere, Hellebarden)' },
  { name: 'Wurfwaffen', kategorie: 'kampf', a1: 'FF', a2: 'GEW', beschreibung: 'Kampf mit Wurfwaffen (Wurfmesser, Speere)' },
  { name: 'Bannmagie', kategorie: 'magie', a1: 'MUT', a2: 'MYS', beschreibung: 'Magie des Verbannens und Bindens' },
  { name: 'Beherrschungsmagie', kategorie: 'magie', a1: 'CHA', a2: 'MYS', beschreibung: 'Magie der Beeinflussung und Kontrolle' },
  { name: 'Bewegungsmagie', kategorie: 'magie', a1: 'FF', a2: 'MYS', beschreibung: 'Magie der Bewegung und Telekinese' },
  { name: 'Erkenntnismagie', kategorie: 'magie', a1: 'INT', a2: 'MYS', beschreibung: 'Magie der Wahrnehmung und des Wissens' },
  { name: 'Felsmagie', kategorie: 'magie', a1: 'KRA', a2: 'MYS', beschreibung: 'Magie des Steins und der Erde' },
  { name: 'Feuermagie', kategorie: 'magie', a1: 'MUT', a2: 'MYS', beschreibung: 'Magie des Feuers und der Hitze' },
  { name: 'Heilungsmagie', kategorie: 'magie', a1: 'INT', a2: 'MYS', beschreibung: 'Magie des Heilens und der Lebenskraft' },
  { name: 'Illusionsmagie', kategorie: 'magie', a1: 'CHA', a2: 'MYS', beschreibung: 'Magie der Täuschung und Scheinwelten' },
  { name: 'Kampfmagie', kategorie: 'magie', a1: 'MUT', a2: 'MYS', beschreibung: 'Magie der Kampfunterstützung und Schutz' },
  { name: 'Lichtmagie', kategorie: 'magie', a1: 'HIN', a2: 'MYS', beschreibung: 'Magie des Lichts und der Reinigung' },
  { name: 'Naturmagie', kategorie: 'magie', a1: 'HIN', a2: 'MYS', beschreibung: 'Magie der Natur und der Elemente' },
  { name: 'Raummagie', kategorie: 'magie', a1: 'INT', a2: 'MYS', beschreibung: 'Magie des Raums und der Teleportation' },
  { name: 'Schattenmagie', kategorie: 'magie', a1: 'MUT', a2: 'MYS', beschreibung: 'Magie der Schatten und Verbergung' },
  { name: 'Schicksalsmagie', kategorie: 'magie', a1: 'HIN', a2: 'MYS', beschreibung: 'Magie des Schicksals und der Vorhersage' },
  { name: 'Schutzmagie', kategorie: 'magie', a1: 'KON', a2: 'MYS', beschreibung: 'Magie des Schutzes und der Abwehr' },
  { name: 'Stärkungsmagie', kategorie: 'magie', a1: 'KRA', a2: 'MYS', beschreibung: 'Magie der Verstärkung und Kraft' },
  { name: 'Todesmagie', kategorie: 'magie', a1: 'MUT', a2: 'MYS', beschreibung: 'Magie des Todes und der Geisterwelt' },
  { name: 'Verwandlungsmagie', kategorie: 'magie', a1: 'CHA', a2: 'MYS', beschreibung: 'Magie der Verwandlung und Formveränderung' },
  { name: 'Wassermagie', kategorie: 'magie', a1: 'HIN', a2: 'MYS', beschreibung: 'Magie des Wassers und der Strömungen' },
  { name: 'Windmagie', kategorie: 'magie', a1: 'FF', a2: 'MYS', beschreibung: 'Magie des Windes und der Luft' },
];

const STRENGTH_SEED = [
  { id: 'staerke_zaeh', name: 'Zäh', description: '+1 Widerstand gegen physische Angriffe', config: '{}' },
  { id: 'staerke_schnell', name: 'Schnell', description: '+1 Initiative in der ersten Kampfrunde', config: '{}' },
  { id: 'staerke_scharfsinn', name: 'Scharfsinn', description: '+1 auf alle Wahrnehmungsproben', config: '{}' },
  { id: 'staerke_charisma', name: 'Charisma', description: '+1 auf soziale Proben', config: '{}' },
];

const DERIVED_VALUE_SEED = [
  { name: 'Lebenspunkte', description: 'Maximale Lebensenergie eines Charakters', formel: '( GK + KON ) * 5' },
  { name: 'Focus', description: 'Magische Fokuskraft eines Charakters', formel: '( MYS + MYS ) * 3' },
  { name: 'Spirit', description: 'Geistige Kraftquelle für Magie und Wunder', formel: '( HIN + HIN ) * 3' },
  { name: 'Verteidigung', description: 'Basiswert zum Abwehren von Angriffen', formel: '12 + GE + INT + ( 5 - GK ) * 2' },
  { name: 'Körperlicher Widerstand', description: 'Widerstand gegen körperliche Effekte und Schaden', formel: '12 + KRA + KON' },
  { name: 'Geistiger Widerstand', description: 'Widerstand gegen geistige Effekte und Kontrolle', formel: '12 + MUT + KON' },
  { name: 'Schadensschwelle', description: 'Ab diesem Schaden wird der Charakter beeinträchtigt', formel: 'GK - 3 + KON' },
  { name: 'Initiative', description: 'Reihenfolge im Kampf; 1d10 wird gewürfelt', formel: '20 - INT - GE - 1d10' },
];

async function syncDerivedValues() {
  const existing = await db.select().from(derivedValues);
  const currentSignatures = existing.map((e) => {
    let formel = '';
    if (e.config) {
      try {
        const cfg = JSON.parse(e.config);
        formel = typeof cfg.formel === 'string' ? cfg.formel : '';
      } catch {
        formel = e.config;
      }
    }
    return JSON.stringify({ name: e.name, description: e.description ?? '', formel });
  });
  const targetSignatures = DERIVED_VALUE_SEED.map((e) =>
    JSON.stringify({ name: e.name, description: e.description, formel: e.formel }),
  );
  const matches =
    existing.length === DERIVED_VALUE_SEED.length &&
    targetSignatures.every((sig) => currentSignatures.includes(sig));
  if (matches) return;

  const now = Date.now();
  await db.delete(derivedValues);
  for (const entry of DERIVED_VALUE_SEED) {
    await db.insert(derivedValues).values({
      id: randomUUID(),
      name: entry.name,
      description: entry.description,
      config: JSON.stringify({ formel: entry.formel }),
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`Seed: synced derived values (${DERIVED_VALUE_SEED.length})`);
}

export async function seedIfNeeded(): Promise<void> {
  const now = Date.now();

  if (await isEmpty(resources)) {
    for (const name of ['Lebensenergie', 'Ausdauer', 'Astralkraft']) {
      await db.insert(resources).values({ id: randomUUID(), name, createdAt: now, updatedAt: now });
    }
  }

  if (await isEmpty(items)) {
    for (const name of ['Heiltrank', 'Ration', 'Seil']) {
      await db.insert(items).values({ id: randomUUID(), name, createdAt: now, updatedAt: now });
    }
  }

  await syncDerivedValues();

  if (await isEmpty(races)) {
    const raceData = [
      { name: 'Mensch', config: JSON.stringify({ vorteile: ['Anpassungsfähig'], nachteile: ['Keine'], groessenklasse: 3 }) },
      { name: 'Elf', config: JSON.stringify({ vorteile: ['Nachtsicht'], nachteile: ['Empfindlich gegen Eisen'], groessenklasse: 2 }) },
    ];
    for (const entry of raceData) {
      await db.insert(races).values({ id: randomUUID(), ...entry, createdAt: now, updatedAt: now });
    }
  }

  if (await isEmpty(cultures)) {
    for (const name of ['Mittelreich', 'Waldelfen']) {
      await db.insert(cultures).values({ id: randomUUID(), name, createdAt: now, updatedAt: now });
    }
  }

  if (await isEmpty(spells)) {
    const spellData = [
      { name: 'Flimmer', config: JSON.stringify({ level: 0 }) },
      { name: 'Blitz', config: JSON.stringify({ level: 1 }) },
      { name: 'Heilung', config: JSON.stringify({ level: 2 }) },
    ];
    for (const entry of spellData) {
      await db.insert(spells).values({ id: randomUUID(), ...entry, createdAt: now, updatedAt: now });
    }
  }

  if (await isEmpty(masteries)) {
    for (const name of ['Meisterschlag', 'Zauberfokus']) {
      await db.insert(masteries).values({ id: randomUUID(), name, createdAt: now, updatedAt: now });
    }
  }

  if (await isEmpty(statblocks)) {
    const statblockData = [
      { name: 'Krieger', config: JSON.stringify({ KO: 14, KK: 14, GE: 12, IN: 10, CH: 10, MU: 10 }) },
      { name: 'Magier', config: JSON.stringify({ KO: 10, KK: 10, GE: 12, IN: 14, CH: 12, MU: 14 }) },
    ];
    for (const entry of statblockData) {
      await db.insert(statblocks).values({ id: randomUUID(), ...entry, createdAt: now, updatedAt: now });
    }
  }

  if (await isEmpty(skills)) {
    for (const s of SKILL_SEED) {
      const id = skillId(s.name);
      const cfg = JSON.stringify({ kategorie: s.kategorie, maxWert: '18', attribut1: s.a1, attribut2: s.a2, beschreibung: s.beschreibung });
      await db.insert(skills).values({
        id,
        name: s.name,
        type: s.kategorie,
        description: s.beschreibung,
        config: cfg,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (await isEmpty(strengths)) {
    for (const s of STRENGTH_SEED) {
      await db.insert(strengths).values({ ...s, createdAt: now, updatedAt: now });
    }
  }

  console.log('Seed completed.');
}
