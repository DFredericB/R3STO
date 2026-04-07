// ══════════════════════════════════════════════════
//  R3STO — Sidebar
//  Navigation principale latérale — collapsible
// ══════════════════════════════════════════════════

import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { computeAlerts } from '../../utils/alerts'

interface NavItem {
  path: string
  icon: string
  labelKey: string
  badge?: 'count' | 'pending' | 'waitlist' | number
  locked?: boolean
  groupKey?: string
}

const NAV_ITEMS: NavItem[] = [
  // OPÉRATIONS
  { path: '/dashboard',     icon: '📊', labelKey: 'nav.dashboard', badge: 'count', groupKey: 'operations' },
  { path: '/nouvelle-resa', icon: '➕', labelKey: 'nav.nouvelleResa', groupKey: 'operations' },
  { path: '/agenda',        icon: '📅', labelKey: 'nav.agenda', groupKey: 'operations' },
  { path: '/reservations',  icon: '📖', labelKey: 'nav.journal', groupKey: 'operations' },
  { path: '/grille',        icon: '🪑', labelKey: 'nav.grid', groupKey: 'operations' },
  { path: '/plan',          icon: '📐', labelKey: 'nav.floorplan', groupKey: 'operations' },
  { path: '/waitlist',      icon: '⏳', labelKey: 'nav.waitlist', badge: 'waitlist', groupKey: 'operations' },
  { path: '/groupes',       icon: '👥', labelKey: 'nav.groups', badge: 'pending', groupKey: 'operations' },
  // CLIENTS & MARKETING
  { path: '/clients',       icon: '👥', labelKey: 'nav.clients', groupKey: 'clients' },
  { path: '/marketing',     icon: '📣', labelKey: 'nav.campaigns', groupKey: 'clients' },
  { path: '/blacklist',     icon: '🚫', labelKey: 'nav.blacklist', groupKey: 'clients' },
  { path: '/avis',          icon: '⭐', labelKey: 'nav.reviews', groupKey: 'clients' },
  { path: '/fidelite',     icon: '🏆', labelKey: 'nav.loyalty', groupKey: 'clients' },
  // CANAUX & REVENUS
  { path: '/widget',        icon: '🔌', labelKey: 'nav.widget', groupKey: 'channels' },
  { path: '/qrcode',        icon: '📱', labelKey: 'nav.qrcode', groupKey: 'channels' },
  { path: '/menu',          icon: '📋', labelKey: 'nav.menu', groupKey: 'channels' },
  { path: '/commandes',     icon: '🔔', labelKey: 'nav.orders', groupKey: 'channels' },
  { path: '/prepaiement',   icon: '💳', labelKey: 'nav.prepayment', groupKey: 'channels' },
  { path: '/cadeaux',       icon: '🎁', labelKey: 'nav.giftCards', groupKey: 'channels' },
  // R3STO ORDER (BÊTA) — flouté / bientôt disponible
  { path: '/kds-cuisine',   icon: '🍳', labelKey: 'nav.kdsCuisine', groupKey: 'r3sto-order', locked: true },
  { path: '/kds-bar',       icon: '🍸', labelKey: 'nav.kdsBar', groupKey: 'r3sto-order', locked: true },
  { path: '/service',       icon: '🧑‍💼', labelKey: 'nav.service', groupKey: 'r3sto-order', locked: true },
  { path: '/caisse',        icon: '💰', labelKey: 'nav.register', groupKey: 'r3sto-order', locked: true },
  // CONFIGURATION
  { path: '/profil',        icon: '🍽️', labelKey: 'nav.myRestaurant', groupKey: 'config' },
  { path: '/salles',        icon: '🚪', labelKey: 'nav.roomsServices', groupKey: 'config' },
  { path: '/fermetures',    icon: '📅', labelKey: 'nav.closures', groupKey: 'config' },
  { path: '/setup-plan',    icon: '📐', labelKey: 'nav.planTables', groupKey: 'config' },
  { path: '/options',       icon: '⚙️', labelKey: 'nav.options', groupKey: 'config' },
  { path: '/multisite',     icon: '🏢', labelKey: 'nav.multisite', groupKey: 'config' },
  // ADMINISTRATION
  { path: '/acces-roles',   icon: '🔐', labelKey: 'nav.teamAccess', groupKey: 'admin' },
  { path: '/historique',    icon: '📜', labelKey: 'nav.history', groupKey: 'admin' },
  { path: '/support',       icon: '💬', labelKey: 'nav.support', groupKey: 'admin' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sidebarCollapsed, resas, activeDate } = useAppStore()
  const { t } = useT()

  const collapsed = sidebarCollapsed
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (searchOpen && searchRef.current) searchRef.current.focus() }, [searchOpen])
  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(o => !o); setSearchQ('') } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const alerts = useMemo(() => computeAlerts(resas, activeDate), [resas, activeDate])
  const dayResas = useMemo(() => resas.filter(r => r.date === activeDate && r.s !== 'cancelled'), [resas, activeDate])
  const w = collapsed ? 'var(--sbc)' : 'var(--sb)'

  return (
    <>
    <style>{`@keyframes sidebarPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    <nav style={{
      width: w,
      minWidth: collapsed ? 56 : 230,
      background: 'var(--surf)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      height: 'calc(100vh - var(--hh))',
      transition: 'width .2s ease, min-width .2s ease',
    }}>
      <div style={{ padding: collapsed ? '8px 4px' : '8px 6px', flex: 1 }}>
        {(searchOpen && searchQ ? NAV_ITEMS.filter(n => t(n.labelKey).toLowerCase().includes(searchQ.toLowerCase())) : NAV_ITEMS).map((item, i) => {
          const isActive = location.pathname === item.path
          const showGroup = item.groupKey && (i === 0 || item.groupKey !== NAV_ITEMS[i-1]?.groupKey)
          const groupKeyMap: Record<string, { label: string; badge?: string }> = {
            operations: { label: 'nav.operations' },
            clients: { label: 'nav.clientsMarketing' },
            channels: { label: 'nav.channelsRevenue' },
            'r3sto-order': { label: 'R3STO Order', badge: 'BÊTA' },
            config: { label: 'nav.config' },
            admin: { label: 'nav.admin' },
          }
          const displayLabel = t(item.labelKey)
          const groupConfig = item.groupKey ? groupKeyMap[item.groupKey] : undefined
          const displayGroup = groupConfig ? (groupConfig.label.startsWith('nav.') ? t(groupConfig.label) : groupConfig.label) : undefined

          return (
            <div key={item.path}>
              {showGroup && !collapsed && (
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '.1em', textTransform: 'uppercase',
                  color: 'var(--t4)', padding: '10px 9px 3px',
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <span>{displayGroup}</span>
                  {groupConfig?.badge && (
                    <span style={{
                      fontSize: 7, fontWeight: 600, letterSpacing: '.05em',
                      padding: '2px 4px', borderRadius: 3,
                      background: 'var(--bl)', color: '#fff'
                    }}>
                      {groupConfig.badge}
                    </span>
                  )}
                </div>
              )}
              {showGroup && collapsed && i > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 6px' }} />
              )}
              <button
                onClick={() => !item.locked && navigate(item.path)}
                title={collapsed ? displayLabel : undefined}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: collapsed ? '8px 0' : '8px 9px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? 'var(--bp)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--b2)' : 'transparent'}`,
                  borderRadius: 8,
                  color: isActive ? 'var(--bl)' : item.locked ? 'var(--t4)' : 'var(--t2)',
                  cursor: item.locked ? 'default' : 'pointer',
                  textAlign: 'left',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--ff)',
                  marginBottom: 2,
                  opacity: item.locked ? 0.55 : 1,
                  transition: 'all .1s',
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && (
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayLabel}
                  </span>
                )}
                {!collapsed && item.locked && <span style={{ fontSize: 11 }}>🔒</span>}
                {(() => {
                  // Live badge counts
                  let badgeCount = 0
                  let badgeBg = 'var(--bl)'
                  let pulse = false
                  if (item.badge === 'count') {
                    badgeCount = dayResas.length
                    badgeBg = 'var(--bl)'
                  } else if (item.badge === 'waitlist') {
                    badgeCount = alerts.waitlist
                    badgeBg = badgeCount > 0 ? '#e8a530' : 'var(--t4)'
                    pulse = badgeCount > 0
                  } else if (item.badge === 'pending') {
                    badgeCount = alerts.groups
                    badgeBg = badgeCount > 0 ? '#b482ff' : 'var(--t4)'
                    pulse = badgeCount > 0
                  }
                  if (!item.badge || collapsed) return null
                  if (badgeCount === 0 && item.badge !== 'count') return null
                  return (
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      padding: '1px 5px', borderRadius: 10,
                      background: badgeBg, color: '#fff',
                      flexShrink: 0, minWidth: 18, textAlign: 'center',
                      animation: pulse ? 'sidebarPulse 2s ease-in-out infinite' : undefined,
                    }}>{badgeCount}</span>
                  )
                })()}
                {collapsed && (() => {
                  // Dot indicator in collapsed mode
                  let dotCount = 0
                  let dotColor = ''
                  if (item.badge === 'waitlist' && alerts.waitlist > 0) { dotCount = alerts.waitlist; dotColor = '#e8a530' }
                  if (item.badge === 'pending' && alerts.groups > 0) { dotCount = alerts.groups; dotColor = '#b482ff' }
                  if (item.badge === 'count' && dayResas.length > 0) { dotCount = dayResas.length; dotColor = 'var(--bl)' }
                  if (!dotCount) return null
                  return (
                    <span style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 7, height: 7, borderRadius: '50%',
                      background: dotColor,
                      animation: (item.badge === 'waitlist' || item.badge === 'pending') && dotCount > 0 ? 'sidebarPulse 2s ease-in-out infinite' : undefined,
                    }} />
                  )
                })()}
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer Section */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: collapsed ? '8px 4px' : '12px 8px',
        display: 'flex', flexDirection: 'column', gap: 8
      }}>
        {/* Search Bar */}
        {!collapsed && (
          searchOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
              <input ref={searchRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQ('') }
                  if (e.key === 'Enter') {
                    const q = searchQ.toLowerCase()
                    const match = NAV_ITEMS.find(n => t(n.labelKey).toLowerCase().includes(q))
                    if (match) { navigate(match.path); setSearchOpen(false); setSearchQ('') }
                  }
                }}
                placeholder="Chercher..."
                style={{
                  flex: 1, padding: '6px 8px', fontSize: 12, fontFamily: 'var(--ff)',
                  background: 'var(--bg2)', border: '1.5px solid var(--bl)', borderRadius: 6,
                  color: 'var(--text)', outline: 'none',
                }} />
              <button onClick={() => { setSearchOpen(false); setSearchQ('') }}
                style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => { setSearchOpen(true); setSearchQ('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '6px 8px',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--t3)',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'var(--ff)',
              }}
            >
              <span>🔍</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Chercher</span>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>⌘K</span>
            </button>
          )
        )}

        {/* Version */}
        <div style={{
          fontSize: 10, color: 'var(--t4)',
          fontFamily: 'var(--fm)',
          textAlign: collapsed ? 'center' : 'left',
          padding: collapsed ? 0 : '0 8px',
        }}>
          {collapsed ? 'β' : 'v1.1.0-beta'}
        </div>

        {/* Role Badge */}
        {!collapsed && (
          <button
            onClick={() => navigate('/acces')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              width: '100%', padding: '6px 8px',
              background: 'transparent', border: 'none',
              borderRadius: 6,
              color: 'var(--t2)',
              cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--ff)',
              justifyContent: 'flex-start',
            }}
          >
            <span>👑</span>
            <span>Propriétaire</span>
          </button>
        )}

        {/* Plan Card */}
        {!collapsed && (
          <button
            onClick={() => navigate('/profil')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              width: '100%', padding: '8px',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--t2)',
              cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--ff)',
              justifyContent: 'flex-start',
              transition: 'all .1s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg2)'}
          >
            <span>💎</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div>Restaurant</div>
              <div style={{ fontSize: 9, color: 'var(--t4)' }}>Premium</div>
            </div>
          </button>
        )}
      </div>
    </nav>
    </>
  )
}
