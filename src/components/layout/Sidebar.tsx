// ══════════════════════════════════════════════════
//  R3STO — Sidebar
//  Navigation principale latérale — collapsible
// ══════════════════════════════════════════════════

import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { computeAlerts } from '../../utils/alerts'
import { type PlanId, hasPlan } from '../../utils/stripe'

interface NavItem {
  path: string
  icon: string
  labelKey: string
  badge?: 'count' | 'pending' | 'waitlist' | number
  locked?: boolean
  moduleId?: string   // Si défini, verrouillé sauf si enabledModules contient ce moduleId
  groupKey?: string
  minPlan?: PlanId
}

const NAV_ITEMS: NavItem[] = [
  // ── RÉSERVATIONS (cœur du quotidien) ──
  { path: '/dashboard',     icon: '📊', labelKey: 'nav.dashboard', badge: 'count', groupKey: 'reservations' },
  { path: '/nouvelle-resa', icon: '➕', labelKey: 'nav.nouvelleResa', groupKey: 'reservations' },
  { path: '/agenda',        icon: '📅', labelKey: 'nav.agenda', groupKey: 'reservations' },
  { path: '/reservations',  icon: '📖', labelKey: 'nav.journal', groupKey: 'reservations' },
  { path: '/grille',        icon: '🪑', labelKey: 'nav.grid', groupKey: 'reservations' },
  { path: '/plan',          icon: '📐', labelKey: 'nav.floorplan', groupKey: 'reservations', minPlan: 'resto' },
  { path: '/waitlist',      icon: '⏳', labelKey: 'nav.waitlist', badge: 'waitlist', groupKey: 'reservations', minPlan: 'resto' },
  { path: '/groupes',       icon: '👥', labelKey: 'nav.groups', badge: 'pending', groupKey: 'reservations', minPlan: 'resto' },
  // ── R3STO ORDER (service en salle — quotidien) ──
  { path: '/commandes',     icon: '🔔', labelKey: 'nav.orders', groupKey: 'r3sto-order' },
  { path: '/kds-cuisine',   icon: '🍳', labelKey: 'nav.kdsCuisine', groupKey: 'r3sto-order', moduleId: 'order' },
  { path: '/kds-bar',       icon: '🍸', labelKey: 'nav.kdsBar', groupKey: 'r3sto-order', moduleId: 'order' },
  { path: '/service',       icon: '🧑\u200d💼', labelKey: 'nav.service', groupKey: 'r3sto-order', moduleId: 'order' },
  { path: '/caisse',        icon: '💰', labelKey: 'nav.register', groupKey: 'r3sto-order', moduleId: 'order' },
  // ── R3STO DELIVERY (livraison — quotidien) ──
  { path: '/delivery',          icon: '🛵', labelKey: 'nav.delivery', groupKey: 'r3sto-delivery' },
  { path: '/delivery-orders',   icon: '📦', labelKey: 'nav.deliveryOrders', groupKey: 'r3sto-delivery' },
  { path: '/delivery-tracking', icon: '📍', labelKey: 'nav.deliveryTracking', groupKey: 'r3sto-delivery', moduleId: 'delivery' },
  { path: '/delivery-zones',    icon: '🗺️', labelKey: 'nav.deliveryZones', groupKey: 'r3sto-delivery', moduleId: 'delivery' },
  // ── CLIENTS (CRM + fidélisation) ──
  { path: '/clients',       icon: '👤', labelKey: 'nav.clients', groupKey: 'clients', minPlan: 'resto' },
  { path: '/avis',          icon: '⭐', labelKey: 'nav.reviews', groupKey: 'clients', minPlan: 'gastro' },
  { path: '/fidelite',      icon: '🏆', labelKey: 'nav.loyalty', groupKey: 'clients', minPlan: 'resto' },
  { path: '/marketing',     icon: '📣', labelKey: 'nav.campaigns', groupKey: 'clients', minPlan: 'resto' },
  { path: '/blacklist',     icon: '🚫', labelKey: 'nav.blacklist', groupKey: 'clients', minPlan: 'resto' },
  // ── CANAUX (présence en ligne + revenus) ──
  { path: '/site-vitrine',  icon: '🖥️', labelKey: 'nav.siteVitrine', groupKey: 'channels', minPlan: 'gastro' },
  { path: '/widget',        icon: '🌐', labelKey: 'nav.widget', groupKey: 'channels', minPlan: 'resto' },
  { path: '/menu',          icon: '📋', labelKey: 'nav.menu', groupKey: 'channels', minPlan: 'resto' },
  { path: '/qrcode',        icon: '📱', labelKey: 'nav.qrcode', groupKey: 'channels', minPlan: 'resto' },
  { path: '/cadeaux',       icon: '🎁', labelKey: 'nav.giftCards', groupKey: 'channels', minPlan: 'resto' },
  { path: '/prepaiement',   icon: '💳', labelKey: 'nav.prepayment', groupKey: 'channels', minPlan: 'gastro' },
  { path: '/marketplace',   icon: '🛒', labelKey: 'nav.marketplace', groupKey: 'channels', minPlan: 'resto' },
  { path: '/modules',       icon: '🧩', labelKey: 'nav.modules', groupKey: 'channels' },
  // ── R3STO CRM (admin only — prospects + newsletter) ──
  { path: '/crm',          icon: '📇', labelKey: 'nav.crm', groupKey: 'r3sto-crm' },
  { path: '/newsletter',   icon: '📧', labelKey: 'nav.newsletter', groupKey: 'r3sto-crm' },
  // ── ADMIN ERP (admin only — gestion complète R3STO) ──
  { path: '/admin-dashboard',   icon: '📊', labelKey: 'nav.adminDashboard', groupKey: 'admin-erp' },
  { path: '/equipes',           icon: '👷', labelKey: 'nav.equipes', groupKey: 'admin-erp' },
  { path: '/finance',           icon: '💶', labelKey: 'nav.finance', groupKey: 'admin-erp' },
  { path: '/data-intelligence', icon: '🧠', labelKey: 'nav.dataIntelligence', groupKey: 'admin-erp' },
  { path: '/pricing-strategy',  icon: '💰', labelKey: 'nav.pricingStrategy', groupKey: 'admin-erp' },
  { path: '/plateforme',        icon: '🖥️', labelKey: 'nav.plateforme', groupKey: 'admin-erp' },
  { path: '/audit',             icon: '🔍', labelKey: 'nav.audit', groupKey: 'admin-erp' },
  { path: '/alertes',           icon: '⚠️', labelKey: 'nav.alertes', groupKey: 'admin-erp' },
  // ── ADMIN MARKETPLACE (admin only) ──
  { path: '/admin-marketplace', icon: '🏪', labelKey: 'nav.adminMarketplace', groupKey: 'admin-marketplace' },
  // ── RÉGLAGES (toute la configuration) ──
  { path: '/profil',        icon: '🍽️', labelKey: 'nav.myRestaurant', groupKey: 'settings' },
  { path: '/salles',        icon: '🚪', labelKey: 'nav.roomsServices', groupKey: 'settings' },
  { path: '/tables',        icon: '🪑', labelKey: 'nav.tablesCombos', groupKey: 'settings', minPlan: 'resto' },
  { path: '/setup-plan',    icon: '🔧', labelKey: 'nav.tablesPlan', groupKey: 'settings', minPlan: 'resto' },
  { path: '/fermetures',    icon: '🔒', labelKey: 'nav.closures', groupKey: 'settings' },
  { path: '/options',       icon: '⚙️', labelKey: 'nav.options', groupKey: 'settings' },
  { path: '/acces-roles',   icon: '🔐', labelKey: 'nav.teamAccess', groupKey: 'settings', minPlan: 'resto' },
  { path: '/multisite',     icon: '🏢', labelKey: 'nav.multisite', groupKey: 'settings', minPlan: 'gastro' },
  // ── AIDE ──
  { path: '/historique',    icon: '📜', labelKey: 'nav.history', groupKey: 'help' },
  { path: '/admin-tickets', icon: '🎫', labelKey: 'nav.tickets', groupKey: 'help' },
  { path: '/support',       icon: '💬', labelKey: 'nav.support', groupKey: 'help' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sidebarCollapsed, resas, activeDate, userRole, resto } = useAppStore()
  const { t } = useT()

  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  const currentPlan = (resto?.plan as PlanId) || 'bistro'
  const isAdmin = window.location.hostname.startsWith('admin.')
  const collapsed = sidebarCollapsed
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const toggleGroup = (gk: string) => setCollapsedGroups(prev => ({ ...prev, [gk]: !prev[gk] }))
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
    <nav className="sidebar" style={{
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
        {(() => {
          const filtered = (searchOpen && searchQ ? NAV_ITEMS.filter(n => t(n.labelKey).toLowerCase().includes(searchQ.toLowerCase())) : NAV_ITEMS).filter(item => {
            // Admin panel : ne montrer que CRM, Newsletter, aide
            if (isAdmin) return item.groupKey === 'r3sto-crm' || item.groupKey === 'admin-marketplace' || item.groupKey === 'admin-erp' || item.groupKey === 'help'
            // App normale : cacher le groupe r3sto-crm
            return item.groupKey !== 'r3sto-crm' && item.groupKey !== 'admin-marketplace' && item.groupKey !== 'admin-erp'
          })
          return filtered.map((item, i) => {
          // Module-gated + plan-gated
          const planLocked = item.minPlan ? !hasPlan(currentPlan, item.minPlan) : false
          const isLocked = item.locked || planLocked
          const isActive = location.pathname === item.path
          const showGroup = item.groupKey && (i === 0 || item.groupKey !== filtered[i-1]?.groupKey)
          const isGroupCollapsed = item.groupKey ? collapsedGroups[item.groupKey] : false
          const groupKeyMap: Record<string, { label: string; badge?: string }> = {
            reservations: { label: 'nav.reservations' },
            clients: { label: 'nav.clients_section' },
            channels: { label: 'nav.channels' },
            'r3sto-order': { label: 'R3STO Order' },
            'r3sto-delivery': { label: 'R3STO Delivery' },
            'r3sto-crm': { label: 'R3STO CRM' },
            settings: { label: 'nav.settings' },
            help: { label: 'nav.help' },
            'admin-erp': { label: 'R3STO ERP' },
            'admin-marketplace': { label: 'Marketplace' },
          }
          const displayLabel = t(item.labelKey)
          const groupConfig = item.groupKey ? groupKeyMap[item.groupKey] : undefined
          const displayGroup = groupConfig ? (groupConfig.label.startsWith('nav.') ? t(groupConfig.label) : groupConfig.label) : undefined

          // Hide items if their group is collapsed (but always show active item)
          if (isGroupCollapsed && !showGroup && !isActive) return null

          return (
            <div key={item.path}>
              {showGroup && !collapsed && (
                <div
                  onClick={() => item.groupKey && toggleGroup(item.groupKey)}
                  style={{
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '.1em', textTransform: 'uppercase',
                    color: 'var(--t4)', padding: '10px 9px 3px',
                    display: 'flex', alignItems: 'center', gap: 6,
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <span style={{
                    fontSize: 8, transition: 'transform .15s',
                    transform: isGroupCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    opacity: 0.5,
                  }}>▼</span>
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
                  {isGroupCollapsed && (
                    <span style={{ fontSize: 8, color: 'var(--t4)', fontFamily: 'var(--fm)', fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>
                      …
                    </span>
                  )}
                </div>
              )}
              {showGroup && collapsed && i > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 6px' }} />
              )}
              <button
                onClick={() => !isLocked && navigate(item.path)}
                title={collapsed ? displayLabel : undefined}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: collapsed ? '8px 0' : '8px 9px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? 'var(--bp)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--b2)' : 'transparent'}`,
                  borderRadius: 8,
                  color: isActive ? 'var(--bl)' : isLocked ? 'var(--t4)' : 'var(--t2)',
                  cursor: isLocked ? 'default' : 'pointer',
                  textAlign: 'left',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--ff)',
                  marginBottom: 2,
                  opacity: isLocked ? 0.55 : 1,
                  transition: 'all .1s',
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && (
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayLabel}
                  </span>
                )}
                {!collapsed && isLocked && (
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: 'rgba(245,158,11,.12)', color: 'var(--am)', letterSpacing: '.03em' }}>BIENTÔT</span>
                )}
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
        })
        })()}
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

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          title={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, width: '100%', padding: collapsed ? '8px 0' : '6px 8px',
            background: 'transparent', border: 'none', borderRadius: 6,
            color: 'var(--t3)', cursor: 'pointer', fontSize: 12,
            fontFamily: 'var(--ff)', transition: 'color .12s',
          }}
        >
          <span style={{ fontSize: 14, transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform .2s' }}>☰</span>
          {!collapsed && <span>Réduire</span>}
        </button>

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
            onClick={() => navigate('/acces-roles')}
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
            <span>{
              userRole === 'superadmin' ? '🛡️' :
              userRole === 'cto' ? '💻' :
              userRole === 'coo' ? '📋' :
              userRole === 'manager' ? '👔' :
              userRole === 'dev' ? '🔧' :
              userRole === 'sales' ? '💼' :
              userRole === 'marketing' ? '📣' :
              userRole === 'rh' ? '👥' :
              userRole === 'comptable' ? '🧮' :
              userRole === 'support' ? '🎧' :
              userRole === 'onboarding' ? '🚀' :
              userRole === 'stagiaire' ? '🎓' : '👤'
            }</span>
            <span>{
              userRole === 'superadmin' ? 'Super Admin' :
              userRole === 'cto' ? 'CTO' :
              userRole === 'coo' ? 'COO' :
              userRole === 'manager' ? 'Manager' :
              userRole === 'dev' ? 'Développeur' :
              userRole === 'sales' ? 'Commercial' :
              userRole === 'marketing' ? 'Marketing' :
              userRole === 'rh' ? 'RH' :
              userRole === 'comptable' ? 'Comptable' :
              userRole === 'support' ? 'Support' :
              userRole === 'onboarding' ? 'Onboarding' :
              userRole === 'stagiaire' ? 'Stagiaire' :
              userRole.charAt(0).toUpperCase() + userRole.slice(1)
            }</span>
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
              <div>{resto.name || 'Restaurant'}</div>
              <div style={{ fontSize: 9, color: 'var(--t4)' }}>{(resto.plan || 'bistro').charAt(0).toUpperCase() + (resto.plan || 'bistro').slice(1)}</div>
            </div>
          </button>
        )}
      </div>
    </nav>
    </>
  )
}
