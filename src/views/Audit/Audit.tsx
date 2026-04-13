// ══════════════════════════════════════════════════
//  R3STO — Vue Audit
//  Vérification intégrité des données (résas, tables,
//  services, clients, permissions). Design uniformisé.
// ══════════════════════════════════════════════════

import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { sectionTitle, filterChip } from '../../utils/design'

type Severity = 'ok' | 'warn' | 'err'
type Category = 'data' | 'tables' | 'resas' | 'config' | 'access'

interface Check {
  id: string
  category: Category
  label: string
  detail: string
  severity: Severity
}

const CAT_KEYS: Record<Category, string> = {
  data: 'audit.catData',
  tables: 'audit.catTables',
  resas: 'audit.catResas',
  config: 'audit.catConfig',
  access: 'audit.catAccess',
}

// ── StatCard local (aligné Dashboard) ─────────────
function StatCard({ label, value, sub, color = 'var(--bl)' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <div style={{ ...sectionTitle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: 'var(--fm)', letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
    </div>
  )
}

// ── Pill statut sévérité ──────────────────────────
function SevPill({ sev, t }: { sev: Severity; t: (k: string) => string }) {
  const map: Record<Severity, { bg: string; color: string; label: string; icon: string }> = {
    ok:   { bg: 'rgba(34,197,94,.12)',  color: 'var(--gn)', label: t('audit.sevOk'),   icon: '✓' },
    warn: { bg: 'rgba(245,158,11,.14)', color: 'var(--am)', label: t('audit.sevWarn'), icon: '⚠' },
    err:  { bg: 'rgba(239,68,68,.14)',  color: 'var(--rd)', label: t('audit.sevErr'),  icon: '✕' },
  }
  const m = map[sev]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 6,
      background: m.bg, color: m.color,
      fontSize: 10, fontWeight: 800, letterSpacing: '.04em',
    }}>{m.icon} {m.label}</span>
  )
}

export function Audit() {
  const { t } = useT()
  const { resas, tables, salles, services, users, clients } = useAppStore()
  const [filter, setFilter] = useState<'all' | Severity>('all')

  // ── Calcul des contrôles ─────────────────────────
  const checks: Check[] = useMemo(() => {
    const list: Check[] = []

    // DONNÉES
    list.push({
      id: 'd1', category: 'data', label: t('audit.volResas'),
      detail: `${resas.length} ${t('audit.resasLoaded')}`,
      severity: resas.length > 0 ? 'ok' : 'warn',
    })
    list.push({
      id: 'd2', category: 'data', label: t('audit.crmFile'),
      detail: `${clients.length} ${t('audit.ficheClient')}`,
      severity: clients.length > 0 ? 'ok' : 'warn',
    })
    const orphanResas = resas.filter(r => !r.tbl || r.tbl === '—').length
    list.push({
      id: 'd3', category: 'data', label: t('audit.resaSansTable'),
      detail: orphanResas === 0 ? t('audit.toutesAssign') : `${orphanResas} ${t('audit.aAssigner')}`,
      severity: orphanResas === 0 ? 'ok' : orphanResas > 5 ? 'err' : 'warn',
    })

    // TABLES
    const activeTbls = tables.filter(tb => tb.active).length
    list.push({
      id: 't1', category: 'tables', label: t('audit.tablesActives'),
      detail: `${activeTbls}/${tables.length} ${t('audit.tablesActives').toLowerCase()}`,
      severity: activeTbls > 0 ? 'ok' : 'err',
    })
    const blockedTbls = tables.filter((tb: any) => tb.blocked).length
    list.push({
      id: 't2', category: 'tables', label: t('audit.tablesBloquees'),
      detail: blockedTbls === 0 ? t('audit.aucuneBloq') : `${blockedTbls} ${t('audit.tablesBloquees').toLowerCase()}`,
      severity: blockedTbls === 0 ? 'ok' : 'warn',
    })
    const invalidCap = tables.filter(tb => (tb.capMin ?? 0) > (tb.capMax ?? 0)).length
    list.push({
      id: 't3', category: 'tables', label: t('audit.capCoherentes'),
      detail: invalidCap === 0 ? t('audit.capValid') : `${invalidCap} capMin > capMax`,
      severity: invalidCap === 0 ? 'ok' : 'err',
    })
    const sallesActive = salles.filter(s => s.active).length
    list.push({
      id: 't4', category: 'tables', label: t('audit.sallesActives'),
      detail: `${sallesActive}/${salles.length} ${t('audit.sallesOuv')}`,
      severity: sallesActive > 0 ? 'ok' : 'err',
    })

    // RÉSAS
    const noshows = resas.filter(r => r.s === 'noshow').length
    const total = resas.filter(r => r.s !== 'cancelled').length
    const noshowRate = total > 0 ? (noshows / total) * 100 : 0
    list.push({
      id: 'r1', category: 'resas', label: t('audit.tauxNoshow'),
      detail: `${noshowRate.toFixed(1)}% (${noshows}/${total})`,
      severity: noshowRate < 5 ? 'ok' : noshowRate < 10 ? 'warn' : 'err',
    })
    const wlist = resas.filter(r => r.s === 'waitlist').length
    list.push({
      id: 'r2', category: 'resas', label: t('audit.listeAttente'),
      detail: wlist === 0 ? t('audit.vide') : `${wlist} ${t('audit.enAttente')}`,
      severity: wlist === 0 ? 'ok' : wlist > 10 ? 'warn' : 'ok',
    })
    const dupBookings = (() => {
      const seen: Record<string, number> = {}
      let dups = 0
      for (const r of resas) {
        if (r.s === 'cancelled' || r.s === 'noshow') continue
        const k = `${r.date}|${r.svc}|${r.tbl}|${r.t}`
        seen[k] = (seen[k] || 0) + 1
        if (seen[k] === 2) dups++
      }
      return dups
    })()
    list.push({
      id: 'r3', category: 'resas', label: t('audit.doublesResa'),
      detail: dupBookings === 0 ? t('audit.aucunDouble') : `${dupBookings} ${t('audit.conflits')}`,
      severity: dupBookings === 0 ? 'ok' : 'err',
    })

    // CONFIG
    const activeSvc = services.filter(s => s.active).length
    list.push({
      id: 'c1', category: 'config', label: t('audit.svcConfig'),
      detail: `${activeSvc}/${services.length} ${t('audit.svcActifs')}`,
      severity: activeSvc > 0 ? 'ok' : 'err',
    })
    const svcGaps = services.filter(s => s.active && (!s.open || !s.close)).length
    list.push({
      id: 'c2', category: 'config', label: t('audit.horSvc'),
      detail: svcGaps === 0 ? t('audit.horOk') : `${svcGaps} ${t('audit.svcSansHor')}`,
      severity: svcGaps === 0 ? 'ok' : 'err',
    })

    // ACCÈS
    const activeUsers = (users || []).filter((u: any) => u.active).length
    list.push({
      id: 'a1', category: 'access', label: t('audit.usersActifs'),
      detail: `${activeUsers}/${(users || []).length} ${t('audit.utilisateurs')}`,
      severity: activeUsers > 0 ? 'ok' : 'warn',
    })
    const owners = (users || []).filter((u: any) => u.role === 'owner').length
    list.push({
      id: 'a2', category: 'access', label: t('audit.ownerDefini'),
      detail: owners > 0 ? `${owners} owner` : t('audit.aucunOwner'),
      severity: owners > 0 ? 'ok' : 'err',
    })

    return list
  }, [resas, tables, salles, services, users, clients, t])

  // ── KPIs ────────────────────────────────────────
  const kpi = useMemo(() => ({
    total: checks.length,
    ok: checks.filter(c => c.severity === 'ok').length,
    warn: checks.filter(c => c.severity === 'warn').length,
    err: checks.filter(c => c.severity === 'err').length,
  }), [checks])

  // ── Filtre ──────────────────────────────────────
  const filtered = filter === 'all' ? checks : checks.filter(c => c.severity === filter)
  const grouped: Record<Category, Check[]> = useMemo(() => {
    const g: any = { data: [], tables: [], resas: [], config: [], access: [] }
    for (const c of filtered) g[c.category].push(c)
    return g
  }, [filtered])

  return (
    <div style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      {/* ─── Header de vue ─── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-.01em' }}>🔍 {t('audit.title')}</h1>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
            {t('audit.subtitle')}
          </div>
        </div>
      </div>

      {/* ─── KPIs ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard label={t('audit.totalChecks')} value={kpi.total} sub={t('audit.verifications')} color="var(--bl)" />
        <StatCard label="OK" value={kpi.ok} sub={`${kpi.total > 0 ? Math.round(kpi.ok / kpi.total * 100) : 0}% ${t('audit.conformes')}`} color="var(--gn)" />
        <StatCard label={t('audit.warnings')} value={kpi.warn} sub={t('audit.toWatch')} color="var(--am)" />
        <StatCard label={t('audit.errors')} value={kpi.err} sub={t('audit.toFix')} color="var(--rd)" />
      </div>

      {/* ─── Filtres ─── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(['all', 'ok', 'warn', 'err'] as const).map(k => {
          const labels = { all: t('audit.all'), ok: t('audit.ok'), warn: t('audit.warn'), err: t('audit.err') }
          return (
            <button key={k} onClick={() => setFilter(k)} style={filterChip(filter === k)}>
              {labels[k]}
            </button>
          )
        })}
      </div>

      {/* ─── Liste des contrôles groupés ─── */}
      {(Object.keys(grouped) as Category[]).map(cat => {
        const items = grouped[cat]
        if (items.length === 0) return null
        return (
          <div key={cat} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={sectionTitle}>{t(CAT_KEYS[cat])}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(c => (
                <div key={c.id} style={{
                  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  background: 'var(--surf3)', border: '1px solid var(--border)',
                }}>
                  <SevPill sev={c.severity} t={t} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--t3)' }}>
          {t('audit.noMatch')}
        </div>
      )}
    </div>
  )
}
