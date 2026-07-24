import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface CharacterSheetProps {
  characterId: string
  onDelete: (id: string) => void
}

const SKILL_NAMES: Record<string, string> = {
  akrobatik: 'Akrobatik', schleichen: 'Schleichen', wahrnehmung: 'Wahrnehmung',
  wissen: 'Wissen', ueberleben: 'Überleben', nahkampf: 'Nahkampf',
  distanz: 'Distanz', schild: 'Schild', elementar: 'Elementarmagie', heilung: 'Heilungsmagie',
}

const ATTRIBUTE_NAMES: Record<string, string> = {
  MUT: 'Mut', KLU: 'Klugheit', INT: 'Intuition', CHA: 'Charisma',
  HIN: 'Hinterhalt', MYS: 'Mystik',
  FF: 'Fingerfertigkeit', GEW: 'Gewandheit', KON: 'Konstitution',
  KRA: 'Körperkraft',
}

const MEISTERSCHAFT_NAMES: Record<string, string> = {
  m_nah_1: 'Klingensturm', m_nah_2: 'Meisterparade',
  m_dis_1: 'Scharfschütze', m_dis_2: 'Schnellfeuer',
  m_akr_1: 'Luftsprung', m_akr_2: 'Fallmeister',
  m_sch_1: 'Unsichtbar', m_sch_2: 'Schattenritt',
  m_wah_1: 'Adlerauge', m_wah_2: 'Gefahrensinn',
  m_wis_1: 'Gelehrter', m_wis_2: 'Analytiker',
  m_ele_1: 'Elementarbeherrschung', m_ele_2: 'Sturmrufer',
  m_hei_1: 'Wundheiler', m_hei_2: 'Reinigung',
  m_ueb_1: 'Wegweiser', m_ueb_2: 'Jäger',
  'meister-hieb': 'Meisterhieb', meisterschuss: 'Meisterschuss',
  'arkaner-strom': 'Arkaner Strom',
}

const SPELL_NAMES: Record<string, string> = {
  sp_el_0_1: 'Funken', sp_el_0_2: 'Eisblitz',
  sp_el_1_1: 'Feuerball', sp_el_1_2: 'Eiswand',
  sp_el_2_1: 'Meteor', sp_el_2_2: 'Blitzschlag',
  sp_he_0_1: 'Leichtes Heilen', sp_he_0_2: 'Reinigen',
  sp_he_1_1: 'Wunden schließen', sp_he_1_2: 'Schutzschild',
  sp_he_2_1: 'Massenheilung', sp_he_2_2: 'Wiederbelebung',
}

export default function CharacterSheet({ characterId, onDelete }: CharacterSheetProps) {
  const [state, setState] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/characters/${characterId}/state`)
      .then(r => r.json())
      .then(d => { setState(d.state); setLoading(false) })
      .catch(() => setLoading(false))
  }, [characterId])

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}`, { method: 'DELETE' })
      if (res.ok) onDelete(characterId)
    } catch {}
  }

  if (loading) return <div style={styles.loading}>Lade...</div>
  if (!state) return <div style={styles.error}>Charakter nicht gefunden.</div>

  const skills = (state.skills ?? {}) as Record<string, number>
  const attribute = (state.attribute ?? {}) as Record<string, number>
  const derived = (state.derived ?? {}) as Record<string, number>
  const staerken = (state.staerken ?? []) as string[]
  const meisterschaften = [...(state.meisterschaften ?? []) as string[], ...(state.bonusMeisterschaften ?? []) as string[]]
  const spells = (state.spells ?? []) as string[]
  const resources = (state.resources ?? {}) as Record<string, number>
  const rasse = (state.rasse ?? {}) as { name?: string }
  const abstammung = (state.abstammung ?? {}) as { heritage?: string }

  return (
    <div style={styles.sheet}>
      <div style={styles.sheetHeader}>
        <h2 style={styles.sheetTitle}>Charakterbogen</h2>
        <button style={styles.deleteBtn} onClick={() => setDeleteConfirm(true)}>
          Löschen
        </button>
      </div>

      {rasse.name && (
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Rasse:</span>
          <span>{rasse.name}</span>
        </div>
      )}
      {abstammung.heritage && (
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Abstammung:</span>
          <span>{abstammung.heritage}</span>
        </div>
      )}

      {Object.keys(attribute).length > 0 && (
        <Section title="Attribute">
          <div style={styles.attrGrid}>
            {Object.entries(attribute).map(([key, val]) => (
              <div key={key} style={styles.attrItem}>
                <span style={styles.attrName}>{ATTRIBUTE_NAMES[key] ?? key}</span>
                <span style={styles.attrValue}>{val}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {Object.keys(derived).length > 0 && (
        <Section title="Abgeleitete Werte">
          <div style={styles.attrGrid}>
            {Object.entries(derived).map(([key, val]) => (
              <div key={key} style={styles.attrItem}>
                <span style={styles.attrName}>{key}</span>
                <span style={styles.attrValue}>{val}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {Object.keys(skills).length > 0 && (
        <Section title="Fähigkeiten">
          <div style={styles.skillGrid}>
            {Object.entries(skills)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([id, val]) => (
                <div key={id} style={styles.skillItem}>
                  <span>{SKILL_NAMES[id] ?? id}</span>
                  <span style={styles.skillValue}>{val}</span>
                </div>
              ))}
          </div>
        </Section>
      )}

      {staerken.length > 0 && (
        <Section title="Stärken">
          <div style={styles.tagList}>
            {staerken.map((s, i) => (
              <span key={i} style={styles.tag}>{s}</span>
            ))}
          </div>
        </Section>
      )}

      {meisterschaften.length > 0 && (
        <Section title="Meisterschaften">
          <div style={styles.tagList}>
            {meisterschaften.map((m, i) => (
              <span key={i} style={styles.tag}>{MEISTERSCHAFT_NAMES[m] ?? m}</span>
            ))}
          </div>
        </Section>
      )}

      {spells.length > 0 && (
        <Section title="Spells">
          <div style={styles.tagList}>
            {spells.map((s, i) => (
              <span key={i} style={styles.tag}>{SPELL_NAMES[s] ?? s}</span>
            ))}
          </div>
        </Section>
      )}

      {Object.keys(resources).length > 0 && (
        <Section title="Ressourcen">
          <div style={styles.skillGrid}>
            {Object.entries(resources).filter(([, v]) => v > 0).map(([id, val]) => (
              <div key={id} style={styles.skillItem}>
                <span>{id.toUpperCase()}</span>
                <span style={styles.skillValue}>{val}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Charakter löschen?</h3>
            <p style={styles.modalText}>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div style={styles.modalActions}>
              <button style={styles.modalCancel} onClick={() => setDeleteConfirm(false)}>
                Abbrechen
              </button>
              <button style={styles.modalDelete} onClick={handleDelete}>
                endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: { color: 'var(--text-tertiary)', padding: 40 },
  error: { color: 'var(--danger)', padding: 40 },
  sheet: { maxWidth: 700 },
  sheetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  deleteBtn: {
    background: 'transparent', border: '1px solid var(--danger)',
    color: 'var(--danger)', borderRadius: 6, padding: '6px 14px',
    cursor: 'pointer', fontSize: 13,
  },
  infoRow: { display: 'flex', gap: 8, marginBottom: 6, fontSize: 14, color: 'var(--text-secondary)' },
  infoLabel: { fontWeight: 600, color: 'var(--text-primary)' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 15, fontWeight: 600, color: 'var(--accent)',
    borderBottom: '1px solid var(--border)', paddingBottom: 6, margin: '0 0 12px',
  },
  attrGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 },
  attrItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 12px',
  },
  attrName: { fontSize: 13, color: 'var(--text-secondary)' },
  attrValue: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' },
  skillGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  skillItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '6px 12px', fontSize: 13,
  },
  skillValue: { fontWeight: 700, color: 'var(--accent)', fontSize: 15 },
  tagList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '4px 10px', fontSize: 13, color: 'var(--text-primary)',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 24, maxWidth: 400, width: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' },
  modalText: { fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' },
  modalActions: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
  modalCancel: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
  },
  modalDelete: {
    background: 'var(--danger)', border: 'none',
    color: '#fff', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600,
  },
}
