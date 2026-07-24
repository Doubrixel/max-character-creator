import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

interface ChoiceItem {
  type: 'skill' | 'resource'
  name: string
  value: number
}

type Choice = ChoiceItem[]
type Row = Choice[]

interface Origin {
  id: string
  name: string
  rows: Row[]
}

interface SocialClass {
  id: string
  name: string
  origins: Origin[]
}

function sk(name: string, value = 3): ChoiceItem { return { type: 'skill', name, value } }
function res(name: string, value = 1): ChoiceItem { return { type: 'resource', name, value } }

const socialClasses: SocialClass[] = [
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
        [[sk('Heilkunde')], [sk('Heilungsmagie')]],
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
        [[sk('Heilungsmagie')], [sk('Arkane Kunde')]],
        [[sk('Geschichten und Mythen')], [sk('Heilungsmagie')]],
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
        [[sk('Anführen')], [sk('Heilungsmagie')]],
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
        [[sk('Kampf')], [sk('Heilungsmagie')]],
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

function choiceKey(choice: Choice): string {
  return choice.map((c) => `${c.name}:${c.value}`).join('+')
}

function choiceLabel(choice: Choice): string {
  return choice.map((c) => `${c.name} ${'I'.repeat(c.value)}`).join(' + ')
}

interface SchicksalStepProps {
  onValid: (valid: boolean) => void
}

type Phase = 'class' | 'origin' | 'choices'

export default function SchicksalStep({ onValid }: SchicksalStepProps) {
  const { stepDeltas, currentStep, updateStepDelta } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const initializedRef = useRef(false)

  const [classId, setClassId] = useState<string | null>(null)
  const [originId, setOriginId] = useState<string | null>(null)
  const [rowSelections, setRowSelections] = useState<Record<number, string>>({})

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const d = stepData as Record<string, unknown> | null
    if (d) {
      setClassId((d.classId as string) ?? null)
      setOriginId((d.originId as string) ?? null)
      setRowSelections((d.rowSelections as Record<number, string>) ?? {})
    }
  }, [stepData])

  useEffect(() => () => { initializedRef.current = false }, [])

  const currentClass = socialClasses.find((c) => c.id === classId) ?? null
  const currentOrigin = currentClass?.origins.find((o) => o.id === originId) ?? null

  const phase: Phase = !classId ? 'class' : !originId ? 'origin' : 'choices'

  const allRowsSelected = currentOrigin
    ? currentOrigin.rows.every((row) => row.length === 0 || rowSelections[currentOrigin.rows.indexOf(row)] !== undefined)
    : false

  useEffect(() => {
    onValid(phase === 'choices' && allRowsSelected)
  }, [phase, allRowsSelected, onValid])

  const persist = (cId: string | null, oId: string | null, rs: Record<number, string>) => {
    const cl = socialClasses.find((c) => c.id === cId) ?? null
    const or = cl?.origins.find((o) => o.id === oId) ?? null
    updateStepDelta(1, {
      classId: cId,
      className: cl?.name ?? null,
      originId: oId,
      originName: or?.name ?? null,
      rowSelections: rs,
    })
  }

  const handleClassSelect = (id: string) => {
    setClassId(id)
    setOriginId(null)
    setRowSelections({})
    persist(id, null, {})
  }

  const handleOriginSelect = (id: string) => {
    setOriginId(id)
    setRowSelections({})
    persist(classId, id, {})
  }

  const handleRowChoice = (rowIdx: number, choiceKey_: string) => {
    const next = { ...rowSelections, [rowIdx]: choiceKey_ }
    setRowSelections(next)
    persist(classId, originId, next)
  }

  const rollD6 = () => Math.floor(Math.random() * 6) + 1

  const handleRollClass = () => {
    const idx = rollD6() - 1
    handleClassSelect(socialClasses[idx].id)
  }

  const handleRollOrigin = () => {
    if (!currentClass) return
    const idx = rollD6() - 1
    handleOriginSelect(currentClass.origins[idx].id)
  }

  return (
    <div style={styles.container}>
      {phase === 'class' && (
        <>
          <div style={styles.phaseHeader}>
            <h3 style={styles.phaseTitle}>Soziale Herkunft</h3>
            <button style={styles.rollButton} onClick={handleRollClass}>🎲 Würfeln</button>
          </div>
          <div style={styles.grid3}>
            {socialClasses.map((sc) => (
              <button
                key={sc.id}
                style={{ ...styles.classCard, ...(classId === sc.id ? styles.classCardSelected : {}) }}
                onClick={() => handleClassSelect(sc.id)}
              >
                <span style={styles.className}>{sc.name}</span>
                <span style={styles.classCount}>1–6</span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'origin' && currentClass && (
        <>
          <div style={styles.phaseHeader}>
            <div style={styles.breadcrumb}>
              <span style={styles.breadcrumbActive}>{currentClass.name}</span>
              <span style={styles.breadcrumbSep}>›</span>
              <span style={styles.breadcrumbMuted}>Herkunft wählen</span>
            </div>
            <button style={styles.rollButton} onClick={handleRollOrigin}>🎲 Würfeln</button>
          </div>
          <div style={styles.grid3}>
            {currentClass.origins.map((o, i) => (
              <button
                key={o.id}
                style={{ ...styles.classCard, ...(originId === o.id ? styles.classCardSelected : {}) }}
                onClick={() => handleOriginSelect(o.id)}
              >
                <span style={styles.originNum}>{i + 1}</span>
                <span style={styles.className}>{o.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'choices' && currentOrigin && (
        <>
          <div style={styles.phaseHeader}>
            <div style={styles.breadcrumb}>
              <span style={styles.breadcrumbActive}>{currentClass?.name}</span>
              <span style={styles.breadcrumbSep}>›</span>
              <span style={styles.breadcrumbActive}>{currentOrigin.name}</span>
            </div>
          </div>
          <div style={styles.choicesContainer}>
            {currentOrigin.rows.map((row, rowIdx) => {
              if (row.length === 0) return null
              const selected = rowSelections[rowIdx]
              return (
                <div key={rowIdx} style={styles.rowBlock}>
                  <div style={styles.rowLabel}>Zeile {rowIdx + 1}</div>
                  <div style={styles.rowOptions}>
                    {row.map((choice) => {
                      const key = choiceKey(choice)
                      const isSelected = selected === key
                      return (
                        <button
                          key={key}
                          style={{ ...styles.choiceChip, ...(isSelected ? styles.choiceChipSelected : {}) }}
                          onClick={() => handleRowChoice(rowIdx, key)}
                        >
                          {choiceLabel(choice)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minHeight: 300,
  },
  phaseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 15,
  },
  breadcrumbActive: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  breadcrumbSep: {
    color: 'var(--text-muted)',
  },
  breadcrumbMuted: {
    color: 'var(--text-secondary)',
  },
  rollButton: {
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  classCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  classCardSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
    boxShadow: '0 0 12px var(--shadow-accent)',
  },
  className: {
    fontSize: 15,
    fontWeight: 600,
  },
  classCount: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 4,
  },
  originNum: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--accent)',
    marginBottom: 4,
  },
  choicesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  rowBlock: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '14px 18px',
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  rowOptions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  choiceChip: {
    padding: '8px 18px',
    fontSize: 14,
    fontWeight: 500,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  choiceChipSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
    boxShadow: '0 0 8px var(--shadow-accent)',
  },
}
