// ══════════════════════════════════════════════════
//  R3STO Delivery — Suivi en temps réel
//  Carte de suivi des livraisons actives
// ══════════════════════════════════════════════════

import { useState } from 'react'
import { useT } from '../../i18n/useTranslation'

interface ActiveDelivery {
  id: string; customer: string; address: string; driver: string
  status: 'pickup' | 'enroute' | 'arriving'; eta: string; distance: string
}

const DEMO: ActiveDelivery[] = [
  { id: 'DEL-001', customer: 'Sophie Martin', address: 'Rue de Lausanne 42', driver: 'Lucas R.', status: 'enroute', eta: '8 min', distance: '2.3 km' },
  { id: 'DEL-006', customer: 'Thomas Weber', address: 'Rue de Morat 28', driver: 'Marie T.', status: 'arriving', eta: '2 min', distance: '0.4 km' },
]

const STATUS_KEYS: Record<string, { labelKey: string; color: string; icon: string }> = {
  pickup: { labelKey: 'del.pickup', color: '#f59e0b', icon: '📦' },
  enroute: { labelKey: 'del.enroute', color: '#3b82f6', icon: '🛵' },
  arriving: { labelKey: 'del.arriving', color: '#10b981', icon: '🏠' },
}

export function DeliveryTracking() {
  const { t } = useT()
  const [deliveries] = useState(DEMO)

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 28 }}>🗺️</span>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{t('del.tracking')}</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0 }}>{deliveries.length} {t('del.delivInProgress')}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Map placeholder */}
        <div style={{
          flex: 2, minWidth: 280, minHeight: 400,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Simulated map with grid lines */}
          <svg width="100%" height="100%" viewBox="0 0 400 400" style={{ position: 'absolute', opacity: 0.15 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <g key={i}>
                <line x1={i * 20} y1={0} x2={i * 20} y2={400} stroke="var(--t4)" strokeWidth="0.5" />
                <line x1={0} y1={i * 20} x2={400} y2={i * 20} stroke="var(--t4)" strokeWidth="0.5" />
              </g>
            ))}
          </svg>

          {/* Restaurant marker */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 20, height: 20, borderRadius: '50%', background: '#ef4444',
            boxShadow: '0 0 0 6px rgba(239,68,68,.2)', zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
          }}>🍽️</div>

          {/* Driver markers */}
          {deliveries.map((d, i) => (
            <div key={d.id} style={{
              position: 'absolute',
              top: `${35 + i * 20}%`, left: `${30 + i * 25}%`,
              transform: 'translate(-50%, -50%)',
              background: STATUS_KEYS[d.status].color,
              color: '#fff', borderRadius: 8, padding: '4px 8px',
              fontSize: 11, fontWeight: 700, zIndex: 3,
              boxShadow: `0 2px 8px ${STATUS_KEYS[d.status].color}50`,
            }}>
              🛵 {d.driver}
            </div>
          ))}

          <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, color: 'var(--t4)', zIndex: 2, background: 'var(--bg2)', padding: '4px 8px', borderRadius: 4 }}>
            {t('del.mapSoon')}
          </div>
        </div>

        {/* Delivery cards */}
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {deliveries.map(d => {
            const st = { label: t(STATUS_KEYS[d.status].labelKey), color: STATUS_KEYS[d.status].color, icon: STATUS_KEYS[d.status].icon }
            return (
              <div key={d.id} style={{
                background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 12, padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--text)' }}>{d.id}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    background: `${st.color}20`, color: st.color,
                  }}>{st.icon} {st.label}</span>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{d.customer}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>📍 {d.address}</div>
                </div>

                {/* Progress bar */}
                <div style={{ background: 'var(--bg2)', borderRadius: 4, height: 6, marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, background: st.color,
                    width: d.status === 'pickup' ? '20%' : d.status === 'enroute' ? '60%' : '90%' as string,
                    transition: 'width .5s ease',
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--t3)' }}>🛵 {d.driver}</span>
                  <span style={{ color: 'var(--t3)' }}>{d.distance}</span>
                  <span style={{ color: st.color, fontWeight: 700 }}>ETA {d.eta}</span>
                </div>
              </div>
            )
          })}

          {deliveries.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛵</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t('del.noDelivery')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
