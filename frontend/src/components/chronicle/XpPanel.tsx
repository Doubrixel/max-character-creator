import { useState, useEffect, useCallback } from 'react'
import { useAppContext } from '../../context/AppContext'
import {
  XP_PER_LEVEL, START_XP, levelOf, levelProgress, xpToNextLevel,
  spendCost, spendLabel, getLevelCap, SpendKind,
} from './xpkosten'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface XpLogEntry {
  id: string
  amount: number
  reason: string | null
  createdAt: number | null
}

interface XpTargetSkill { id: string; name: string; value?: number }

interface XpPanelProps {
  characterId: string
  knownSkills: XpTargetSkill[]
  learnableSkills: XpTargetSkill[]
  learnableStrengths: XpTargetSkill[]
  onChanged: () => void
}

export default function XpPanel({ characterId, knownSkills, learnableSkills, learnableStrengths, onChanged }: XpPanelProps) {
  const { reportApiError } = useAppContext()
  const [xp, setXp] = useState<number>(START_XP)
  const [totalXp, setTotalXp] = useState<number>(START_XP)
  const [log, setLog] = useState<XpLogEntry[]>([])
  const [busy, setBusy] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [sessionAmount, setSessionAmount] = useState('')

  const [showLog, setShowLog] = useState(false)

  const [spendKind, setSpendKind] = useState<SpendKind | ''>('')
  const [spendTarget, setSpendTarget] = useState('')
  const [spendConfirm, setSpendConfirm] = useState(false)

  const load = useCallback(() => {
    fetch(`${API_BASE}/api/characters/${characterId}/xp`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { xp: number; totalXp: number; log: XpLogEntry[] }) => {
        setXp(data.xp)
        setTotalXp(data.totalXp)
        setLog(data.log)
      })
      .catch(() => reportApiError('XP-Daten konnten nicht geladen werden'))
  }, [characterId, reportApiError])

  useEffect(() => { load() }, [load])

  const level = levelOf(totalXp)
  const progress = levelProgress(totalXp)
  const levelCap = getLevelCap(level)

  const spendTargets: XpTargetSkill[] =
    spendKind === 'skill_up' ? knownSkills
      : spendKind === 'learn_skill' ? learnableSkills
        : spendKind === 'learn_strength' ? learnableStrengths
          : []
  const spendTargetName = spendTargets.find(t => t.id === spendTarget)?.name ?? ''
  const currentCost = spendKind ? spendCost(spendKind as SpendKind) : 0
  const capBlocked = levelCap !== null && level > levelCap

  const resetAddForm = () => {
    setShowAddForm(false)
    setSessionName('')
    setSessionAmount('')
  }

  const handleAddXp = async () => {
    const amount = parseInt(sessionAmount, 10)
    if (!sessionName.trim() || !Number.isFinite(amount) || amount <= 0) {
      reportApiError('Session-Name und XP-Anzahl (größer 0) angeben')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: sessionName.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        reportApiError(data?.error || `XP konnte nicht hinzugefügt werden (HTTP ${res.status})`)
      } else {
        resetAddForm()
        load()
        onChanged()
      }
    } catch (err) {
      reportApiError(`XP konnte nicht hinzugefügt werden: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveEntry = async (logId: string) => {
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}/xp/${logId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        reportApiError(data?.error || `Eintrag konnte nicht entfernt werden (HTTP ${res.status})`)
      } else {
        load()
        onChanged()
      }
    } catch (err) {
      reportApiError(`Eintrag konnte nicht entfernt werden: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBusy(false)
    }
  }

  const handleSpend = async () => {
    if (!spendKind || !spendTarget) {
      reportApiError('Aktion und Ziel wählen')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}/xp/spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: spendKind,
          targetId: spendTarget,
          targetName: spendTargetName,
          cost: currentCost,
          reason: spendLabel(spendKind as SpendKind, spendTargetName),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        reportApiError(data?.error || `XP konnte nicht ausgegeben werden (HTTP ${res.status})`)
      } else {
        setSpendKind('')
        setSpendTarget('')
        setSpendConfirm(false)
        load()
        onChanged()
      }
    } catch (err) {
      reportApiError(`XP konnte nicht ausgegeben werden: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBusy(false)
    }
  }

  const canAfford = xp >= currentCost && !capBlocked
  const newest = log[0]
  const newestRemovable = !!newest && newest.amount > 0

  const spendKindLabels: Record<SpendKind, string> = {
    skill_up: 'Skill aufwerten (+1)',
    learn_skill: 'Neu erlernen: Skill',
    learn_strength: 'Neu erlernen: Stärke',
  }

  return (
    <div style={styles.panel}>
      <div style={styles.levelRow}>
        <div style={styles.levelBadge}>Level {level}{levelCap !== null ? ` (Cap ${levelCap})` : ''}</div>
        <div style={styles.barWrap}>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${progress}%` }} />
          </div>
          <span style={styles.barLabel}>{progress}/{XP_PER_LEVEL} XP</span>
        </div>
      </div>
      <div style={styles.subLine}>
        {totalXp} XP gesamt · {xpToNextLevel(totalXp)} XP bis Level {level + 1} · <strong>Verfügbar: {xp} XP</strong>
      </div>

      <div style={styles.actionsRow}>
        <button style={styles.primaryBtn} onClick={() => setShowAddForm(!showAddForm)} disabled={busy}>
          {showAddForm ? 'Abbrechen' : '+ XP hinzufügen'}
        </button>
      </div>

      {showAddForm && (
        <div style={styles.inlineForm}>
          <input
            style={styles.input}
            placeholder="Session-Name (z. B. „Die Mine von Golgrund“)"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
          />
          <input
            style={{ ...styles.input, ...styles.amountInput }}
            placeholder="XP"
            inputMode="numeric"
            value={sessionAmount}
            onChange={(e) => setSessionAmount(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <button style={styles.primaryBtn} onClick={handleAddXp} disabled={busy}>Speichern</button>
        </div>
      )}

      <div style={styles.spendSection}>
        <div style={styles.spendHeader}>XP ausgeben</div>
        <div style={styles.inlineForm}>
          <select
            style={styles.select}
            value={spendKind}
            onChange={(e) => { setSpendKind(e.target.value as SpendKind | ''); setSpendTarget(''); setSpendConfirm(false) }}
          >
            <option value="">— Aktion wählen —</option>
            {(Object.keys(spendKindLabels) as SpendKind[]).map((k) => (
              <option key={k} value={k}>{spendKindLabels[k]}</option>
            ))}
          </select>
          <select
            style={styles.select}
            value={spendTarget}
            onChange={(e) => { setSpendTarget(e.target.value); setSpendConfirm(false) }}
            disabled={!spendKind || spendTargets.length === 0}
          >
            <option value="">— Ziel wählen —</option>
            {spendTargets.map((t) => (
              <option key={t.id} value={t.id}>{t.name}{t.value !== undefined ? ` (Wert ${t.value})` : ''}</option>
            ))}
          </select>
          {spendKind && (
            <button
              style={{ ...styles.primaryBtn, ...(!canAfford || !spendTarget || busy ? styles.btnDisabled : {}) }}
              onClick={() => setSpendConfirm(true)}
              disabled={!canAfford || !spendTarget || busy}
            >
              Ausgeben ({currentCost} XP)
            </button>
          )}
        </div>
        {spendKind && capBlocked && (
          <p style={styles.hintText}>Level-Cap erreicht – Ausgabe nicht möglich.</p>
        )}
        {spendKind && !capBlocked && spendTargets.length === 0 && (
          <p style={styles.hintText}>Kein passendes Ziel vorhanden.</p>
        )}
        {spendConfirm && (
          <div style={styles.confirmRow}>
            <span>{spendLabel(spendKind as SpendKind, spendTargetName)} · {currentCost} XP, verbleiben {xp - currentCost} XP.</span>
            <button style={styles.confirmBtn} onClick={handleSpend} disabled={busy}>Ja, ausgeben</button>
            <button style={styles.cancelBtn} onClick={() => setSpendConfirm(false)}>Abbrechen</button>
          </div>
        )}
      </div>

      <div style={styles.logSection}>
        <button style={styles.logToggle} onClick={() => setShowLog(!showLog)}>
          {showLog ? '▾' : '▸'} XP-Verlauf ({log.length} Einträge)
        </button>
        {showLog && (
          <div style={styles.logList}>
            {log.map((entry, i) => (
              <div key={entry.id} style={styles.logRow}>
                <span style={styles.logDate}>
                  {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('de-DE') : ''}
                </span>
                <span style={styles.logReason}>{entry.reason}</span>
                <span style={{ ...styles.logAmount, ...(entry.amount > 0 ? styles.logAmountPos : styles.logAmountNeg) }}>
                  {entry.amount > 0 ? '+' : ''}{entry.amount} XP
                </span>
                {i === 0 && newestRemovable && (
                  <button
                    style={styles.removeBtn}
                    title="Letzten Eintrag entfernen"
                    onClick={() => handleRemoveEntry(entry.id)}
                    disabled={busy}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <div style={styles.logStart}>Startsaldo: {START_XP} XP</div>
          </div>
        )}
      </div>
    </div>
  )
}

export function XpBar({ totalXp, compact }: { totalXp: number; compact?: boolean }) {
  const level = levelOf(totalXp)
  const progress = levelProgress(totalXp)
  return (
    <div style={styles.xpBarWrap}>
      <span style={compact ? styles.xpBarLevelCompact : styles.xpBarLevel}>Level {level}</span>
      <div style={styles.xpBarTrack}>
        <div style={{ ...styles.xpBarFill, width: `${progress}%` }} />
      </div>
      <span style={compact ? styles.xpBarValueCompact : styles.xpBarValue}>{progress}/{XP_PER_LEVEL}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  levelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  levelBadge: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--accent)',
    whiteSpace: 'nowrap',
  },
  barWrap: {
    flex: 1,
    minWidth: 200,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  barTrack: {
    flex: 1,
    height: 12,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'var(--accent)',
    transition: 'width 0.3s',
  },
  barLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  },
  subLine: {
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  actionsRow: {
    display: 'flex',
    gap: 10,
  },
  primaryBtn: {
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  inlineForm: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minWidth: 180,
    padding: '7px 10px',
    fontSize: 13,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
  },
  amountInput: {
    flex: '0 0 90px',
    minWidth: 90,
  },
  select: {
    padding: '7px 10px',
    fontSize: 13,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
  },
  spendSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    borderTop: '1px solid var(--border)',
    paddingTop: 12,
  },
  spendHeader: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  hintText: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
  },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    fontSize: 13,
    color: 'var(--text-secondary)',
    background: 'var(--bg-secondary)',
    padding: '8px 12px',
    borderRadius: 6,
  },
  confirmBtn: {
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 600,
    background: 'var(--success)',
    color: 'var(--text-on-success)',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '5px 12px',
    fontSize: 12,
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
  },
  logSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    borderTop: '1px solid var(--border)',
    paddingTop: 12,
  },
  logToggle: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    padding: 0,
    alignSelf: 'flex-start',
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  logRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  logDate: {
    flex: '0 0 85px',
    color: 'var(--text-tertiary)',
  },
  logReason: {
    flex: 1,
    color: 'var(--text-primary)',
  },
  logAmount: {
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  logAmountPos: {
    color: 'var(--success)',
  },
  logAmountNeg: {
    color: 'var(--danger)',
  },
  removeBtn: {
    background: 'transparent',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    borderRadius: 6,
    width: 22,
    height: 22,
    lineHeight: '20px',
    fontSize: 14,
    cursor: 'pointer',
    padding: 0,
  },
  logStart: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    borderTop: '1px dashed var(--border)',
    paddingTop: 6,
    marginTop: 4,
  },
  xpBarWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  xpBarLevel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--accent)',
    whiteSpace: 'nowrap',
  },
  xpBarLevelCompact: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--accent)',
    whiteSpace: 'nowrap',
  },
  xpBarTrack: {
    width: 90,
    height: 8,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    background: 'var(--accent)',
    transition: 'width 0.3s',
  },
  xpBarValue: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  },
  xpBarValueCompact: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap',
  },
}
