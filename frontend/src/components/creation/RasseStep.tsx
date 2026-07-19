import { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'

const races = [
  {
    id: 'mensch',
    name: 'Mensch',
    icon: '🧑',
    speciesLaw:
      'Menschen sind die vielseitigste Spezies in den Reichen. Ihre Anpassungsfähigkeit und ihr Ehrgeiz machen sie zu natürlichen Führern und Überlebenskünstlern. Menschen können in jeder Umgebung gedeihen und lernen schneller als andere Spezies. Ihre Lebensspanne ist kurz im Vergleich zu Elfen oder Zwergen, aber diese Vergänglichkeit treibt sie zu großen Taten an. Ein Mensch kann in einem einzigen Leben mehr erreichen als manche andere Spezies in drei. Ihre Kultur ist geprägt von Innovation, Handel und diplomatischem Geschick. In Konflikten sind Menschen oft die Vermittler, aber auch die Eroberer. Ihre Göttervielfalt spiegelt ihre innere Zerrissenheit wider – sie suchen ständig nach Bedeutung und Zweck. Speziesvorteil: Menschlicher Ehrgeiz – Einmal pro Abenteuer kann ein Mensch eine Fähigkeit wählen, die er noch nicht besitzt, und sie für eine Szene auf Basiswert nutzen.',
    statblock: {
      vorteile: ['+1 auf alle Attribute nach Wahl', 'Menschlicher Ehrgeiz (einmal pro Abenteuer)', 'Schnelle Anpassung'],
      nachteile: ['Geringere Lebensspanne', 'Keine speziesgebundenen Sonderfähigkeiten'],
    },
  },
  {
    id: 'elf',
    name: 'Elf',
    icon: '🧝',
    speciesLaw:
      'Elfen sind Kinder des Waldes und der alten Magie. Mit ihrer jahrhundertelangen Lebensspanne betrachten sie die Welt mit einer Gelassenheit, die andere Spezies als Arroganz missverstehen können. Ihre Verbindung zur Natur ist tief und spirituell. Elfen kommunizieren mit Pflanzen, Tieren und den Geistern des Waldes. Ihre Städte sind keine Ansammlungen von Gebäuden, sondern lebende Strukturen aus gewachsenem Holz und geformtem Stein. Elfische Magie ist intuitiv und fließend, weniger akademisch als die menschliche. Sie singen ihre Zauber, tanzen ihre Rituale und träumen ihre Prophezeiungen. Ein Elf vergisst nie eine Beleidigung, aber auch nie eine Freundlichkeit. Ihre Kunst ist unübertroffen, ihre Musik bringt selbst die härtesten Krieger zum Weinen. Speziesvorteil: Waldläufer – Elfen ignorieren schwieriges Gelände in natürlichen Umgebungen und können sich einmal pro Tag unsichtbar machen, solange sie still stehen.',
    statblock: {
      vorteile: ['+2 auf Wahrnehmung in Natur', 'Waldläufer-Fähigkeit', 'Resistenz gegen Charme'],
      nachteile: ['Verwundbar gegen Eisen', 'Langsame Fortpflanzung', 'Arroganz-Modifikator in sozialen Situationen mit Kurzlebenden'],
    },
  },
  {
    id: 'zwerg',
    name: 'Zwerg',
    icon: '⛏️',
    speciesLaw:
      'Zwerge sind die Meister der unterirdischen Künste. In ihren gewaltigen Bergfestungen schmieden sie Waffen von legendärer Qualität und hüten Geheimnisse, die älter sind als die meisten Zivilisationen an der Oberfläche. Ein Zwerg misst seinen Wert nicht an Worten, sondern an Taten – an der Qualität seiner Arbeit, der Tiefe seiner Minen und der Stärke seines Clans. Zwergische Gesellschaft ist streng hierarchisch, aber loyal bis ins Mark. Sie verraten niemals einen Clangehörigen und brechen niemals einen Eid. Ihre Handwerkskunst ist legendär: Jede zwergische Waffe ist ein Meisterwerk, jeder Panzer ein Kunstwerk. Zwerge haben ein angeborenes Verständnis für Metall, Stein und die verborgenen Kräfte der Erde. Sie können Erschütterungen im Gestein spüren, Adern wertvoller Metalle riechen und die Integrität einer Struktur mit einem Blick beurteilen. Speziesvorteil: Stein Sinn – Zwerge können verborgene Türen und Fallen in unterirdischen Umgebungen automatisch erkennen und erhalten +2 auf alle Widerstandswürfe gegen Gift.',
    statblock: {
      vorteile: ['+2 Widerstand gegen Gift', 'Stein Sinn (verborgene Türen/Fallen)', '+1 auf Handwerk mit Metall/Stein'],
      nachteile: ['-1 auf Schwimmen', 'Verwundbar gegen Blitzmagie', 'Sturheit (Nachteil bei diplomatischen Verhandlungen)'],
    },
  },
  {
    id: 'ork',
    name: 'Ork',
    icon: '👹',
    speciesLaw:
      'Orks sind die Krieger der öden Lande. In einer Welt, die sie ablehnt, haben sie gelernt, stärker, härter und entschlossener zu sein als alle anderen. Ihre Kultur ist geprägt von Stammesloyalität, Kampfesmut und einem tiefen Respekt vor Stärke – nicht nur physischer, sondern auch der Stärke des Charakters. Ein Ork, der seine Wut kontrollieren kann, ist gefährlicher als hundert, die ihr freien Lauf lassen. Orks sind nicht die Barbaren, als die sie oft dargestellt werden. Ihre Schamanen kommunizieren mit den Geistern der Ahnen, ihre Runenmeister binden uralte Kräfte in Waffen und Amulette, und ihre Strategen haben Armeen besiegt, die ihnen zahlenweit überlegen waren. Die Haut eines Orks ist zäh wie Leder, seine Knochen dick und widerstandsfähig. In der Schlacht sind Orks unerschütterlich – sie kennen keinen Schmerz, solange der Kampf tobt, und ihre Wut gibt ihnen Kraft über das normale Maß hinaus. Speziesvorteil: Kampfrausch – Einmal pro Kampf kann ein Ork, wenn er unter die Hälfte seiner Lebenspunkte fällt, für eine Runde +3 auf alle Angriffswürfe erhalten und temporäre Lebenspunkte gewinnen.',
    statblock: {
      vorteile: ['+2 auf Nahkampfangriffe', 'Kampfrausch (einmal pro Kampf)', 'Natürliche Rüstung (+1 Rüstungswert)'],
      nachteile: ['-2 auf soziale Proben in zivilisierten Gebieten', 'Verwundbar gegen Feuer', 'Weniger magiebegabt'],
    },
  },
]

interface RasseStepProps {
  onValid: (valid: boolean) => void
}

export default function RasseStep({ onValid }: RasseStepProps) {
  const { stepData, saveStep } = useAppContext()
  const [selected, setSelected] = useState<string | null>(
    (stepData as { race?: string } | null)?.race ?? null
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRace, setModalRace] = useState<typeof races[0] | null>(null)

  useEffect(() => {
    onValid(selected !== null)
  }, [selected, onValid])

  const handleSelect = (id: string) => {
    setSelected(id)
    saveStep(2, { race: id })
    const race = races.find((r) => r.id === id)
    if (race) {
      setModalRace(race)
      setModalOpen(true)
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalRace(null)
  }

  const selectedRace = races.find((r) => r.id === selected)

  return (
    <div style={styles.container}>
      <div style={styles.optionsGrid}>
        {races.map((race) => (
          <button
            key={race.id}
            style={{
              ...styles.optionCard,
              ...(selected === race.id ? styles.optionCardSelected : {}),
            }}
            onClick={() => handleSelect(race.id)}
          >
            <span style={styles.optionIcon}>{race.icon}</span>
            <span style={styles.optionName}>{race.name}</span>
          </button>
        ))}
      </div>
      {selectedRace && (
        <div style={styles.detailPanel}>
          <h3 style={styles.detailTitle}>
            {selectedRace.icon} {selectedRace.name}
          </h3>
          <p style={styles.detailText}>{selectedRace.speciesLaw.substring(0, 200)}...</p>
          <div style={styles.statblock}>
            <h4 style={styles.statblockTitle}>Vorteile</h4>
            <ul style={styles.statList}>
              {selectedRace.statblock.vorteile.map((v, i) => (
                <li key={i} style={styles.statItem}>
                  {v}
                </li>
              ))}
            </ul>
            <h4 style={styles.statblockTitle}>Nachteile</h4>
            <ul style={styles.statList}>
              {selectedRace.statblock.nachteile.map((n, i) => (
                <li key={i} style={styles.statItem}>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {modalOpen && modalRace && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={closeModal}>
              ✕
            </button>
            <h2 style={styles.modalTitle}>
              {modalRace.icon} {modalRace.name}
            </h2>
            <div style={styles.modalBody}>
              <div style={styles.modalSection}>
                <h3 style={styles.sectionTitle}>Spezieslaw</h3>
                <div style={styles.scrollableText}>{modalRace.speciesLaw}</div>
              </div>
              <div style={styles.modalSection}>
                <h3 style={styles.sectionTitle}>Statblock</h3>
                <div style={styles.statblock}>
                  <h4 style={styles.statblockTitle}>Vorteile</h4>
                  <ul style={styles.statList}>
                    {modalRace.statblock.vorteile.map((v, i) => (
                      <li key={i} style={styles.statItem}>
                        {v}
                      </li>
                    ))}
                  </ul>
                  <h4 style={styles.statblockTitle}>Nachteile</h4>
                  <ul style={styles.statList}>
                    {modalRace.statblock.nachteile.map((n, i) => (
                      <li key={i} style={styles.statItem}>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 16,
    minHeight: 300,
  },
  optionsGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    alignContent: 'start',
  },
  optionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: '#1a1a2e',
    color: '#eee',
    border: '2px solid transparent',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: 16,
    fontWeight: 500,
  },
  optionCardSelected: {
    border: '2px solid #e94560',
    background: '#2a1a2e',
    boxShadow: '0 0 12px rgba(233, 69, 96, 0.3)',
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionName: {
    fontSize: 16,
    fontWeight: 600,
  },
  detailPanel: {
    width: '25%',
    background: '#f8f8f8',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: 16,
    alignSelf: 'start',
  },
  detailTitle: {
    margin: '0 0 12px 0',
    fontSize: 18,
    color: '#1a1a2e',
  },
  detailText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#444',
    margin: '0 0 16px 0',
  },
  statblock: {
    marginTop: 12,
  },
  statblockTitle: {
    margin: '8px 0 4px 0',
    fontSize: 14,
    color: '#1a1a2e',
  },
  statList: {
    margin: '0 0 12px 0',
    paddingLeft: 20,
  },
  statItem: {
    fontSize: 13,
    color: '#444',
    marginBottom: 4,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 600,
    maxHeight: '80vh',
    width: '90%',
    overflow: 'auto',
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#666',
  },
  modalTitle: {
    margin: '0 0 16px 0',
    fontSize: 22,
    color: '#1a1a2e',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  modalSection: {},
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: 16,
    color: '#1a1a2e',
  },
  scrollableText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#444',
    maxHeight: 250,
    overflowY: 'auto',
    padding: 12,
    background: '#f8f8f8',
    borderRadius: 8,
  },
}
