// ══════════════════════════════════════════════════
//  R3STO — ResaBadges
//  Badges uniformes pour une résa : VIP, allergie,
//  bébé, PMR, canal, mode. Même rendu PARTOUT.
// ══════════════════════════════════════════════════

import { CANAUX, CLIENT_STATUTS, RADIUS } from '../../utils/design'
import type { Resa } from '../../types'

const pill: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 2,
  padding: '1px 5px', borderRadius: RADIUS.xs,
  fontSize: 9, fontWeight: 700, fontFamily: 'var(--ff)',
  lineHeight: '16px', whiteSpace: 'nowrap', flexShrink: 0,
}

/** Mini badge avec icône + texte optionnel */
function Badge({ icon, label, bg, color, border, title }: {
  icon: string; label?: string; bg: string; color: string; border: string; title?: string
}) {
  return (
    <span title={title} style={{ ...pill, background: bg, color, border: `1px solid ${border}` }}>
      {icon}{label && <span style={{ marginLeft: 1 }}>{label}</span>}
    </span>
  )
}

// ── Exports individuels ───────────────────────────

export function VipBadge({ statut }: { statut: number }) {
  if (statut < 1) return null
  const m = CLIENT_STATUTS[statut]
  if (!m) return null
  return <Badge icon={m.icon} bg={m.bg} color={m.color} border={m.border} title={statut === 2 ? 'VIP' : statut === 1 ? 'Régulier' : 'Surveillé'} />
}

export function AllergieBadge({ allergie }: { allergie?: boolean }) {
  if (!allergie) return null
  return <Badge icon="⚠️" bg="rgba(220,80,80,.1)" color="var(--rd)" border="rgba(220,80,80,.3)" title="Allergie" />
}

export function BebeBadge({ count }: { count: number }) {
  if (!count) return null
  return <Badge icon="👶" label={count > 1 ? String(count) : undefined} bg="rgba(168,85,247,.1)" color="var(--pu)" border="rgba(168,85,247,.3)" title={`${count} bébé(s)`} />
}

export function PmrBadge({ count }: { count: number }) {
  if (!count) return null
  return <Badge icon="♿" label={count > 1 ? String(count) : undefined} bg="rgba(59,130,246,.1)" color="var(--bl)" border="rgba(59,130,246,.3)" title={`${count} PMR`} />
}

export function CanalBadge({ canal }: { canal: string }) {
  const m = CANAUX[canal as keyof typeof CANAUX]
  if (!m) return null
  return <Badge icon={m.icon} bg="var(--surf3)" color="var(--t3)" border="var(--border)" title={canal} />
}

export function ModeBadge({ mode }: { mode: string }) {
  const isIA = mode === 'ia'
  return (
    <Badge
      icon={isIA ? '🤖' : mode === 'web' ? '🌐' : '✋'}
      bg={isIA ? 'rgba(91,156,246,.1)' : mode === 'web' ? 'rgba(144,96,224,.1)' : 'rgba(232,165,48,.1)'}
      color={isIA ? 'var(--bl)' : mode === 'web' ? 'var(--pu)' : 'var(--am)'}
      border={isIA ? 'rgba(91,156,246,.3)' : mode === 'web' ? 'rgba(144,96,224,.3)' : 'rgba(232,165,48,.3)'}
      title={isIA ? 'Placement IA' : mode === 'web' ? 'Widget web' : 'Manuel'}
    />
  )
}

// ── Composant principal : toutes les badges d'une résa ──

interface ResaBadgesProps {
  resa: Resa
  /** Compact = juste icônes, full = icônes + labels */
  compact?: boolean
  style?: React.CSSProperties
}

export function ResaBadges({ resa, compact = true, style }: ResaBadgesProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', ...style }}>
      <VipBadge statut={resa.statut} />
      <AllergieBadge allergie={resa.allergie} />
      <BebeBadge count={resa.bebe} />
      <PmrBadge count={resa.pmr} />
      {!compact && <CanalBadge canal={resa.canal} />}
      {!compact && <ModeBadge mode={resa.mode} />}
    </span>
  )
}

export default ResaBadges
