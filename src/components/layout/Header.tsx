// ══════════════════════════════════════════════════
//  R3STO — Header
//  Barre supérieure : logo, date/heure, actions
// ══════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { Logo } from '../ui/Logo'
import { SearchModal } from '../ui/SearchModal'
import { computeAlerts } from '../../utils/alerts'
import type { Resa } from '../../types'

function formatTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const LANGS = ['FR', 'DE', 'IT', 'EN'] as const

// ── Types notification ──────────────────────────
type NotifType = 'new' | 'noshow' | 'cancelled' | 'widget' | 'vip' | 'allergy' | 'system' | 'action'

interface Notif {
  id: string
  type: NotifType
  icon: string
  title: string
  detail: string
  ts: number       // timestamp
  read: boolean
}

// ── Génère les notifications à partir des réservations du jour ──
function buildNotifs(resas: Resa[], date: string, t: (k: string) => string): Notif[] {
  const todayResas = resas.filter(r => r.date === date)
  const notifs: Notif[] = []

  // Trier par createdAt desc pour les nouvelles résas
  const sorted = [...todayResas].sort((a, b) => b.createdAt - a.createdAt)

  for (const r of sorted) {
    // No-shows
    if (r.s === 'noshow') {
      notifs.push({
        id: `noshow-${r.id}`,
        type: 'noshow',
        icon: '🚫',
        title: t('notif.noshow'),
        detail: `${r.n} · ${r.t.replace('h', ':')} · ${r.c} ${t('notif.covers')}`,
        ts: r.createdAt,
        read: false,
      })
    }

    // Annulations
    if (r.s === 'cancelled') {
      notifs.push({
        id: `cancel-${r.id}`,
        type: 'cancelled',
        icon: '❌',
        title: t('notif.cancelled'),
        detail: `${r.n} · ${r.t.replace('h', ':')} · ${r.c} ${t('notif.covers')}`,
        ts: r.createdAt,
        read: false,
      })
    }

    // Résa widget
    if (r.canal === 'widget' && r.s === 'reserved') {
      notifs.push({
        id: `widget-${r.id}`,
        type: 'widget',
        icon: '🌐',
        title: t('notif.widgetResa'),
        detail: `${r.n} · ${r.t.replace('h', ':')} · ${r.c} ${t('notif.covers')}`,
        ts: r.createdAt,
        read: false,
      })
      continue // skip "new" for widget — already notified
    }

    // VIP arrivés
    if (r.statut === 2 && r.s === 'arrived') {
      notifs.push({
        id: `vip-${r.id}`,
        type: 'vip',
        icon: '⭐',
        title: t('notif.vipArrival'),
        detail: `${r.n} · ${r.tbl}`,
        ts: r.createdAt,
        read: false,
      })
    }

    // Alerte allergie
    if (r.allergie && r.s !== 'cancelled' && r.s !== 'noshow') {
      notifs.push({
        id: `allergy-${r.id}`,
        type: 'allergy',
        icon: '⚠️',
        title: t('notif.allergyAlert'),
        detail: `${r.n} · ${r.tbl} · ${r.t.replace('h', ':')}`,
        ts: r.createdAt,
        read: false,
      })
    }

    // Nouvelles résas récentes (< 2h) — sauf widget déjà traité
    if (r.s === 'reserved' && r.canal !== 'widget') {
      const ageMs = Date.now() - r.createdAt
      if (ageMs < 2 * 60 * 60 * 1000) { // < 2h
        notifs.push({
          id: `new-${r.id}`,
          type: 'new',
          icon: '📩',
          title: t('notif.newResa'),
          detail: `${r.n} · ${r.t.replace('h', ':')} · ${r.c} ${t('notif.covers')}`,
          ts: r.createdAt,
          read: false,
        })
      }
    }
  }

  // Trier par timestamp desc, max 12
  return notifs.sort((a, b) => b.ts - a.ts).slice(0, 12)
}

// ── Temps relatif ──────────────────────────────
function timeAgo(ts: number, t: (k: string) => string): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return t('notif.justNow')
  if (diff < 3600) return `${t('notif.ago')} ${Math.floor(diff / 60)} ${t('notif.minAgo')}`
  if (diff < 86400) return `${t('notif.ago')} ${Math.floor(diff / 3600)} ${t('notif.hAgo')}`
  return ''
}

export function Header() {
  const { activeDate, resas, resto, users, isDemo, services, toggleSidebar, sidebarCollapsed, lang, setLang, userRole, setUserRole, theme, setTheme } = useAppStore()
  const sites = useAppStore(s => s.sites)
  const activeSiteId = useAppStore(s => s.activeSiteId)
  const setActiveSite = useAppStore(s => s.setActiveSite)
  const navigate = useNavigate()
  const { t, fmtDate } = useT()
  const [time, setTime] = useState(formatTime())
  const todayDate = todayISO()

  // Service en cours
  // Service retiré du Header — uniquement dans Dashboard
  const _unused_currentService = useMemo(() => {
    const nowM = new Date().getHours() * 60 + new Date().getMinutes()
    const hmToMins = (s: string) => { const [h, m] = s.replace('h', ':').split(':').map(Number); return h * 60 + (m || 0) }
    return services.filter(s => s.active).find(s => nowM >= hmToMins(s.open) && nowM <= hmToMins(s.close)) || null
  }, [services, time]) // recalcule quand time change (toutes les 30s)
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSiteSwitch, setShowSiteSwitch] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // ⌘K / Ctrl+K raccourci recherche globale
  const handleSearchKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setShowSearch(prev => !prev)
    }
  }, [])
  useEffect(() => {
    window.addEventListener('keydown', handleSearchKey)
    return () => window.removeEventListener('keydown', handleSearchKey)
  }, [handleSearchKey])

  // Multi-site : site actif
  const activeSite = activeSiteId ? sites.find(s => s.id === activeSiteId) : null
  const displayName = activeSite ? activeSite.name : (resto.name || t('general.myRestaurant'))
  const hasMultiSites = sites.length > 0 && resto.plan === 'gastro'
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  // Utilisateur courant (premier actif ou fallback)
  const currentUser = users.find(u => u.active && u.role === userRole) || users.find(u => u.active) || null
  const userName = currentUser?.n || t('general.admin')
  const initials = userName.split(' ').map(w => w[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join('')
  const roleLabel = t(`role.${userRole}`)

  // Alertes opérationnelles (top bar)
  const alerts = useMemo(() => computeAlerts(resas, activeDate), [resas, activeDate])
  const unassigned = useMemo(() => resas.filter(r => r.date === activeDate && r.s !== 'cancelled' && r.s !== 'noshow' && r.s !== 'done' && !r.tbl).length, [resas, activeDate])

  // Notifications dynamiques
  const notifs = useMemo(() => buildNotifs(resas, activeDate, t), [resas, activeDate, t])
  const unreadCount = notifs.filter(n => !readIds.has(n.id)).length

  useEffect(() => {
    const interval = setInterval(() => setTime(formatTime()), 30000)
    return () => clearInterval(interval)
  }, [])

  // Fermer dropdowns au clic dehors
  useEffect(() => {
    if (!showNotif && !showProfile && !showSiteSwitch) return
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showNotif && !target.closest('[data-notif-panel]')) setShowNotif(false)
      if (showProfile && !target.closest('[data-profile-panel]')) setShowProfile(false)
      if (showSiteSwitch && !target.closest('[data-site-panel]')) setShowSiteSwitch(false)
    }
    document.addEventListener('click', close, true)
    return () => document.removeEventListener('click', close, true)
  }, [showNotif, showProfile, showSiteSwitch])

  const markAllRead = () => setReadIds(new Set(notifs.map(n => n.id)))

  const iconBtn: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surf3)',
    color: 'var(--t2)', cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all .12s',
  }

  return (
    <header style={{
      height: 'var(--hh)',
      background: 'var(--surf)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 16px',
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Bouton sidebar toggle — hamburger CSS animé */}
      <button
        onClick={toggleSidebar}
        title={sidebarCollapsed ? t('header.openMenu') : t('header.closeMenu')}
        style={{
          ...iconBtn,
          flexDirection: 'column',
          gap: sidebarCollapsed ? 4 : 0,
          padding: 0,
        }}
      >
        <span style={{
          display: 'block', width: 16, height: 2,
          background: 'var(--t2)', borderRadius: 1,
          transition: 'all .25s ease',
          transform: sidebarCollapsed ? 'none' : 'translateY(3px) rotate(45deg)',
        }} />
        <span style={{
          display: 'block', width: 16, height: 2,
          background: 'var(--t2)', borderRadius: 1,
          transition: 'all .2s ease',
          opacity: sidebarCollapsed ? 1 : 0,
        }} />
        <span style={{
          display: 'block', width: 16, height: 2,
          background: 'var(--t2)', borderRadius: 1,
          transition: 'all .25s ease',
          transform: sidebarCollapsed ? 'none' : 'translateY(-3px) rotate(-45deg)',
        }} />
      </button>

      {/* Logo R3STO */}
      <Logo size="md" />

      {/* Badge ADMIN visible sur admin.r3sto.ch */}
      {window.location.hostname.startsWith('admin.') && (
        <span style={{
          background: '#e67e22',
          color: '#fff',
          fontSize: 10,
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: 4,
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginLeft: 6,
          flexShrink: 0,
        }}>Admin</span>
      )}

      {/* Séparateur */}
      <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

      {/* Nom restaurant + site selector + indicateur connexion */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }} data-site-panel>
        <div
          style={{
            fontSize: 13, fontWeight: 700, color: 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: hasMultiSites ? 'pointer' : 'default',
          }}
          onClick={() => hasMultiSites && setShowSiteSwitch(!showSiteSwitch)}
        >
          {activeSite && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: activeSite.color, flexShrink: 0,
            }} />
          )}
          {displayName}
          <span
            title={t('header.connection')}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--gn)',
              display: 'inline-block', flexShrink: 0,
            }}
          />
          {hasMultiSites && (
            <span style={{ fontSize: 10, color: 'var(--t3)', flexShrink: 0 }}>▾</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t2)' }}>
          {`${t('header.today')} · ${fmtDate(todayDate)} · ${time}`}
        </div>

        {/* Site switcher dropdown */}
        {showSiteSwitch && (
          <div style={{
            position: 'absolute', top: 42, left: 0, width: 280,
            background: 'var(--surf2)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px var(--shadow)',
            zIndex: 200, overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px 12px', borderBottom: '1px solid var(--border)',
              fontSize: 10, fontWeight: 700, color: 'var(--t4)',
              textTransform: 'uppercase', letterSpacing: '.06em',
            }}>
              🏢 {t('multisite.switchSite')}
            </div>

            {/* Site principal */}
            <button
              onClick={() => { setActiveSite(null); setShowSiteSwitch(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 12px',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--ff)',
                background: !activeSiteId ? 'var(--bp)' : 'transparent',
                color: 'var(--text)', transition: 'background .12s',
                fontSize: 12, textAlign: 'left',
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'var(--bl)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, flexShrink: 0,
              }}>🏠</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: !activeSiteId ? 700 : 500, fontSize: 12 }}>
                  {resto.name || t('multisite.mainSite')}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{resto.ville}</div>
              </div>
              {!activeSiteId && <span style={{ color: 'var(--bl)', fontWeight: 700, fontSize: 11 }}>✓</span>}
            </button>

            {/* Sites additionnels */}
            {sites.map((site: any) => (
              <button
                key={site.id}
                onClick={() => { setActiveSite(site.id); setShowSiteSwitch(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 12px',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--ff)',
                  background: activeSiteId === site.id ? `${site.color}18` : 'transparent',
                  color: 'var(--text)', transition: 'background .12s',
                  fontSize: 12, textAlign: 'left',
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: site.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                }}>{site.name.charAt(0).toUpperCase()}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: activeSiteId === site.id ? 700 : 500, fontSize: 12 }}>
                    {site.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{site.ville}</div>
                </div>
                {activeSiteId === site.id && <span style={{ color: site.color, fontWeight: 700, fontSize: 11 }}>✓</span>}
              </button>
            ))}

            {/* Lien gestion */}
            <div style={{ borderTop: '1px solid var(--border)', padding: '6px 8px' }}>
              <button
                onClick={() => { setShowSiteSwitch(false); navigate('/multisite') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: '6px 8px', borderRadius: 6,
                  border: 'none', background: 'transparent',
                  color: 'var(--bl)', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--ff)',
                }}
              >
                ⚙️ {t('multisite.manageSites')}
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ── Alertes opérationnelles top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        {alerts.waitlist > 0 && (
          <button onClick={() => navigate('/waitlist')} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
            border: '1px solid rgba(232,165,48,.4)', background: 'rgba(232,165,48,.12)',
            fontSize: 11, fontWeight: 800, color: '#e8a530', fontFamily: 'var(--ff)',
            animation: 'headerAlertPulse 2s ease-in-out infinite',
          }}>
            ⏳ {alerts.waitlist} attente
          </button>
        )}
        {alerts.groups > 0 && (
          <button onClick={() => navigate('/groupes')} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
            border: '1px solid rgba(144,96,224,.35)', background: 'rgba(144,96,224,.1)',
            fontSize: 11, fontWeight: 800, color: '#b482ff', fontFamily: 'var(--ff)',
          }}>
            👥 {alerts.groups} groupes
          </button>
        )}
        {unassigned > 0 && (
          <button onClick={() => navigate('/reservations')} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
            border: '1px solid rgba(220,80,80,.35)', background: 'rgba(220,80,80,.1)',
            fontSize: 11, fontWeight: 800, color: 'var(--rd)', fontFamily: 'var(--ff)',
            animation: 'headerAlertPulse 2s ease-in-out infinite',
          }}>
            ⚠️ {unassigned} sans table
          </button>
        )}
        {alerts.arriving > 0 && (
          <button onClick={() => navigate('/grille')} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
            border: '1px solid rgba(91,156,246,.35)', background: 'rgba(91,156,246,.1)',
            fontSize: 11, fontWeight: 800, color: 'var(--bl)', fontFamily: 'var(--ff)',
          }}>
            🕐 {alerts.arriving} arrivent
          </button>
        )}
        {alerts.noshow > 0 && (
          <button onClick={() => navigate('/reservations')} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
            border: '1px solid rgba(100,116,139,.3)', background: 'rgba(100,116,139,.08)',
            fontSize: 11, fontWeight: 800, color: 'var(--t3)', fontFamily: 'var(--ff)',
          }}>
            👻 {alerts.noshow} no-show
          </button>
        )}
      </div>
      <style>{`@keyframes headerAlertPulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>

      {/* ── Pastilles droite : Recherche + Clair/Foncé + Plein écran ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <button
          onClick={() => setShowSearch(true)}
          style={iconBtn}
          title="Recherche ⌘K"
        >🔍</button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={iconBtn}
          title={theme === 'dark' ? 'Mode clair' : 'Mode foncé'}
        >{theme === 'dark' ? '☀️' : '🌙'}</button>
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen()
            } else {
              document.documentElement.requestFullscreen?.()
              if (!sidebarCollapsed) toggleSidebar()
            }
          }}
          style={iconBtn}
          title="Plein écran"
        >⛶</button>
      </div>

      <SearchModal open={showSearch} onClose={() => setShowSearch(false)} />

      {/* Notifications */}
      <div style={{ position: 'relative' }} data-notif-panel>
        <button onClick={() => setShowNotif(!showNotif)} style={iconBtn} title={t('header.notifications')}>
          🔔
        </button>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 16, height: 16, borderRadius: '50%',
            background: 'var(--rd)', color: '#fff', fontSize: 9,
            fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--surf)', padding: '0 3px',
          }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
        {showNotif && (
          <div style={{
            position: 'absolute', top: 42, right: 0, width: 320,
            background: 'var(--surf2)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px var(--shadow)',
            zIndex: 200, overflow: 'hidden',
          }}>
            {/* Header du panneau */}
            <div style={{
              padding: '10px 12px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                {t('notif.title')} {unreadCount > 0 && <span style={{ color: 'var(--bl)', fontFamily: 'var(--fm)' }}>({unreadCount})</span>}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: 'none', border: 'none', color: 'var(--bl)',
                    fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--ff)',
                  }}
                >{t('notif.markAllRead')}</button>
              )}
            </div>

            {/* Liste des notifications */}
            <div style={{ maxHeight: 320, overflowY: 'auto', padding: '4px 0' }}>
              {notifs.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: 'var(--t4)' }}>
                  {t('notif.empty')}
                </div>
              ) : notifs.map(n => {
                const isRead = readIds.has(n.id)
                return (
                  <div
                    key={n.id}
                    onClick={() => setReadIds(prev => new Set([...prev, n.id]))}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', marginBottom: 1,
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      background: isRead ? 'transparent' : 'var(--bp)',
                      transition: 'background .15s',
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: isRead ? 500 : 700,
                        color: isRead ? 'var(--t3)' : 'var(--text)',
                      }}>{n.title}</div>
                      <div style={{
                        fontSize: 11, color: 'var(--t3)', marginTop: 1,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{n.detail}</div>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0, whiteSpace: 'nowrap', marginTop: 2 }}>
                      {timeAgo(n.ts, t)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Profil */}
      <div style={{ position: 'relative' }} data-profile-panel>
        <button
          onClick={() => setShowProfile(!showProfile)}
          style={{
            ...iconBtn, width: 'auto', gap: 6, padding: '0 10px',
            display: 'flex', alignItems: 'center',
          }}
          title={t('header.profile')}
        >
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--bl)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800,
          }}>{initials || '?'}</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{userName}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{roleLabel}</div>
          </div>
        </button>

        {showProfile && (
          <div style={{
            position: 'absolute', top: 42, right: 0, width: 220,
            background: 'var(--surf2)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px var(--shadow)',
            zIndex: 200, overflow: 'hidden',
          }}>
            {/* En-tête profil */}
            <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--bl)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, flexShrink: 0,
                }}>{initials || '?'}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{userName}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{roleLabel}</div>
                </div>
              </div>
            </div>

            {/* Changer de rôle — uniquement propriétaire OU mode démo */}
            {(userRole === 'proprietaire' || isDemo) && (
              <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--t4)',
                  textTransform: 'uppercase', letterSpacing: '.06em',
                  padding: '2px 4px', marginBottom: 4,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {t('profile.switchRole')}
                  {isDemo && (
                    <span style={{
                      fontSize: 8, fontWeight: 700, color: 'var(--am)',
                      background: 'var(--ap)', padding: '1px 5px',
                      borderRadius: 3, textTransform: 'uppercase',
                    }}>DEMO</span>
                  )}
                </div>
                {(['proprietaire', 'manager', 'serveur'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => { setUserRole(role); setShowProfile(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '6px 8px', borderRadius: 6, marginBottom: 2,
                      border: 'none', cursor: 'pointer', fontFamily: 'var(--ff)',
                      fontSize: 12, fontWeight: userRole === role ? 700 : 500,
                      background: userRole === role ? 'var(--bp)' : 'transparent',
                      color: userRole === role ? 'var(--bl)' : 'var(--t2)',
                      transition: 'background .12s',
                    }}
                  >
                    {userRole === role ? '● ' : '○ '}{t(`role.${role}`)}
                  </button>
                ))}
              </div>
            )}

            {/* Langue */}
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '2px 4px', marginBottom: 6 }}>
                {t('profile.language')}
              </div>
              <div style={{ display: 'flex', gap: 4, padding: '0 4px' }}>
                {LANGS.map((l: any) => (
                  <button
                    key={l}
                    onClick={() => setLang(l.toLowerCase() as 'fr' | 'en' | 'de' | 'it')}
                    style={{
                      flex: 1, padding: '4px 0', borderRadius: 6,
                      border: `1px solid ${lang === l.toLowerCase() ? 'var(--bl)' : 'var(--border)'}`,
                      background: lang === l.toLowerCase() ? 'var(--bp)' : 'transparent',
                      color: lang === l.toLowerCase() ? 'var(--bl)' : 'var(--t3)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'var(--ff)', transition: 'all .12s',
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '4px 8px 8px' }}>
              <button
                onClick={() => { setShowProfile(false); navigate('/options') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: '6px 8px', borderRadius: 6,
                  border: 'none', background: 'transparent',
                  color: 'var(--t2)', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'var(--ff)', transition: 'background .12s',
                }}
              >
                ⚙️ {t('profile.settings')}
              </button>
              <button
                onClick={() => { setShowProfile(false); navigate('/profil') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: '6px 8px', borderRadius: 6,
                  border: 'none', background: 'transparent',
                  color: 'var(--t2)', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'var(--ff)', transition: 'background .12s',
                }}
              >
                🏠 {t('general.myRestaurant')}
              </button>
              <button
                onClick={() => { setShowProfile(false); navigate('/acces-roles') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: '6px 8px', borderRadius: 6,
                  border: 'none', background: 'transparent',
                  color: 'var(--t2)', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'var(--ff)', transition: 'background .12s',
                }}
              >
                👥 {t('nav.teamAccess')}
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button
                onClick={() => { setShowProfile(false); navigate('/') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: '6px 8px', borderRadius: 6,
                  border: 'none', background: 'transparent',
                  color: 'var(--rd)', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'var(--ff)', transition: 'background .12s',
                }}
              >
                🚪 {t('profile.logout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
