import {
  MSG_STAERKE_STUFE,
  eingabeWert,
  formatAlternative,
  pruefeGruppeImKontext,
  pruefeStaerkeWert,
  staerkenOptionen,
  type KulturAlternative,
  type KulturFeld,
  type KulturGruppenEintrag,
  type KulturRegeln,
  type StaerkeOption,
} from '@mcc/shared'

interface SkillOption {
  id: string
  name: string
  type: string
}

interface CultureAlternativesProps {
  /**
   * Die im Editor gepflegte Kultur (Abschnitte und Entweder/Oder-Gruppen).
   * Rendert werden `regeln.alternativen`; die Abschnitte braucht die
   * Live-Prüfung an der Gruppe für R6 (Eintrag nicht zugleich in Abschnitt
   * und Gruppe).
   */
  regeln: KulturRegeln
  onChange: (neu: KulturAlternative[]) => void
  onGruppeEntfernen: (index: number) => void
  skills: SkillOption[]
  strengths: StaerkeOption[]
  kostenById: Record<string, number>
  onFehler: (meldung: string) => void
  /**
   * Im Formular sichtbare Fehlermeldung (Banner). Steht dort bereits dieselbe
   * Meldung, wird sie an der Gruppe nicht ein zweites Mal angezeigt.
   */
  formError: string | null
}

function feldAusSkillTyp(type: string): KulturFeld {
  if (type === 'kampf') return 'waffenTalente'
  if (type === 'magie') return 'magieSchulen'
  return 'talente'
}

function klon(alternativen: KulturAlternative[]): KulturAlternative[] {
  return alternativen.map(alternative => ({
    ...alternative,
    seiten: [
      alternative.seiten[0].map(eintrag => ({ ...eintrag })),
      alternative.seiten[1].map(eintrag => ({ ...eintrag })),
    ] as [KulturGruppenEintrag[], KulturGruppenEintrag[]],
  }))
}

/**
 * Alternativpflege der Kulturen: verwaltet die Entweder/Oder-Gruppen mit den
 * Seiten „Seite 1" und „Seite 2" (R3/R4, K4.1–K4.3). Direkt an jeder Gruppe
 * steht die Live-Meldung, solange sie noch nicht speicherbar ist – dieselbe
 * Prüfung wie beim Speichern (`pruefeGruppeImKontext`): unvollständige oder
 * ungleichwertige Seiten, Bruchwerte (G) und ein Eintrag, der zugleich im
 * Abschnitt oder in einer weiteren Gruppe steht (R6/H).
 */
export default function CultureAlternatives({
  regeln,
  onChange,
  onGruppeEntfernen,
  skills,
  strengths,
  kostenById,
  onFehler,
  formError,
}: CultureAlternativesProps) {
  const alternativen = regeln.alternativen

  const eintragHinzufuegen = (gi: number, si: number) => {
    const alternative = alternativen[gi]
    if (!alternative) return
    // Stärken-Gruppen haben je Seite genau eine Stärke (K2a).
    if (alternative.typ === 'staerke' && alternative.seiten[si].length >= 1) return
    const neu = klon(alternativen)
    neu[gi].seiten[si].push({
      feld: alternative.typ === 'staerke' ? 'staerken' : 'talente',
      id: '',
      name: '',
      wert: 0,
    })
    onChange(neu)
  }

  const eintragEntfernen = (gi: number, si: number, ei: number) => {
    const neu = klon(alternativen)
    neu[gi].seiten[si].splice(ei, 1)
    onChange(neu)
  }

  const wertSetzen = (gi: number, si: number, ei: number, roh: string) => {
    const alternative = alternativen[gi]
    const eintrag = alternative?.seiten[si][ei]
    if (!alternative || !eintrag) return
    const wert = eingabeWert(roh)
    if (alternative.typ === 'staerke') {
      // Auch der Wert 0 ist bei zugewiesener Stärke unzulässig (R1).
      const fehler = pruefeStaerkeWert(eintrag.id, wert, kostenById)
      if (fehler) {
        onFehler(fehler)
        return
      }
    }
    const neu = klon(alternativen)
    neu[gi].seiten[si][ei].wert = wert
    onChange(neu)
  }

  const eintragWaehlen = (gi: number, si: number, ei: number, newId: string) => {
    const alternative = alternativen[gi]
    const eintrag = alternative?.seiten[si][ei]
    if (!alternative || !eintrag) return

    if (alternative.typ === 'staerke') {
      const kosten = kostenById[newId]
      if (newId !== '' && kosten !== undefined && kosten !== 1) {
        onFehler(MSG_STAERKE_STUFE)
        return
      }
      const staerkeOption = strengths.find(option => option.id === newId)
      const neu = klon(alternativen)
      neu[gi].seiten[si][ei] = {
        ...eintrag,
        id: newId,
        name: newId === '' ? '' : staerkeOption?.name || newId,
        // Zugewiesene Stärke steht immer auf Stufe 1 (R1) – ein Wert von 0
        // würde die Gruppe unspielbar machen.
        wert: newId === '' ? eintrag.wert : 1,
      }
      onChange(neu)
      return
    }

    const skill = skills.find(option => option.id === newId)
    const neu = klon(alternativen)
    neu[gi].seiten[si][ei] = {
      ...eintrag,
      id: newId,
      name: newId === '' ? '' : skill?.name || newId,
      feld: skill ? feldAusSkillTyp(skill.type) : eintrag.feld,
    }
    onChange(neu)
  }

  return (
    <fieldset style={styles.container}>
      <legend style={styles.legend}>Entweder/Oder-Gruppen</legend>
      {alternativen.length === 0 ? (
        <p style={styles.empty}>
          Noch keine Entweder/Oder-Gruppe angelegt. Lege am Eintrag eines Talents
          oder einer Stärke eine Alternative an.
        </p>
      ) : (
        alternativen.map((alternative, gi) => {
          const istStaerke = alternative.typ === 'staerke'
          // Live-Prüfung direkt an der Gruppe, im Kontext der Kultur (R3/K2c,
          // G, R1, R4 und die Zuordnung R6/H) – dieselbe Meldung wie beim
          // Speichern. Die im Banner sichtbare Meldung wird hier nicht wiederholt.
          const liveMeldung = pruefeGruppeImKontext(regeln, gi, kostenById)
          const zeigeMeldung = liveMeldung !== null && liveMeldung !== formError
          return (
            <div key={gi} style={styles.groupCard}>
              <div style={styles.groupSummary}>{formatAlternative(alternative)}</div>
              {zeigeMeldung && (
                <div role="alert" style={styles.groupError}>{liveMeldung}</div>
              )}
              {alternative.seiten.map((seite, si) => (
                <fieldset key={si} style={styles.side}>
                  <legend style={styles.sideLegend}>Seite {si + 1}</legend>
                  {seite.length === 0 && (
                    <p style={styles.emptySide}>Noch kein Eintrag auf dieser Seite.</p>
                  )}
                  {seite.map((eintrag, ei) => (
                    <div key={ei} style={styles.rowItem}>
                      <div style={styles.row}>
                        <select
                          style={{ ...styles.input, flex: 2 }}
                          aria-label={`Seite ${si + 1} Eintrag ${ei + 1} ${istStaerke ? 'Stärke' : 'Skill'} wählen`}
                          value={eintrag.id}
                          onChange={e => eintragWaehlen(gi, si, ei, e.target.value)}
                        >
                          <option value="">{istStaerke ? 'Stärke wählen...' : 'Skill wählen...'}</option>
                          {/* INT-000017 R3: Dieselbe gefilterte Optionsliste wie im
                              Abschnitt „Stärken" (staerkenOptionen); zugewiesene
                              Alt-Einträge bleiben sichtbar (R6). Die Prüfung in
                              eintragWaehlen bleibt unverändert. */}
                          {istStaerke
                            ? staerkenOptionen(strengths, eintrag.id).map(option => (
                                <option key={option.id} value={option.id}>{option.name}</option>
                              ))
                            : skills.map(option => (
                                <option key={option.id} value={option.id}>{option.name}</option>
                              ))}
                        </select>
                        <input
                          style={{ ...styles.input, flex: 1, textAlign: 'center' }}
                          type="number"
                          min={0}
                          max={18}
                          placeholder={istStaerke ? 'Anzahl' : 'Punkte'}
                          aria-label={`${istStaerke ? 'Anzahl' : 'Punkte'} ${eintrag.name || `Seite ${si + 1} Eintrag ${ei + 1}`}`}
                          value={eintrag.wert}
                          onChange={e => wertSetzen(gi, si, ei, e.target.value)}
                        />
                        <button
                          type="button"
                          style={styles.removeBtn}
                          aria-label={`Eintrag entfernen (Seite ${si + 1} Eintrag ${ei + 1})`}
                          onClick={() => eintragEntfernen(gi, si, ei)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!istStaerke || seite.length < 1) && (
                    <button
                      type="button"
                      style={styles.addEntryBtn}
                      onClick={() => eintragHinzufuegen(gi, si)}
                    >
                      + Eintrag hinzufügen
                    </button>
                  )}
                </fieldset>
              ))}
              <div style={styles.groupActions}>
                <button
                  type="button"
                  style={styles.removeGroupBtn}
                  onClick={() => onGruppeEntfernen(gi)}
                >
                  Gruppe entfernen
                </button>
              </div>
            </div>
          )
        })
      )}
    </fieldset>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 12,
    margin: 0,
    minWidth: 0,
  },
  legend: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    padding: '0 6px',
  },
  empty: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    margin: '4px 0 0',
    fontStyle: 'italic',
  },
  groupCard: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  groupSummary: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  groupError: {
    fontSize: 12,
    color: 'var(--danger)',
    margin: 0,
  },
  side: {
    border: '1px dashed var(--border)',
    borderRadius: 6,
    padding: 8,
    margin: 0,
    minWidth: 0,
  },
  sideLegend: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent)',
    padding: '0 6px',
  },
  emptySide: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: '0 0 6px',
    fontStyle: 'italic',
  },
  rowItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 6,
  },
  row: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 14,
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
    minWidth: 0,
  },
  removeBtn: {
    background: 'var(--danger)',
    border: 'none',
    color: '#fff',
    borderRadius: 4,
    width: 28,
    height: 28,
    cursor: 'pointer',
    fontSize: 18,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addEntryBtn: {
    background: 'transparent',
    border: '1px dashed var(--border)',
    borderRadius: 6,
    padding: '6px 16px',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text-secondary)',
    width: '100%',
  },
  groupActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  removeGroupBtn: {
    background: 'transparent',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 13,
  },
}
