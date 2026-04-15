import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { RADIUS } from '../../utils/design'

// ══════════════════════════════════════════════════
//  R3STO — Recherche globale ⌘K
//  Command palette : résas, clients, tables, navigation
// ══════════════════════════════════════════════════

interface SearchResult {
  type: 'resa' | 'client' | 'table' | 'nav'
  icon: string
  title: string
  sub: string
  action: () => void
}

const NAV_ROUTES: { path: string; icon: string; labelKey: string }[] = [
  { path: '/dashboard',    icon: '📊', labelKey: 'nav.dashboard' },
  { path: '/reservations', icon: '📖', labelKey: 'nav.journal' },
  { path: '/grille',       icon: '🪑', labelKey: 'nav.grid' },
  { path: '/plan',         icon: '📐', labelKey: 'nav.floorplan' },
  { path: '/waitlist',     icon: '⏳', labelKey: 'nav.waitlist' },
  { path: '/groupes',      icon: '👥', labelKey: 'nav.groups' },
  { path: '/clients',      icon: '👤', labelKey: 'nav.clients' },
  { path: '/marketing',    icon: '📣', labelKey: 'nav.campaigns' },
  { path: '/blacklist',    icon: '🚫', labelKey: 'nav.blacklist' },
  { path: '/avis',         icon: '⭐', labelKey: 'nav.reviews' },
  { path: '/fidelite',     icon: '🏆', labelKey: 'nav.loyalty' },
  { path: '/widget',       icon: '🔌', labelKey: 'nav.widget' },
  { path: '/qrcode',       icon: '📱', labelKey: 'nav.qrcode' },
  { path: '/menu',         icon: '📋', labelKey: 'nav.menu' },
  { path: '/prepaiement',  icon: '💳', labelKey: 'nav.prepayment' },
  { path: '/cadeaux',      icon: '🎁', labelKey: 'nav.giftCards' },
  { path: '/profil',       icon: '🍽️', labelKey: 'nav.myRestaurant' },
  { path: '/salles',       icon: '🚪', labelKey: 'nav.roomsServices' },
  { path: '/fermetures',   icon: '📅', labelKey: 'nav.closures' },
  { path: '/setup-plan',   icon: '📐', labelKey: 'nav.planTables' },
  { path: '/options',      icon: '⚙️', labelKey: 'nav.options' },
  { path: '/multisite',    icon: '🏢', labelKey: 'nav.multisite' },
  { path: '/acces-roles',  icon: '🔐', labelKey: 'nav.teamAccess' },
  { path: '/historique',   icon: '📜', labelKey: 'nav.history' },
  { path: '/support',      icon: '💬', labelKey: 'nav.support' },
]

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const nav = useNavigate()
  const resas = useAppStore(s => s.resas)
  const clients = useAppStore(s => s.clients)
  const tables = useAppStore(s => s.tables)
  const [query, setQuery] = useState('')
  const [selIdx, setSelIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input quand ouvert
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Recherche
  const results = useCallback((): SearchResult[] => {
    const q = query.toLowerCase().trim()
    if (!q) {
      // Raccourcis par défaut quand pas de recherche
      return NAV_ROUTES.slice(0, 8).map(r => ({
        type: 'nav' as const,
        icon: r.icon,
        title: t(r.labelKey),
        sub: r.path,
        action: () => { nav(r.path); onClose() },
      }))
    }

    const out: SearchResult[] = []
    const MAX = 12

    // Navigation
    for (const r of NAV_ROUTES) {
      if (out.length >= MAX) break
      const label = t(r.labelKey).toLowerCase()
      if (label.includes(q) || r.path.includes(q)) {
        out.push({
          type: 'nav', icon: r.icon,
          title: t(r.labelKey),
          sub: t('search.goTo') + ' ' + r.path,
          action: () => { nav(r.path); onClose() },
        })
      }
    }

    // Résas — deeplink via query param ?resa=<id> pour highlight dans Resas.tsx
    for (const r of resas) {
      if (out.length >= MAX) break
      const searchable = `${r.n || ''} ${r.tel || ''} ${r.tbl || ''} ${r.note || ''}`.toLowerCase()
      if (searchable.includes(q)) {
        out.push({
          type: 'resa', icon: '📖',
          title: `${r.n} — ${r.c} cvt · ${r.t}`,
          sub: `${r.date} · ${r.tbl || '—'} · ${r.s}`,
          // Utilise le param ?edit=<id> déjà géré par Resas.tsx
          action: () => { nav(`/reservations?edit=${encodeURIComponent(r.id)}`); onClose() },
        })
      }
    }

    // Clients — deeplink ?id=<id>
    for (const c of clients) {
      if (out.length >= MAX) break
      const searchable = `${c.nom} ${c.prenom} ${c.tel} ${c.email} ${c.entreprise}`.toLowerCase()
      if (searchable.includes(q)) {
        out.push({
          type: 'client', icon: '👤',
          title: `${c.prenom} ${c.nom}`,
          sub: `${c.tel} · ${c.totalVisits} ${t('search.visits')} · ${c.email}`,
          action: () => { nav(`/clients?id=${encodeURIComponent(c.id)}`); onClose() },
        })
      }
    }

    // Tables — deeplink ?table=<n>
    for (const tb of tables) {
      if (out.length >= MAX) break
      if (tb.n.toLowerCase().includes(q) || tb.salle.toLowerCase().includes(q)) {
        out.push({
          type: 'table', icon: '🪑',
          title: `${tb.n} — ${tb.salle}`,
          sub: `${tb.capMin}–${tb.capMax} cvt · ${tb.shape}`,
          action: () => { nav(`/setup-plan?table=${encodeURIComponent(tb.n)}`); onClose() },
        })
      }
    }

    return out
  }, [query, resas, clients, tables, t, nav, onClose])()

  // Clamp selIdx
  useEffect(() => {
    if (selIdx >= results.length) setSelIdx(Math.max(0, results.length - 1))
  }, [results.length, selIdx])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(i => Math.min(results.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelIdx(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' && results[selIdx]) { results[selIdx].action() }
    else if (e.key === 'Escape') { onClose() }
  }

  if (!open) return null

  const typeLabel: Record<string, string> = {
    nav: t('search.type.nav'),
    resa: t('search.type.resa'),
    client: t('search.type.client'),
    table: t('search.type.table'),
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)',
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 520, maxWidth: '90vw', maxHeight: '70vh',
        zIndex: 9999, borderRadius: RADIUS.xl,
        background: 'var(--surf)', border: '1px solid var(--border)',
        boxShadow: '0 24px 48px rgba(0,0,0,.35)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelIdx(0) }}
            onKeyDown={handleKey}
            placeholder={t('search.placeholder')}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 15, color: 'var(--text)', fontFamily: 'var(--ff)',
            }}
          />
          <kbd style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: 'var(--surf2)', border: '1px solid var(--border)',
            color: 'var(--t3)', fontFamily: 'var(--fm)',
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', maxHeight: 400 }}>
          {results.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: 'var(--t3)' }}>
              {t('search.noResults')}
            </div>
          ) : (
            results.map((r, i) => (
              <div
                key={`${r.type}-${i}`}
                onClick={r.action}
                onMouseEnter={() => setSelIdx(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', minHeight: 44,
                  cursor: 'pointer',
                  background: selIdx === i ? 'rgba(68,128,216,.1)' : 'transparent',
                  borderLeft: selIdx === i ? '3px solid var(--bl)' : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{r.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.sub}
                  </div>
                </div>
                <span style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 3,
                  background: 'var(--surf2)', color: 'var(--t4)',
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
                  flexShrink: 0,
                }}>
                  {typeLabel[r.type] || r.type}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 12, fontSize: 10, color: 'var(--t4)',
        }}>
          <span>↑↓ {t('search.navigate')}</span>
          <span>↵ {t('search.select')}</span>
          <span>esc {t('search.close')}</span>
        </div>
      </div>
    </>
  )
}
