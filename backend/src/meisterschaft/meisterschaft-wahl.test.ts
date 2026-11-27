import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MEISTERSCHAFTS_SKILL_SCHWELLE,
  istMeisterschaftsRelevanteKategorie,
  masteryMatchesSkill,
  parseVoraussetzungMinWert,
} from '@mcc/shared';
import type { MasteryChoiceInfo, MasterySkillInfo } from '@mcc/shared';

/**
 * INT-000020: Regression zum TC-11-Befund (PO-Klärung). Im Schritt
 * „9. Meisterschaften" des Erstellungs-Wizards muss für jede Fertigkeit,
 * die die konfigurierte Schwelle/Voraussetzung einer verfügbaren
 * Meisterschaft erfüllt, ein Auswahlfeld angeboten werden. Die
 * Hinweismeldung „keine Fertigkeit erfüllt die Schwelle" darf nur
 * erscheinen, wenn sie zutrifft.
 *
 * Szenarien laut PO-Entscheidung: Fertigkeit exakt auf Schwellenwert,
 * Meisterschaft ohne blockierende Voraussetzung, Auswahl möglich;
 * blockierende Voraussetzungen blockieren weiterhin.
 * Alle Daten sind synthetisch.
 */

const AKROBATIK: MasterySkillInfo = { id: 'akrobatik', name: 'Akrobatik', category: 'fertigkeit' };
const WISSEN: MasterySkillInfo = { id: 'wissen', name: 'Wissen', category: 'fertigkeit' };
const KLINGENWAFFEN: MasterySkillInfo = { id: 'klingenwaffen', name: 'Klingenwaffen', category: 'kampf' };
const HEILUNGSMAGIE: MasterySkillInfo = { id: 'heilungsmagie', name: 'Heilungsmagie', category: 'magie' };

function formularMeisterschaft(overrides: Partial<MasteryChoiceInfo> = {}): MasteryChoiceInfo {
  return {
    id: 'm-qa',
    name: 'QA Meisterschaft Bonus',
    schwelle: '1',
    kategorieName: null,
    voraussetzungTyp: null,
    voraussetzungId: null,
    voraussetzungWert: null,
    ...overrides,
  };
}

test('Fertigkeit exakt auf Schwellenwert + Meisterschaft ohne Voraussetzung: Meisterschaft ist wählbar', () => {
  // Formularerstellte Meisterschaft (kein kategorie_name, keine Voraussetzung),
  // wie im QA-Lauf zu TC-11: Schwelle 1, Voraussetzung „Keine".
  const meisterschaft = formularMeisterschaft();

  assert.equal(
    masteryMatchesSkill(meisterschaft, AKROBATIK, MEISTERSCHAFTS_SKILL_SCHWELLE),
    true,
    'Bei Akrobatik = 6 (exakt Schwellenwert) muss die Meisterschaft für Akrobatik angeboten werden.',
  );
  // Für andere qualifizierende Fertigkeiten ebenfalls wählbar (keine Einschränkung konfiguriert).
  assert.equal(masteryMatchesSkill(meisterschaft, WISSEN, 6), true);
  assert.equal(masteryMatchesSkill(meisterschaft, KLINGENWAFFEN, 6), true);
  assert.equal(masteryMatchesSkill(meisterschaft, HEILUNGSMAGIE, 6), true);
});

test('Importierte Meisterschaft mit kategorie_name bleibt über den Namen zuordenbar', () => {
  const importiert = formularMeisterschaft({ kategorieName: 'Akrobatik' });
  assert.equal(masteryMatchesSkill(importiert, AKROBATIK, 6), true);
  assert.equal(masteryMatchesSkill(importiert, WISSEN, 6), false);
});

test('Skill-basierte Voraussetzung begrenzt die Meisterschaft auf die genannte Fertigkeit', () => {
  const mitVoraussetzung = formularMeisterschaft({
    voraussetzungTyp: 'skill >= wert',
    voraussetzungId: 'akrobatik',
    voraussetzungWert: '6',
  });

  // Akrobatik = 6 erfüllt „Akrobatik >= 6" → wählbar (Vorlauf zu TC-11 blockierte dies fälschlich).
  assert.equal(masteryMatchesSkill(mitVoraussetzung, AKROBATIK, 6), true);
  assert.equal(masteryMatchesSkill(mitVoraussetzung, AKROBATIK, 7), true);
  // Andere Fertigkeiten: nicht wählbar.
  assert.equal(masteryMatchesSkill(mitVoraussetzung, WISSEN, 10), false);
  // Blockierende Voraussetzung: Mindestwert nicht erreicht → nicht wählbar.
  assert.equal(masteryMatchesSkill(mitVoraussetzung, AKROBATIK, 5), false);
  // Zuordnung auch über den Fertigkeitsnamen (statt ID) möglich.
  assert.equal(
    masteryMatchesSkill(
      { ...mitVoraussetzung, voraussetzungId: 'Akrobatik' },
      AKROBATIK,
      6,
    ),
    true,
  );
});

test('Nicht verifizierbare Voraussetzungstypen und Schwelle ungleich 1 blockieren weiterhin', () => {
  assert.equal(
    masteryMatchesSkill(formularMeisterschaft({ voraussetzungTyp: 'meisterschaft', voraussetzungId: 'Meisterhieb' }), AKROBATIK, 10),
    false,
    'Voraussetzung „Meisterschaft" kann hier nicht verifiziert werden und blockiert.',
  );
  assert.equal(
    masteryMatchesSkill(formularMeisterschaft({ voraussetzungTyp: 'schwerpunkt', voraussetzungId: 'Wetter' }), AKROBATIK, 10),
    false,
  );
  assert.equal(
    masteryMatchesSkill(formularMeisterschaft({ schwelle: '2' }), AKROBATIK, 10),
    false,
    'Nur Pflicht-Meisterschaften mit Schwelle 1 sind hier wählbar.',
  );
});

test('Gruppenlogik für Kampf- und Magie-Meisterschaften bleibt erhalten', () => {
  const allgemeineNahkampf = formularMeisterschaft({ kategorieName: 'Allgemeine Nahkampfmeisterschaften' });
  assert.equal(masteryMatchesSkill(allgemeineNahkampf, KLINGENWAFFEN, 6), true);
  assert.equal(
    masteryMatchesSkill(allgemeineNahkampf, { id: 'schusswaffen', name: 'Schusswaffen', category: 'kampf' }, 6),
    false,
    'Ausnahmen (Schuss-/Wurfwaffen) erhalten weiterhin keine allgemeine Nahkampfmeisterschaft.',
  );

  const allgemeineMagie = formularMeisterschaft({ kategorieName: 'Allgemeine Magieschulen-Meisterschaften' });
  assert.equal(masteryMatchesSkill(allgemeineMagie, HEILUNGSMAGIE, 6), true);
  assert.equal(masteryMatchesSkill(allgemeineMagie, AKROBATIK, 6), false);
});

test('Schwellenwert-Konstante und Hilfsfunktionen', () => {
  assert.equal(MEISTERSCHAFTS_SKILL_SCHWELLE, 6);
  assert.equal(istMeisterschaftsRelevanteKategorie('fertigkeit'), true);
  assert.equal(istMeisterschaftsRelevanteKategorie('kampf'), true);
  assert.equal(istMeisterschaftsRelevanteKategorie('magie'), true);
  assert.equal(istMeisterschaftsRelevanteKategorie('wissen'), false);
  assert.equal(parseVoraussetzungMinWert('6'), 6);
  assert.equal(parseVoraussetzungMinWert('0'), 0);
  assert.equal(parseVoraussetzungMinWert(''), null);
  assert.equal(parseVoraussetzungMinWert('abc'), null);
  assert.equal(parseVoraussetzungMinWert(null), null);
  assert.equal(parseVoraussetzungMinWert(undefined), null);
});
