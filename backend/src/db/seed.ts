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
} from './schema';

async function seed() {
  const now = Date.now();

  // Resources
  for (const name of ['Lebensenergie', 'Ausdauer', 'Astralkraft']) {
    const existing = await db.select().from(resources).where((r) => r.name.eq(name));
    if (existing.length === 0) {
      await db.insert(resources).values({ id: randomUUID(), name, createdAt: now, updatedAt: now });
    }
  }

  // Items
  for (const name of ['Heiltrank', 'Ration', 'Seil']) {
    const existing = await db.select().from(items).where((i) => i.name.eq(name));
    if (existing.length === 0) {
      await db.insert(items).values({ id: randomUUID(), name, createdAt: now, updatedAt: now });
    }
  }

  // Derived Values
  const derivedData = [
    { name: 'Lebenspunkte', config: '10+KO*2' },
    { name: 'Astralenergie', config: 'KL+IN+MU' },
    { name: 'Karmaenergie', config: 'KO+IN+CH' },
  ];
  for (const entry of derivedData) {
    const existing = await db.select().from(derivedValues).where((d) => d.name.eq(entry.name));
    if (existing.length === 0) {
      await db.insert(derivedValues).values({ id: randomUUID(), ...entry, createdAt: now, updatedAt: now });
    }
  }

  // Races
  const raceData = [
    { name: 'Mensch', config: JSON.stringify({ vorteile: ['Anpassungsfähig'], nachteile: ['Keine'] }) },
    { name: 'Elf', config: JSON.stringify({ vorteile: ['Nachtsicht'], nachteile: ['Empfindlich gegen Eisen'] }) },
  ];
  for (const entry of raceData) {
    const existing = await db.select().from(races).where((r) => r.name.eq(entry.name));
    if (existing.length === 0) {
      await db.insert(races).values({ id: randomUUID(), ...entry, createdAt: now, updatedAt: now });
    }
  }

  // Cultures
  for (const name of ['Mittelreich', 'Waldelfen']) {
    const existing = await db.select().from(cultures).where((c) => c.name.eq(name));
    if (existing.length === 0) {
      await db.insert(cultures).values({ id: randomUUID(), name, createdAt: now, updatedAt: now });
    }
  }

  // Spells
  const spellData = [
    { name: 'Flimmer', config: JSON.stringify({ level: 0 }) },
    { name: 'Blitz', config: JSON.stringify({ level: 1 }) },
    { name: 'Heilung', config: JSON.stringify({ level: 2 }) },
  ];
  for (const entry of spellData) {
    const existing = await db.select().from(spells).where((s) => s.name.eq(entry.name));
    if (existing.length === 0) {
      await db.insert(spells).values({ id: randomUUID(), ...entry, createdAt: now, updatedAt: now });
    }
  }

  // Masteries
  for (const name of ['Meisterschlag', 'Zauberfokus']) {
    const existing = await db.select().from(masteries).where((m) => m.name.eq(name));
    if (existing.length === 0) {
      await db.insert(masteries).values({ id: randomUUID(), name, createdAt: now, updatedAt: now });
    }
  }

  // Statblocks
  const statblockData = [
    { name: 'Krieger', config: JSON.stringify({ KO: 14, KK: 14, GE: 12, IN: 10, CH: 10, MU: 10 }) },
    { name: 'Magier', config: JSON.stringify({ KO: 10, KK: 10, GE: 12, IN: 14, CH: 12, MU: 14 }) },
  ];
  for (const entry of statblockData) {
    const existing = await db.select().from(statblocks).where((s) => s.name.eq(entry.name));
    if (existing.length === 0) {
      await db.insert(statblocks).values({ id: randomUUID(), ...entry, createdAt: now, updatedAt: now });
    }
  }

  // Skills
  const skillData = [
    { name: 'Nahkampf', type: 'weapon' },
    { name: 'Fernkampf', type: 'weapon' },
    { name: 'Überreden', type: 'talent' },
    { name: 'Magiekunde', type: 'talent' },
    { name: 'Feuer', type: 'magic' },
  ];
  for (const entry of skillData) {
    const existing = await db.select().from(skills).where((s) => s.name.eq(entry.name));
    if (existing.length === 0) {
      await db.insert(skills).values({ id: randomUUID(), ...entry, createdAt: now, updatedAt: now });
    }
  }

  console.log('Seed completed.');
}

seed().catch(console.error);
