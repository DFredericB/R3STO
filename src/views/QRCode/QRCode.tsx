import { useState } from 'react'
import { useToast } from '../../components/ui/Toast'
import { useAppStore } from '../../store/useAppStore'

interface Room {
  name: string
  color: string
  active: boolean
}

interface Table {
  n: string
  nm?: string
  salle: string
  capMin: number
  capMax: number
  active: boolean
}

// Fallback démo utilisé SEULEMENT quand le store est vide ET qu'on est en mode démo
const DEMO_SALLES: Room[] = [
  { name: 'Salle 1', color: '#4480d8', active: true },
  { name: 'Terrasse', color: '#2d6a4f', active: true },
]
const DEMO_TABLES: Table[] = [
  { n: 'T1', nm: 'Fenêtre', salle: 'Salle 1', capMin: 2, capMax: 4, active: true },
  { n: 'T2', nm: 'Bar', salle: 'Salle 1', capMin: 1, capMax: 2, active: true },
  { n: 'T3', nm: 'Coin', salle: 'Salle 1', capMin: 4, capMax: 6, active: true },
  { n: 'T4', salle: 'Terrasse', capMin: 2, capMax: 4, active: true },
  { n: 'T5', salle: 'Terrasse', capMin: 2, capMax: 4, active: true },
]

export function QRCode() {
  const { toast } = useToast()
  const { salles: storeSalles, tables: storeTables, isDemo } = useAppStore()

  // Source réelle = store ; fallback démo uniquement si isDemo ET store vide
  const SALLES: Room[] = storeSalles && storeSalles.length > 0
    ? storeSalles.filter(s => s.active).map(s => ({ name: s.name, color: s.color || '#4480d8', active: s.active }))
    : (isDemo ? DEMO_SALLES : [])
  const TABLES: Table[] = storeTables && storeTables.length > 0
    ? storeTables.filter(t => t.active).map(t => ({ n: t.n, salle: t.salle, capMin: t.capMin, capMax: t.capMax, active: t.active }))
    : (isDemo ? DEMO_TABLES : [])
  const [qrMode, setQrMode] = useState<'reservation' | 'menu' | 'both' | 'payment'>('reservation')
  const [qrSize, setQrSize] = useState(180)
  const [qrColor, setQrColor] = useState('#1c4f90')
  const [qrLabel, setQrLabel] = useState(true)
  const [qrLogo, setQrLogo] = useState(true)

  const baseUrl = qrMode === 'menu' ? 'https://menu.r3sto.ch'
    : qrMode === 'both' ? 'https://table.r3sto.ch'
    : qrMode === 'payment' ? 'https://bill.r3sto.ch'
    : 'https://booking.r3sto.ch'

  const modeLabel = qrMode === 'menu' ? 'Scanner pour voir le menu'
    : qrMode === 'both' ? 'Scanner — menu & réservation'
    : qrMode === 'payment' ? 'Scanner pour payer votre note'
    : 'Scanner pour réserver'

  const qrImg = (url: string, size: number, color: string) => {
    const hex = color.replace('#', '')
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&color=${hex}&bgcolor=ffffff&margin=2&format=png`
  }

  const qrCard = (t: Table) => {
    const url = baseUrl + '?table=' + encodeURIComponent(t.n)
    return (
      <div key={t.n} style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        border: '1px solid var(--border)',
      }}>
        {qrLogo && <div style={{ fontSize: 11, fontWeight: 800, color: qrColor, letterSpacing: '.05em' }}>R3STO</div>}
        <img src={qrImg(url, qrSize, qrColor)} alt={`QR ${t.n}`} style={{ width: qrSize, height: qrSize, display: 'block', borderRadius: 8 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        {qrLabel && <div style={{ fontSize: 11, fontWeight: 800, color: '#1a1a2e', fontFamily: 'var(--fm)' }}>{t.n}{t.nm ? ' · ' + t.nm : ''}</div>}
        <div style={{ fontSize: 11, color: '#888' }}>{modeLabel}</div>
      </div>
    )
  }

  const salles = SALLES.filter(s => s.active)
  const salleCards = salles.map(salle => {
    const tbls = TABLES.filter(t => t.salle === salle.name && t.active !== false)
    if (!tbls.length) return null
    return (
      <div key={salle.name} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: salle.color }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>{salle.name}</span>
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>{tbls.length} table{tbls.length > 1 ? 's' : ''}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${qrSize + 32}px, 1fr))`, gap: 12 }}>
          {tbls.map(qrCard)}
        </div>
      </div>
    )
  }).filter(Boolean)

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>QR Codes</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
          Un QR code par table · Scanner = réservation pré-assignée
        </p>
      </div>

      {/* Main Layout: Content + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18, alignItems: 'start' }}>
        {/* QR Cards by Room */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>
            QR codes par table
          </div>
          {salleCards}
        </div>

        {/* Config Panel */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Mode selector */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Mode du QR</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { v: 'reservation' as const, l: '📅 Réservation', d: 'Ouvre le widget de réservation' },
                { v: 'menu' as const, l: '📋 Menu', d: 'Affiche la carte du restaurant' },
                { v: 'both' as const, l: '✨ Réservation + Menu', d: 'Page table complète' },
                { v: 'payment' as const, l: '💳 Paiement TWINT', d: 'Scanner pour payer — TWINT, carte, Apple Pay' },
              ].map(o => (
                <button
                  key={o.v}
                  onClick={() => setQrMode(o.v)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: `1.5px solid ${qrMode === o.v ? 'var(--bl)' : 'var(--border)'}`,
                    background: qrMode === o.v ? 'var(--bp)' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'var(--ff)',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: qrMode === o.v ? 'var(--bl)' : 'var(--text)' }}>{o.l}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{o.d}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, marginBottom: 8 }}>Taille</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setQrSize(120)} style={{ flex: 1, padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border)', background: qrSize === 120 ? 'var(--bl)' : 'var(--surf2)', color: qrSize === 120 ? 'white' : 'var(--text)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>S</button>
              <button onClick={() => setQrSize(180)} style={{ flex: 1, padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border)', background: qrSize === 180 ? 'var(--bl)' : 'var(--surf2)', color: qrSize === 180 ? 'white' : 'var(--text)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>M</button>
              <button onClick={() => setQrSize(240)} style={{ flex: 1, padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border)', background: qrSize === 240 ? 'var(--bl)' : 'var(--surf2)', color: qrSize === 240 ? 'white' : 'var(--text)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>L</button>
            </div>
          </div>

          {/* Color */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, marginBottom: 8 }}>Couleur</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={qrColor}
                onChange={(e) => setQrColor(e.target.value)}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }}
              />
              <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{qrColor}</span>
            </div>
          </div>

          {/* Toggles */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--text)' }}>Label R3STO</span>
                <button
                  onClick={() => setQrLogo(!qrLogo)}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    border: 'none',
                    cursor: 'pointer',
                    background: qrLogo ? 'var(--gn)' : 'var(--surf3)',
                  }}
                >
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', margin: qrLogo ? '3px 3px 3px auto' : '3px auto 3px 3px' }} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--text)' }}>Nom de table</span>
                <button
                  onClick={() => setQrLabel(!qrLabel)}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    border: 'none',
                    cursor: 'pointer',
                    background: qrLabel ? 'var(--gn)' : 'var(--surf3)',
                  }}
                >
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', margin: qrLabel ? '3px 3px 3px auto' : '3px auto 3px 3px' }} />
                </button>
              </div>
            </div>
          </div>

          {/* URL */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>URL du widget</div>
            <input
              value={baseUrl}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--surf2)',
                color: 'var(--text)',
                fontSize: 11,
                fontFamily: 'var(--fm)',
              }}
              readOnly
            />
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>Le paramètre ?table=T1 est ajouté automatiquement</div>
          </div>

          {/* Export */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Export</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => toast('QR codes téléchargés (PNG)', 'success')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 4,
                  border: 'none',
                  background: 'var(--bl)',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                PNG — toutes les tables
              </button>
              <button
                onClick={() => toast('PDF généré — impression A4', 'success')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'var(--surf2)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                PDF A4 — prêt à imprimer
              </button>
              <button
                onClick={() => toast('Fichier ZIP téléchargé', 'success')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'var(--surf2)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                ZIP — un fichier par table
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
