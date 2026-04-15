// ══════════════════════════════════════════════════
//  R3STO — Sidebar
//  Navigation principale latérale — collapsible
//  Zéro hardcoding : NAV_ITEMS dans utils/nav.ts,
//  rôles dans utils/roles.ts, plans dans utils/plans.ts,
//  permissions dans utils/permissions.ts.
// ══════════════════════════════════════════════════

import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { computeAlerts } from '../../utils/alerts'
import { NAV_ITEMS, NAV_GROUPS, type NavItem, type NavGroupKey } from '../../utils/nav'
import { planAtLeast } from '../../utils/plans'
import { usePermission } from '../../utils/permissions'
import { ROLES } from '../../utils/roles'
import { PLAN_META } from '../../utils/plans'
import { isAdminHost } from '../../utils/host'

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  // Selectors individuels (évite re-render global)
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed)
  const resas = useAppStore(s => s.resas)
  const activeDate = useAppStore(s => s.activeDate)
  const userRole = useAppStore(s => s.userRole)
  const resto = useAppStore(s => s.resto)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  const isDemo = useAppStore(s => s.isDemo)
  const openUpgradePrompt = useAppStore(s => s.openUpgradePrompt)

  const { t } = useT()
  const canManageUsers = usePermission('manageUsers')
  const canAccessAdmin = usePermission('accessAdminConsole')
  const canViewFinance = usePermission('viewFinance')
  const canViewCrm = usePermission('viewCrm')
  const canManageMarketing = usePermission('manageMarketing')
  const canViewLogs = usePermission('viewLogs')
  const canManageSites = usePermission('manageSites')

  const onAdminHost = isAdminHost()
  const collapsed = sidebarCollapsed
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const toggleGroup = (gk: string) => setCollapsedGroups(prev => ({ ...prev, [gk]: !prev[gk] }))
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (searchOpen && searchRef.current) searchRef.current.focus() }, [searchOpen])

  // Map des checks de permission par clé d'action (évite switch)
  const permByAction: Record<string, boolean> = {
    manageUsers: canManageUsers,
    accessAdminConsole: canAccessAdmin,
    viewFinance: canViewFinance,
    viewCrm: canViewCrm,
    manageMarketing: canManageMarketing,
    viewLogs: canViewLogs,
    manageSites: canManageSites,
  }

  const alerts = useMemo(() => computeAlerts(resas, activeDate), [resas, activeDate])
  const dayResas = useMemo(
    () => resas.filter(r => r.date === activeDate && r.s !== 'cancelled'),
    [resas, activeDate]
  )

  // Filtrage : adminOnly (hostname), permissions, recherche
  const visibleItems = useMemo<NavItem[]>(() => {
    const q = searchQ.trim().toLowerCase()
    return NAV_ITEMS.filter(item => {
      // 1. adminOnly : visible seulement sur admin.r3sto.ch OU si on a la perm admin console
      if (item.adminOnly && !(onAdminHost || canAccessAdmin)) return false
      // 2. Permission requise (démo bypass dans usePermission)
      if (item.requires && !permByAction[item.requires] && !isDemo) return false
      // 3. Sur admin host : ne montrer QUE les items adminOnly + help
      if (onAdminHost && !item.adminOnly && item.groupKey !== 'help') return false
      // 4. Recherche
      if (searchOpen && q) {
        return t(item.labelKey).toLowerCase().includes(q)
      }
      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onAdminHost, isDemo, searchOpen, searchQ, canAccessAdmin, canManageUsers, canViewFinance, canViewCrm, canManageMarketing, canViewLogs, canManageSites, t])

  const w = collapsed ? 'var(--sbc)' : 'var(--sb)'
  const roleMeta = ROLES[userRole]
  const currentPlan = (resto?.plan as keyof typeof PLAN_META) || 'bistro'
  const planMeta = PLAN_META[currentPlan]

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
        {visibleItems.map((item, i) => {
          const planLocked = item.minPlan ? !planAtLeast(item.minPlan) : false
          const isLocked = !!item.wip || planLocked
          const isActive = location.pathname === item.path
          const onItemClick = () => {
            if (item.wip) return // "Bientôt" : pas de popup
            if (planLocked && item.minPlan) {
              openUpgradePrompt({ minPlan: item.minPlan, featureLabelKey: item.labelKey, icon: item.icon })
              return
            }
            navigate(item.path)
          }
          const prev = visibleItems[i - 1]
          const showGroup = i === 0 || item.groupKey !== prev?.groupKey
          const isGroupCollapsed = collapsedGroups[item.groupKey] || false
          const groupLabelKey = NAV_GROUPS[item.groupKey as NavGroupKey]
          const displayLabel = t(item.labelKey)
          const displayGroup = t(groupLabelKey)

          if (isGroupCollapsed && !showGroup && !isActive) return null

          return (
            <div key={item.path}>
              {showGroup && !collapsed && (
                <div
                  onClick={() => toggleGroup(item.groupKey)}
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
                onClick={onItemClick}
                title={collapsed ? displayLabel : planLocked ? t('upgrade.required') : undefined}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: collapsed ? '8px 0' : '8px 9px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? 'var(--bp)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--b2)' : 'transparent'}`,
                  borderRadius: 8,
                  color: isActive ? 'var(--bl)' : isLocked ? 'var(--t4)' : 'var(--t2)',
                  cursor: item.wip ? 'default' : 'pointer',
                  textAlign: 'left',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--ff)',
                  marginBottom: 2,
                  opacity: item.wip ? 0.45 : 1,
                  transition: 'all .15s',
                }}
              >
                <span style={{
                  fontSize: 16, flexShrink: 0,
                  opacity: planLocked ? 0.85 : 1,
                }}>{item.icon}</span>
                {!collapsed && (
                  <span style={{
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    filter: planLocked ? 'blur(2px)' : undefined,
                    opacity: planLocked ? 0.55 : 1,
                    transition: 'filter .2s',
                    userSelect: planLocked ? 'none' : undefined,
                  }}>
                    {displayLabel}
                  </span>
                )}
                {!collapsed && planLocked && item.minPlan && (
                  <span style={{
                    fontSize: 9, fontWeight: 800,
                    padding: '2px 6px', borderRadius: 4,
                    background: 'var(--bg3)',
                    color: PLAN_META[item.minPlan].color,
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}>🔒 {t(PLAN_META[item.minPlan].labelKey)}</span>
                )}
                {!collapsed && item.wip && (
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: 'rgba(245,158,11,.12)', color: 'var(--am)', letterSpacing: '.03em' }}>{t('sidebar.wip')}</span>
                )}
                {(() => {
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
                onKeyDown={e => {
                  if (e.key === 'Escape') { setSearchOpen(false); setSearchQ('') }
                  if (e.key === 'Enter') {
                    const q = searchQ.toLowerCase()
                    const match = visibleItems.find(n => t(n.labelKey).toLowerCase().includes(q))
                    if (match) { navigate(match.path); setSearchOpen(false); setSearchQ('') }
                  }
                }}
                placeholder={t('sidebar.searchPlaceholder')}
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
              <span style={{ flex: 1, textAlign: 'left' }}>{t('sidebar.search')}</span>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>⌘K</span>
            </button>
          )
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          title={collapsed ? t('sidebar.open') : t('sidebar.close')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, width: '100%', padding: collapsed ? '8px 0' : '6px 8px',
            background: 'transparent', border: 'none', borderRadius: 6,
            color: 'var(--t3)', cursor: 'pointer', fontSize: 12,
            fontFamily: 'var(--ff)', transition: 'color .12s',
          }}
        >
          <span style={{ fontSize: 14, transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform .2s' }}>☰</span>
          {!collapsed && <span>{t('sidebar.collapse')}</span>}
        </button>

        {/* Version */}
        <div style={{
          fontSize: 10, color: 'var(--t4)',
          fontFamily: 'var(--fm)',
          textAlign: collapsed ? 'center' : 'left',
          padding: collapsed ? 0 : '0 8px',
        }}>
          {collapsed ? 'β' : `v${APP_VERSION}`}
        </div>

        {/* Role Badge (via ROLES dict) */}
        {!collapsed && roleMeta && (
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
            <span>{roleMeta.icon}</span>
            <span>{t(roleMeta.labelKey)}</span>
          </button>
        )}

        {/* Plan Card (via PLAN_META dict) */}
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
              <div>{resto?.name || t('sidebar.restaurant')}</div>
              <div style={{ fontSize: 9, color: 'var(--t4)' }}>{t(planMeta.labelKey)}</div>
            </div>
          </button>
        )}
      </div>
    </nav>
    </>
  )
}
                                                            