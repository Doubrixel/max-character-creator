import { db } from '../db'
import {
  characters,
  characterSteps,
  characterSkills,
  characterResources,
  characterItems,
  characterSpells,
  characterMasteries,
  characterXpLog,
} from '../db/schema'

async function wipeCharacterData() {
  const tables = [
    characterXpLog,
    characterSpells,
    characterMasteries,
    characterItems,
    characterResources,
    characterSkills,
    characterSteps,
    characters,
  ]

  for (const table of tables) {
    await db.delete(table)
  }

  console.log('Character data wiped.')
}

wipeCharacterData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Wipe failed:', err)
    process.exit(1)
  })
