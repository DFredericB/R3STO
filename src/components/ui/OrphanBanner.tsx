/**
 * OrphanBanner — Bannière d'alerte pour les réservations orphelines.
 *
 * S'affiche en haut de chaque vue si des résas ont une table invalide.
 * Propose le réassignment auto IA ou la navigation vers le détail.
 */
import { useOrphans } from '../../hooks/useOrphans'
import { useToast } from './Toast'

export function OrphanBanner({ onNavigate }: { onNavigate?: (resaId: string) => void }) {
  const { orphans, orphansWithTarget, autoReassign, count } = useOrphans()
  const { toast } = useToast()

  if (count === 0) return null

  const canAutoAll = orphansWithTarget.length === count

  return (
    <div style={{
      background: 'rgba(239,68,68,.12)',
      border: '1px solid rgba(239,68,68,.3)',
      borderRadius: 10,
      padding: '10px 16px',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 18 }}>⚠️</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <strong style={{ color: 'var(--rd)', fontSize: 13 }}>
          {count} réservation{count > 1 ? 's' : ''} sans table valide
        </strong>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
          {orphans.slice(0, 3).map(o => (
            <span key={o.resa.id} style={{ marginRight: 8 }}>
              {o.resa.nom || o.resa.n} ({o.resa.c}p) — {o.reason}
              {o.autoTarget && <span style={{ color: 'var(--gn)' }}> → {o.autoTarget}</span>}
            </span>
          ))}
          {count > 3 && <span>+{count - 3} autres…</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {orphansWithTarget.length > 0 && (
          <button
            onClick={() => {
              const n = autoReassign()
              // Force re-render via store update
              if (n > 0) toast(`✅ ${n} réservation${n > 1 ? 's' : ''} réassignée${n > 1 ? 's' : ''}`, 'success')
            }}
            style={{
              background: 'var(--gn)', color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            🤖 {canAutoAll ? 'Tout réassigner' : `Réassigner ${orphansWithTarget.length}/${count}`}
          </button>
        )}
        {onNavigate && (
          <button
            onClick={() => onNavigate(orphans[0]?.resa.id)}
            style={{
              background: 'var(--surf3)', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Voir détails
          </button>
        )}
      </div>
    </div>
  )
}
