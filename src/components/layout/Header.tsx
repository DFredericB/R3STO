// ══════════════════════════════════════════════════
//  R3STO — Header
//  Zéro hardcoding : strings→i18n, roles→ROLES dict,
//  plans→isPlanEligible, couleurs→vars CSS.
//  Démo = miroir app (toutes features débloquées).
// ══════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { useToast } from '../ui/Toast'
import { Logo } from '../ui/Logo'
import { SearchModal } from '../ui/SearchModal'
import { computeAlerts } from '../../utils/alerts'
import { ROLES, TOPBAR_RESTAURANT_ROLES, TOPBAR_CORP_ROLES } from '../../utils/roles'
import { isPlanEligible } from '../../utils/plans'
import { usePermission } from '../../utils/permissions'
import type { Resa, Service, Fermeture, Site, UserRole } from '../../types'

const CLOCK_TICK_MS = 30000
const NEW_RESA_RECENT_MS = 2 * 60 * 60 * 1000
const MAX_NOTIFS = 12
const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'https://api.r3sto.ch'
const LANGS = ['FR', 'DE', 'IT', 'EN'] as const
const TABLET_BP = 1100

// Démo : 3 variantes Chez Bunny's — chaque ville = style/couleur/config/data distincts.
// Slugs synchronisés avec :
//   - backend/src/db/seeds/demo_chez_bunnys.sql (3 tenants)
//   - backend/src/modules/public/routes.js (/public/demo/reset?slug=...)
//   - DemoShowcaseBar + SiteVitrine
interface DemoResto { slug: string; name: string; ville: string; icon: string; color: string; url: string; style: string }
// L'APP démo est TOUJOURS servie depuis demo.r3sto.ch/ (racine SPA).
// Pour switcher de tenant dans l'app, on utilise ?v={slug}.
// Les sous-dossiers /chezbunnys-{ville}/ servent les VITRINES statiques (SiteVitrine).
const DEMO_RESTOS: DemoResto[] = [
  { slug: 'chez-bunnys',        name: "Chez Bunny's", ville: 'Lausanne', icon: '🐰', color: '#e89420', url: 'https://demo.r3sto.ch/?demo=1&v=chez-bunnys',        style: 'Bistro contemporain' },
  { slug: 'chez-bunnys-bern',   name: "Chez Bunny's", ville: 'Bern',     icon: '🥨', color: '#b85a3c', url: 'https://demo.r3sto.ch/?demo=1&v=chez-bunnys-bern',   style: 'Brasserie tradition' },
  { slug: 'chez-bunnys-zurich', name: "Chez Bunny's", ville: 'Zürich',   icon: '🍷', color: '#3b7ca8', url: 'https://demo.r3sto.ch/?demo=1&v=chez-bunnys-zurich', style: 'Gastronomique moderne' },
]
function getDemoSlug(): string {
  if (typeof window === 'undefined') return 'chez-bunnys'
  // Détection via ?v={slug} (source principale), fallback sur path.
  const url = new URL(window.location.href)
  const v = url.searchParams.get('v')
  if (v) {
    const m = DEMO_RESTOS.find(r => r.slug === v)
    if (m) return m.slug
  }
  const path = url.pathname.replace(/^\//, '').split('/')[0]
  const match = DEMO_RESTOS.find(r => r.slug === path)
  return match ? match.slug : 'chez-bunnys'
}

function formatTime(): string {
  const n = new Date()
  return String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0')
}
function todayISO(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}
function hmToMins(s: string): number {
  const [h, m] = s.replace('h', ':').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
function minsToHm(mins: number): string {
  return String(Math.floor(mins/60)).padStart(2,'0') + ':' + String(mins%60).padStart(2,'0')
}

type RestoStatus = 'open' | 'opens_today' | 'closed_today' | 'closure'
interface StatusInfo { status: RestoStatus; color: string; tooltipKey: string; nextMins?: number; closeMins?: number }

function getRestoStatus(services: Service[], fermetures: Fermeture[], date: string, nowMins: number): StatusInfo {
  const closure = fermetures.find(f => {
    if (!f.date) return false
    if (f.dateFin) return date >= f.date && date <= f.dateFin
    return f.date === date
  })
  if (closure) return { status: 'closure', color: 'var(--rd)', tooltipKey: 'header.status.closure' }
  const dow = new Date(date).getDay()
  const today = services.filter(s => s.active && s.jours?.includes(dow))
  if (today.length === 0) return { status: 'closed_today', color: 'var(--t3)', tooltipKey: 'header.status.closedToday' }
  const open = today.find(s => { const o = hmToMins(s.open), c = hmToMins(s.close); return nowMins >= o && nowMins <= c })
  if (open) return { status: 'open', color: 'var(--gn)', tooltipKey: 'header.status.open', closeMins: hmToMins(open.close) }
  const up = today.map(s => hmToMins(s.open)).filter(o => o > nowMins).sort((a,b) => a-b)[0]
  if (up !== undefined) return { status: 'opens_today', color: 'var(--or)', tooltipKey: 'header.status.opensAt', nextMins: up }
  return { status: 'closed_today', color: 'var(--t3)', tooltipKey: 'header.status.closedForToday' }
}

interface Notif { id: string; icon: string; title: string; detail: string; ts: number; resaId?: string }

function buildNotifs(resas: Resa[], date: string, t: (k: string) => string): Notif[] {
  const todayResas = resas.filter(r => r.date === date)
  const notifs: Notif[] = []
  const sorted = [...todayResas].sort((a, b) => b.createdAt - a.createdAt)
  for (const r of sorted) {
    const detail = r.n + ' · ' + r.t.replace('h', ':') + ' · ' + r.c + ' ' + t('notif.covers')
    const base = { resaId: r.id, ts: r.createdAt }
    if (r.s === 'noshow')    notifs.push({ ...base, id: 'noshow-'+r.id,  icon: '🚫', title: t('notif.noshow'),     detail })
    if (r.s === 'cancelled') notifs.push({ ...base, id: 'cancel-'+r.id,  icon: '❌', title: t('notif.cancelled'),  detail })
    if (r.canal === 'widget' && r.s === 'reserved') { notifs.push({ ...base, id: 'widget-'+r.id, icon: '🌐', title: t('notif.widgetResa'), detail }); continue }
    if (r.statut === 2 && r.s === 'arrived') notifs.push({ ...base, id: 'vip-'+r.id, icon: '⭐', title: t('notif.vipArrival'), detail: r.n + ' · ' + r.tbl })
    if (r.allergie && r.s !== 'cancelled' && r.s !== 'noshow') notifs.push({ ...base, id: 'allergy-'+r.id, icon: '⚠️', title: t('notif.allergyAlert'), detail: r.n + ' · ' + r.tbl + ' · ' + r.t.replace('h', ':') })
    if (r.s === 'reserved' && r.canal !== 'widget' && Date.now() - r.createdAt < NEW_RESA_RECENT_MS) {
      notifs.push({ ...base, id: 'new-'+r.id, icon: '📩', title: t('notif.newResa'), detail })
    }
  }
  return notifs.sort((a, b) => b.ts - a.ts).slice(0, MAX_NOTIFS)
}

function timeAgo(ts: number, t: (k: string) => string): string {
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60) return t('notif.justNow')
  if (d < 3600) return t('notif.ago') + ' ' + Math.floor(d/60) + ' ' + t('notif.minAgo')
  if (d < 86400) return t('notif.ago') + ' ' + Math.floor(d/3600) + ' ' + t('notif.hAgo')
  return ''
}

export function Header() {
  const { activeDate, resas, resto, users, isDemo, services, fermetures,
    lang, setLang, userRole, setUserRole, theme, setTheme,
    readNotifIds, markNotifRead, markAllNotifRead } = useAppStore()
  const sites = useAppStore(s => s.sites)
  const activeSiteId = useAppStore(s => s.activeSiteId)
  const setActiveSite = useAppStore(s => s.setActiveSite)
  const navigate = useNavigate()
  const { t, fmtDate } = useT()
  const { toast } = useToast()
  const canSwitchRole = usePermission('manageRoles') || isDemo

  const [time, setTime] = useState(formatTime())
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [isTablet, setIsTablet] = useState(typeof window !== 'undefined' && window.innerWidth <= TABLET_BP)
  const todayDate = todayISO()

  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSiteSwitch, setShowSiteSwitch] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showDemoSites, setShowDemoSites] = useState(false)

  const handleSearchKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(p => !p) }
  }, [])
  useEffect(() => {
    window.addEventListener('keydown', handleSearchKey)
    return () => window.removeEventListener('keydown', handleSearchKey)
  }, [handleSearchKey])

  useEffect(() => {
    const int = setInterval(() => setTime(formatTime()), CLOCK_TICK_MS)
    const onResize = () => setIsTablet(window.innerWidth <= TABLET_BP)
    const onOn = () => setOnline(true); const onOff = () => setOnline(false)
    window.addEventListener('resize', onResize)
    window.addEventListener('online', onOn); window.addEventListener('offline', onOff)
    return () => { clearInterval(int); window.removeEventListener('resize', onResize); window.removeEventListener('online', onOn); window.removeEventListener('offline', onOff) }
  }, [])

  useEffect(() => {
    if (!showNotif && !showProfile && !showSiteSwitch && !showDemoSites) return
    const close = (e: MouseEvent) => {
      const tgt = e.target as HTMLElement
      if (showNotif && !tgt.closest('[data-notif-panel]')) setShowNotif(false)
      if (showProfile && !tgt.closest('[data-profile-panel]')) setShowProfile(false)
      if (showSiteSwitch && !tgt.closest('[data-site-panel]')) setShowSiteSwitch(false)
      if (showDemoSites && !tgt.closest('[data-demo-sites-panel]')) setShowDemoSites(false)
    }
    document.addEventListener('click', close, true)
    return () => document.removeEventListener('click', close, true)
  }, [showNotif, showProfile, showSiteSwitch, showDemoSites])

  const activeSite = activeSiteId ? sites.find(s => s.id === activeSiteId) : null
  const isAdmin = window.location.hostname.startsWith('admin.')
  const demoSlug = isDemo ? getDemoSlug() : null
  const activeDemoResto = demoSlug ? DEMO_RESTOS.find(r => r.slug === demoSlug) : null
  const displayName = isAdmin
    ? t('header.adminConsole')
    : (activeDemoResto ? `${activeDemoResto.name} · ${activeDemoResto.ville}` : (activeSite ? activeSite.name : (resto.name || t('general.myRestaurant'))))
  const hasMultiSites = sites.length > 0 && isPlanEligible('multiSite')
  const canSwitchTopName = !isAdmin && (hasMultiSites || isDemo)

  const currentUser = users.find(u => u.active && u.role === userRole) || users.find(u => u.active) || null
  const userName = currentUser?.n || t('general.admin')
  const initials = userName.split(' ').map(w => w[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join('')
  const roleMeta = ROLES[userRole]
  const roleLabel = t(roleMeta.labelKey)

  const nowMins = useMemo(() => { const n = new Date(); return n.getHours()*60 + n.getMinutes() }, [time])
  const restoStatus = useMemo(() => getRestoStatus(services, fermetures, todayDate, nowMins), [services, fermetures, todayDate, nowMins])
  const statusTooltip = useMemo(() => {
    if (restoStatus.status === 'open' && restoStatus.closeMins !== undefined) return t('header.status.openUntil') + ' ' + minsToHm(restoStatus.closeMins)
    if (restoStatus.status === 'opens_today' && restoStatus.nextMins !== undefined) return t('header.status.opensAt') + ' ' + minsToHm(restoStatus.nextMins)
    return t(restoStatus.tooltipKey)
  }, [restoStatus, t])

  const alerts = useMemo(() => computeAlerts(resas, activeDate), [resas, activeDate])
  // R3STO concept : auto-assign → la const "unassigned" a été retirée (cf. feedback_no_unassigned_resa)

  const notifs = useMemo(() => buildNotifs(resas, activeDate, t), [resas, activeDate, t])
  const readSet = useMemo(() => new Set(readNotifIds), [readNotifIds])
  const unreadCount = notifs.filter(n => !readSet.has(n.id)).length

  const onNotifClick = (n: Notif) => {
    markNotifRead(n.id); setShowNotif(false)
    if (n.resaId) navigate('/reservations?edit=' + encodeURIComponent(n.resaId))
  }
  const onMarkAllRead = () => markAllNotifRead(notifs.map(n => n.id))

  const switchSite = async (siteId: string | null) => {
    setActiveSite(siteId); setShowSiteSwitch(false)
    try {
      const token = localStorage.getItem('r3sto-token') || sessionStorage.getItem('r3sto-token') || ''
      if (!token) return
      await fetch(API_BASE + '/me/active-site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ siteId }),
      })
    } catch (err) { console.warn('[header] site switch API failed', err) }
  }

  const onLogout = async () => {
    setShowProfile(false)
    try {
      const token = localStorage.getItem('r3sto-token') || sessionStorage.getItem('r3sto-token') || ''
      if (token) await fetch(API_BASE + '/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + token } })
    } catch (err) { console.warn('[header] logout API failed', err) }
    finally {
      try { localStorage.removeItem('r3sto-token'); localStorage.removeItem('r3sto-user'); localStorage.removeItem('r3sto-app-data'); sessionStorage.removeItem('r3sto-token'); sessionStorage.removeItem('r3sto-user') } catch (_) {}
      window.location.href = '/'
    }
  }

  const resetDemo = async () => {
    try {
      const res = await fetch(API_BASE + '/public/demo/reset', { method: 'POST' })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      toast(t('demo.resetSuccess'), 'success')
      setTimeout(() => window.location.reload(), 600)
    } catch (err) { console.error('[demo] reset failed:', err); toast(t('demo.resetError'), 'error') }
  }

  const iconBtn: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surf3)',
    color: 'var(--t2)', cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all .12s',
  }
  const alertBtn = (color: string, bg: string, border: string, pulse = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
    borderRadius: 20, cursor: 'pointer', border: '1px solid ' + border, background: bg,
    fontSize: 11, fontWeight: 800, color, fontFamily: 'var(--ff)',
    animation: pulse ? 'headerAlertPulse 2s ease-in-out infinite' : undefined,
  })

  return (
    <header style={{
      height: 'var(--hh)', background: 'var(--surf)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 16px', flexShrink: 0, zIndex: 100,
      flexWrap: 'nowrap',
    }}>
      <Logo size="md" />

      {isAdmin && <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', flexShrink: 0 }}>Console Admin</span>}

      <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

      <div style={{ flex: '1 1 180px', minWidth: 0, position: 'relative' }} data-site-panel>
        <div
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6, cursor: canSwitchTopName ? 'pointer' : 'default' }}
          onClick={() => canSwitchTopName && setShowSiteSwitch(!showSiteSwitch)}
        >
          {!isAdmin && activeDemoResto && <span style={{ fontSize: 14, flexShrink: 0 }}>{activeDemoResto.icon}</span>}
          {!isAdmin && !activeDemoResto && activeSite && <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeSite.color, flexShrink: 0 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
          {isDemo && <span style={{ background: 'var(--am)', color: '#000', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, letterSpacing: 1.2, textTransform: 'uppercase', flexShrink: 0 }}>{t('header.demo')}</span>}
          {!isAdmin && (
            <span title={online ? statusTooltip : t('header.status.offline')}
              style={{ width: 7, height: 7, borderRadius: '50%', background: online ? restoStatus.color : 'var(--t4)', display: 'inline-block', flexShrink: 0 }} />
          )}
          {canSwitchTopName && <span style={{ fontSize: 10, color: 'var(--t3)', flexShrink: 0 }}>▾</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t('header.today') + ' · ' + fmtDate(todayDate) + ' · ' + time}
        </div>

        {showSiteSwitch && isDemo && (
          <div style={{ position: 'absolute', top: 42, left: 0, width: 300, background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px var(--shadow)', zIndex: 200, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
              🎬 Démo · Changer de restaurant
              <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--am)', background: 'var(--ap)', padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase', marginLeft: 'auto' }}>Vitrine</span>
            </div>
            {DEMO_RESTOS.map((r) => {
              const active = r.slug === demoSlug
              return (
                <button key={r.slug} onClick={() => { window.location.href = r.url }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', border: 'none', cursor: 'pointer', fontFamily: 'var(--ff)', background: active ? (r.color + '22') : 'transparent', color: 'var(--text)', fontSize: 12, textAlign: 'left' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: r.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{r.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: active ? 700 : 600, fontSize: 13 }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{r.ville}</div>
                  </div>
                  {active && <span style={{ color: r.color, fontWeight: 700, fontSize: 12 }}>✓</span>}
                </button>
              )
            })}
            <div style={{ borderTop: '1px solid var(--border)', padding: '6px 8px', fontSize: 10, color: 'var(--t4)', textAlign: 'center' }}>
              Chaque vitrine = données + config + charte distinctes
            </div>
          </div>
        )}

        {showSiteSwitch && !isDemo && (
          <div style={{ position: 'absolute', top: 42, left: 0, width: 280, background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px var(--shadow)', zIndex: 200, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              🏢 {t('multisite.switchSite')}
            </div>
            <button onClick={() => switchSite(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer', fontFamily: 'var(--ff)', background: !activeSiteId ? 'var(--bp)' : 'transparent', color: 'var(--text)', fontSize: 12, textAlign: 'left' }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bl)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🏠</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: !activeSiteId ? 700 : 500, fontSize: 12 }}>{resto.name || t('multisite.mainSite')}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{resto.ville}</div>
              </div>
              {!activeSiteId && <span style={{ color: 'var(--bl)', fontWeight: 700, fontSize: 11 }}>✓</span>}
            </button>
            {sites.map((site: Site) => (
              <button key={site.id} onClick={() => switchSite(site.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer', fontFamily: 'var(--ff)', background: activeSiteId === site.id ? (site.color + '18') : 'transparent', color: 'var(--text)', fontSize: 12, textAlign: 'left' }}>
                <span style={{ width: 28, height: 28, borderRadius: 6, background: site.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{site.name.charAt(0).toUpperCase()}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: activeSiteId === site.id ? 700 : 500, fontSize: 12 }}>{site.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{site.ville}</div>
                </div>
                {activeSiteId === site.id && <span style={{ color: site.color, fontWeight: 700, fontSize: 11 }}>✓</span>}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', padding: '6px 8px' }}>
              <button onClick={() => { setShowSiteSwitch(false); navigate('/multisite') }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--bl)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--ff)' }}>
                ⚙️ {t('multisite.manageSites')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 1, flexWrap: 'nowrap', minWidth: 0, overflow: 'hidden' }}>
        {alerts.waitlist > 0 && <button onClick={() => navigate('/waitlist')} style={alertBtn('#e8a530', 'rgba(232,165,48,.12)', 'rgba(232,165,48,.4)', true)} title={t('alert.waitlist')}>⏳ {alerts.waitlist} <span className="alrt-lbl">{t('alert.waitlist')}</span></button>}
        {alerts.groups > 0 && <button onClick={() => navigate('/groupes')} style={alertBtn('#b482ff', 'rgba(144,96,224,.1)', 'rgba(144,96,224,.35)')} title={t('alert.groups')}>👥 {alerts.groups} <span className="alrt-lbl">{t('alert.groups')}</span></button>}
        {/* R3STO concept : jamais de "non assignée" (auto-assign systématique). Alerte supprimée. */}
        {alerts.arriving > 0 && <button onClick={() => navigate('/grille')} style={alertBtn('var(--bl)', 'rgba(91,156,246,.1)', 'rgba(91,156,246,.35)')} title={t('alert.arriving')}>🕐 {alerts.arriving} <span className="alrt-lbl">{t('alert.arriving')}</span></button>}
        {alerts.noshow > 0 && <button onClick={() => navigate('/reservations?filter=noshow')} style={alertBtn('var(--t3)', 'rgba(100,116,139,.08)', 'rgba(100,116,139,.3)')} title={t('alert.noshow')}>👻 {alerts.noshow} <span className="alrt-lbl">{t('alert.noshow')}</span></button>}
        <style>{'@media(max-width:1100px){.alrt-lbl{display:none}}'}</style>
      </div>
      <style>{'@keyframes headerAlertPulse{0%,100%{opacity:1}50%{opacity:.45}}'}</style>

      <SearchModal open={showSearch} onClose={() => setShowSearch(false)} />

      {/* Cluster icones : equidistance stricte (gap:6 partage par tous) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {})
            else document.exitFullscreen?.().catch(() => {})
          }}
          style={iconBtn}
          title={t('header.fullscreen')}
          aria-label={t('header.fullscreen')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9V4h5" />
            <path d="M20 9V4h-5" />
            <path d="M4 15v5h5" />
            <path d="M20 15v5h-5" />
          </svg>
        </button>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={iconBtn}
          title={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
          aria-label={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div style={{ position: 'relative' }} data-notif-panel>
          <button onClick={() => setShowNotif(!showNotif)} style={iconBtn} title={t('header.notifications')}
            aria-label={t('header.notifications') + (unreadCount > 0 ? (' (' + unreadCount + ')') : '')}>
            🔔
          </button>
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: '50%', background: 'var(--rd)', color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surf)', padding: '0 3px' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        {showNotif && (
          <div style={{ position: 'absolute', top: 42, right: 0, width: 320, background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px var(--shadow)', zIndex: 200, overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                {t('notif.title')} {unreadCount > 0 && <span style={{ color: 'var(--bl)', fontFamily: 'var(--fm)' }}>({unreadCount})</span>}
              </span>
              {unreadCount > 0 && <button onClick={onMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--bl)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--ff)' }}>{t('notif.markAllRead')}</button>}
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', padding: '4px 0' }}>
              {notifs.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: 'var(--t4)' }}>{t('notif.empty')}</div>
              ) : notifs.map(n => {
                const isRead = readSet.has(n.id)
                return (
                  <div key={n.id} onClick={() => onNotifClick(n)}
                    style={{ padding: '8px 12px', cursor: 'pointer', marginBottom: 1, display: 'flex', alignItems: 'flex-start', gap: 8, background: isRead ? 'transparent' : 'var(--bp)' }}>
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: isRead ? 500 : 700, color: isRead ? 'var(--t3)' : 'var(--text)' }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.detail}</div>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0, whiteSpace: 'nowrap', marginTop: 2 }}>{timeAgo(n.ts, t)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        </div>

        <div style={{ position: 'relative' }} data-profile-panel>
        <button onClick={() => setShowProfile(!showProfile)}
          style={{ ...iconBtn, width: 'auto', gap: 6, padding: '0 10px', display: 'flex', alignItems: 'center' }}
          title={t('header.profile')}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bl)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{initials || '?'}</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{userName}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{roleLabel}</div>
          </div>
        </button>

        {showProfile && (
          <div style={{ position: 'absolute', top: 42, right: 0, width: 220, background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px var(--shadow)', zIndex: 200, overflow: 'hidden' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bl)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{initials || '?'}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{userName}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{roleLabel}</div>
                </div>
              </div>
            </div>

            {canSwitchRole && (
              <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '2px 4px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {t('profile.switchRole')}
                  {isDemo && <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--am)', background: 'var(--ap)', padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase' }}>{t('header.demo')}</span>}
                </div>
                {(isAdmin ? TOPBAR_CORP_ROLES : TOPBAR_RESTAURANT_ROLES).map((role: UserRole) => {
                  const meta = ROLES[role]
                  const active = userRole === role
                  return (
                    <button key={role} onClick={() => { setUserRole(role); setShowProfile(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, marginBottom: 2, border: 'none', cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 12, fontWeight: active ? 700 : 500, background: active ? 'var(--bp)' : 'transparent', color: active ? 'var(--bl)' : 'var(--t2)' }}>
                      <span style={{ fontSize: 13 }}>{meta.icon}</span>
                      {t(meta.labelKey)}
                    </button>
                  )
                })}
              </div>
            )}

            <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '2px 4px', marginBottom: 6 }}>{t('profile.language')}</div>
              <div style={{ display: 'flex', gap: 4, padding: '0 4px' }}>
                {LANGS.map(l => {
                  const lower = l.toLowerCase() as 'fr' | 'en' | 'de' | 'it'
                  const active = lang === lower
                  return (
                    <button key={l} onClick={() => setLang(lower)}
                      style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: '1px solid ' + (active ? 'var(--bl)' : 'var(--border)'), background: active ? 'var(--bp)' : 'transparent', color: active ? 'var(--bl)' : 'var(--t3)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)' }}>
                      {l}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ padding: '4px 8px 8px' }}>
              <button onClick={() => { setShowProfile(false); navigate('/options') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)' }}>
                ⚙️ {t('profile.settings')}
              </button>
              {!isAdmin && (
                <button onClick={() => { setShowProfile(false); navigate('/profil') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)' }}>
                  🏠 {t('general.myRestaurant')}
                </button>
              )}
              <button onClick={() => { setShowProfile(false); navigate('/acces-roles') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)' }}>
                👥 {t('nav.teamAccess')}
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button onClick={onLogout}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--rd)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)' }}>
                🚪 {t('profile.logout')}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  )
}
