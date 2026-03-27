// ══════════════════════════════════════════════════
//  R3STO — ViewToolbar
//  Barre d'outils commune aux 3 vues principales
//  Date nav, services, salles, recherche, + Réserver
// ══════════════════════════════════════════════════

import { useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { todayISO, shiftISO, timeToMins, nowMins } from '../../utils/date'

interface ViewToolbarProps {
  title: string
  subtitle?: string
  /** Filtre service actif */
  serviceFilter?: string
  onServiceFilter?: (svc: string) => void
  /** Filtre salle actif */
  salleFilter?: string
  onSalleFilter?: (salle: string) => void
  /** Recherche */
  search?: string
  onSearch?: (v: string) => void
  onSearchSubmit?: () => void
  /** Nouvelle résa */
  onNewResa?: () => void
  /** Imprimer */
  onPrint?: () => void
  /** Masquer les options "tous/toutes" (pour Plan de salle) */
  hideAllFilter?: boolean
  /** Enfants supplémentaires (KPIs, etc.) */
  children?: React.ReactNode
}

export function ViewToolbar({
  title, subtitle,
  serviceFilter, onServiceFilter,
  salleFilter, onSalleFilter,
  search, onSearch, onSearchSubmit,
  onNewResa, onPrint,
  hideAllFilter,
  children,
}: ViewToolbarProps) {
  const { activeDate, setActiveDate, services, salles, resas, fermetures } = useAppStore()
  const { t, fmtDate } = useT()
  const dateRef = useRef<HTMLInputElement>(null)
  const today = todayISO()
  const isToday = activeDate === today

  const activeServices = services.filter(s => s.active)
  const activeSalles = salles.filter(s => s.active)
  const total = resas.filter(r => r.date === activeDate).length
  const totalCvt = resas.filter(r => r.date === activeDate).reduce((s, r) => s + r.c, 0)

  const navBtnS: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surf3)',
    color: 'var(--t2)', cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  // Style uniforme pour tous les chips (services + salles) — même hauteur
  const CHIP_H = 36
  const chipS = (on: boolean): React.CSSProperties => ({
    height: CHIP_H, padding: '0 12px', borderRadius: 7,
    border: `2px solid ${on ? 'rgba(91,156,246,.6)' : 'var(--border)'}`,
    background: on ? 'rgba(91,156,246,.22)' : 'var(--surf3)',
    color: on ? '#7bb8ff' : 'var(--t2)',
    cursor: 'pointer', fontSize: 12, fontWeight: on ? 700 : 600,
    fontFamily: 'var(--ff)', whiteSpace: 'nowrap' as const,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    boxShadow: on ? '0 0 8px rgba(91,156,246,.22)' : 'none',
    transition: 'all .12s',
  })

  // Ouvrir le date picker natif — compatible tablette
  function openDatePicker() {
    const el = dateRef.current
    if (!el) return
    // Tenter showPicker (Chrome, Edge, Safari 16+)
    try { el.showPicker(); return } catch {}
    // Fallback: focus + click simule l'ouverture sur la plupart des navigateurs mobiles
    el.focus()
    el.click()
  }

  // Label style for filter group headers
  const labelS: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, color: 'var(--t4)',
    textTransform: 'uppercase', letterSpacing: '.06em',
    flexShrink: 0, lineHeight: '36px',
  }

  // Vérifier s'il y a une fermeture active pour la date sélectionnée
  const activeClosure = (fermetures || []).find(f => {
    if (!f.dateDebut || !f.dateFin) return false
    return activeDate >= f.dateDebut && activeDate <= f.dateFin
  })

  return (
    <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surf)', position: 'sticky', top: 0, zIndex: 10 }}>
      {/* ══ Bandeau fermeture — visible si le jour est dans une période de fermeture ══ */}
      {activeClosure && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px',
          background: 'rgba(220,80,80,.12)', borderBottom: '1px solid rgba(220,80,80,.25)',
          fontSize: 12, fontWeight: 700, color: 'var(--rd)',
        }}>
          🚫 Fermeture : {activeClosure.label || 'Fermé'}
          {activeClosure.note && <span style={{ fontWeight: 500, fontSize: 11, color: 'var(--t3)', marginLeft: 4 }}>— {activeClosure.note}</span>}
        </div>
      )}
      {/* ── Ligne 1 : titre + date + recherche + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', flexWrap: 'wrap' }}>
        {/* Titre */}
        <div style={{ minWidth: 90, flexShrink: 0 }}>
          <div className="page-title">{title}</div>
          {subtitle && <div className="page-subtitle">{subtitle}</div>}
        </div>

        {/* Date nav : ◀ [date cliquable = input natif] ▶ [Auj.] + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setActiveDate(shiftISO(activeDate, -1))} style={navBtnS}>◀</button>
          <button type="button" onClick={openDatePicker}
            style={{
              position: 'relative', display: 'inline-flex', cursor: 'pointer',
              height: 36, padding: '0 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: `2px solid ${isToday ? 'var(--b2)' : 'var(--ab)'}`,
              background: isToday ? 'var(--bp)' : 'var(--ap)',
              color: isToday ? 'var(--bl)' : 'var(--am)',
              minWidth: 150, textAlign: 'center',
              alignItems: 'center', justifyContent: 'center',
            }}>
            {isToday ? `📅 ${t('toolbar.today')}` : `📅 ${fmtDate(activeDate)}`}
            <input
              ref={dateRef}
              type="date"
              value={activeDate}
              onChange={e => { if (e.target.value) setActiveDate(e.target.value) }}
              tabIndex={-1}
              style={{
                position: 'absolute', inset: 0,
                opacity: 0, width: '100%', height: '100%',
                cursor: 'pointer', pointerEvents: 'none',
              }}
            />
          </button>
          <button onClick={() => setActiveDate(shiftISO(activeDate, 1))} style={navBtnS}>▶</button>
          {!isToday && (
            <button onClick={() => setActiveDate(today)}
              style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--b2)', background: 'var(--bp)', color: 'var(--bl)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
              {t('toolbar.todayShort')}
            </button>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', fontFamily: 'var(--fm)', marginLeft: 4, whiteSpace: 'nowrap' }}>
            {total} {t('toolbar.resa')} · {totalCvt}p
          </span>
        </div>

        {/* Spacer → pousse recherche + actions à droite */}
        <div style={{ flex: 1 }} />

        {/* 🔍 Recherche — dans la ligne 1, collée aux actions */}
        {onSearch && (
          <input className="input" placeholder={t('toolbar.search')}
            value={search} onChange={e => onSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && onSearchSubmit) onSearchSubmit() }}
            style={{
              width: 160, padding: '6px 10px', fontSize: 12, height: CHIP_H,
              borderRadius: 7, boxSizing: 'border-box', flexShrink: 1, minWidth: 100,
            }} />
        )}

        {/* Imprimer — reste en ligne 1 */}
        {onPrint && (
          <button onClick={onPrint} style={navBtnS} title={t('toolbar.print')}>🖨️</button>
        )}
      </div>

      {/* ── Ligne 2 : Services + Salles + Réserver (fusionnée sur une seule ligne) ── */}
      {(onServiceFilter || onSalleFilter) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 16px 6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Services */}
          {onServiceFilter && <>
            <span style={labelS}>Svc</span>
            {[...(hideAllFilter ? [] : [{ id: 'tous', label: t('toolbar.all'), sub: '', open: '', close: '' }]), ...activeServices.map(s => ({ id: s.name.toLowerCase(), label: `${s.icon} ${s.name}`, sub: `${s.open}–${s.lastOrder}`, open: s.open, close: s.close }))].map(f => {
              const cnt = f.id === 'tous' ? total : resas.filter(r => r.date === activeDate && r.svc === f.id).length
              const now = nowMins()
              const openM = f.open ? timeToMins(f.open) : 0
              const closeM = f.close ? timeToMins(f.close) : 0
              const svcActive = f.open && now >= openM && now <= closeM
              const svcNext = f.open && !svcActive && now < openM && now >= openM - 60
              const svcDone = f.close && now > closeM + 30
              const dotColor = svcActive ? 'var(--gn)' : svcNext ? '#e8a530' : null
              const dotShadow = svcActive ? '0 0 6px rgba(60,200,112,.5)' : svcNext ? '0 0 6px rgba(232,165,48,.5)' : 'none'
              return (
                <button key={f.id} style={{ ...chipS(serviceFilter === f.id), opacity: svcDone ? .45 : 1, position: 'relative' as const }} onClick={() => onServiceFilter(f.id)}>
                  {dotColor && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', boxShadow: dotShadow, flexShrink: 0 }} />}
                  <span style={svcDone ? { filter: 'blur(1.5px)', WebkitFilter: 'blur(1.5px)' } : undefined}>
                    {f.label}{cnt > 0 ? ` (${cnt})` : ''}
                  </span>
                  {f.sub && <span style={{ fontSize: 9, opacity: .55, fontWeight: 500, marginLeft: 2, ...(svcDone ? { filter: 'blur(1px)' } : {}) }}>{f.sub}</span>}
                  {svcDone && <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--t4)', marginLeft: 3, textTransform: 'uppercase' as const, letterSpacing: '.04em', flexShrink: 0 }}>✓</span>}
                </button>
              )
            })}
          </>}

          {/* Séparateur visuel léger */}
          {onServiceFilter && onSalleFilter && (
            <div style={{ width: 1, height: 22, background: 'var(--border)', flexShrink: 0, margin: '0 2px' }} />
          )}

          {/* Salles */}
          {onSalleFilter && <>
            <span style={labelS}>Salles</span>
            {[...(hideAllFilter ? [] : [{ id: '_all', name: 'toutes', label: t('toolbar.allRoomsIcon') }]), ...activeSalles.map(s => ({ id: s.id, name: s.name, label: s.name }))].map(salle => (
              <button key={salle.id} style={chipS(salleFilter === salle.name)} onClick={() => onSalleFilter(salle.name)}>
                {salle.label}
              </button>
            ))}
          </>}

          {/* Spacer + Réserver — toujours à droite */}
          {onNewResa && <>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary" style={{ fontSize: 13, minHeight: 36, padding: '0 16px', fontWeight: 700, flexShrink: 0 }} onClick={onNewResa}>
              ➕ {t('toolbar.book')}
            </button>
          </>}
        </div>
      )}

      {/* Fallback si pas de svc/salle bar mais onNewResa */}
      {!onServiceFilter && !onSalleFilter && onNewResa && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 5px' }}>
          <button className="btn btn-primary" style={{ fontSize: 13, minHeight: 36, padding: '0 16px', fontWeight: 700 }} onClick={onNewResa}>
            ➕ {t('toolbar.book')}
          </button>
        </div>
      )}

      {children}
    </div>
  )
}
