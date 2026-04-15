// ══════════════════════════════════════════════════
//  R3STO — Bandeau d'alertes global
//  Affiché en haut de chaque vue opérationnelle
//  Condensé : pastilles compactes cliquables
// ══════════════════════════════════════════════════

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { computeAlerts } from '../../utils/alerts'

export function AlertsBanner() {
  const { resas, activeDate } = useAppStore()
  const navigate = useNavigate()

  const alerts = useMemo(() => computeAlerts(resas, activeDate), [resas, activeDate])

  const hasAlerts = alerts.waitlist > 0 || alerts.groups > 0 || alerts.noshow > 0 || alerts.arriving > 0
  if (!hasAlerts) return null

  const pills: { icon: string; label: string; count: number; color: string; bg: string; border: string; onClick: () => void; pulse?: boolean }[] = []

  if (alerts.waitlist > 0) pills.push({
    icon: '⏳', label: 'En attente', count: alerts.waitlist,
    color: '#e8a530', bg: 'rgba(232,165,48,.1)', border: 'rgba(232,165,48,.35)',
    onClick: () => navigate('/waitlist'), pulse: true,
  })

  if (alerts.arriving > 0) pills.push({
    icon: '🕐', label: 'Arrivent bientôt', count: alerts.arriving,
    color: 'var(--bl)', bg: 'rgba(91,156,246,.08)', border: 'rgba(91,156,246,.3)',
    onClick: () => navigate('/reservations'),
  })

  if (alerts.groups > 0) pills.push({
    icon: '👥', label: 'Groupes', count: alerts.groups,
    color: '#b482ff', bg: 'rgba(144,96,224,.08)', border: 'rgba(144,96,224,.3)',
    onClick: () => navigate('/groupes'),
  })

  // R3STO concept : auto-assign systématique → pas de "Sans table". Pill supprimée.

  if (alerts.noshow > 0) pills.push({
    icon: '👻', label: 'No-shows', count: alerts.noshow,
    color: 'var(--t3)', bg: 'rgba(100,116,139,.08)', border: 'rgba(100,116,139,.25)',
    onClick: () => navigate('/reservations'),
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px',
      borderBottom: '1px solid var(--border)', background: 'var(--surf)',
      flexShrink: 0, overflowX: 'auto', flexWrap: 'wrap',
    }}>
      <style>{`@keyframes alertPulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      {pills.map((p, i) => (
        <button key={i} onClick={p.onClick} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
          border: `1px solid ${p.border}`, background: p.bg,
          fontSize: 11, fontWeight: 700, color: p.color,
          fontFamily: 'var(--ff)',
          animation: p.pulse ? 'alertPulse 2s ease-in-out infinite' : undefined,
        }}>
          <span style={{ fontSize: 12 }}>{p.icon}</span>
          <span>{p.count}</span>
          <span style={{ fontWeight: 600, opacity: .8 }}>{p.label}</span>
        </button>
      ))}
    </div>
  )
}
