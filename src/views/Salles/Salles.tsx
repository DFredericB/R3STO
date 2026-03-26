import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { useToast } from '../../components/ui/Toast'

type TabType = 'salles' | 'services' | 'avance'
type ModalKind = 'none' | 'add-salle' | 'edit-salle' | 'add-service' | 'edit-service'

type SalleForm = {
  name: string
  type: string
  color: string
  exterior: boolean
  openByDefault: boolean
  active: boolean
}

type SvcForm = {
  name: string
  icon: string
  open: string
  close: string
  lastOrder: string
  buffer: number
  bookingCutoffMins: number
  active: boolean
}

const SALLE_COLORS = ['#4480d8','#38b090','#e08030','#9b59b6','#e74c3c','#1abc9c']
const SVC_ICONS = ['🍽️','🍴','☕','🍸','🥐','🥗','🍣']

// Demo data
const DEMO_SALLES = [
  { id: 'sa1', name: 'Salle principale', type: 'intérieure', color: '#4480d8', exterior: false, openByDefault: true, active: true, priority: 1 },
  { id: 'sa2', name: 'Terrasse', type: 'extérieure', color: '#38b090', exterior: true, openByDefault: false, active: true, priority: 2 },
  { id: 'sa3', name: 'Bar', type: 'bar', color: '#e08030', exterior: false, openByDefault: true, active: true, priority: 3 },
]

const DEMO_SERVICES = [
  { id: 's1', name: 'Déjeuner', icon: '🍽️', open: '12:00', close: '14:30', lastOrder: '13:45', buffer: 15, bookingCutoffMins: 0, active: true },
  { id: 's2', name: 'Dîner', icon: '🍴', open: '19:00', close: '22:30', lastOrder: '21:30', buffer: 20, bookingCutoffMins: 30, active: true },
]

const DEMO_TABLES = [
  { id: 't1', n: 'T1', nm: 'Coin', salle: 'Salle principale', capMin: 2, capMax: 4 },
  { id: 't2', n: 'T2', nm: 'Fenêtre', salle: 'Salle principale', capMin: 2, capMax: 2 },
  { id: 't3', n: 'T3', nm: '', salle: 'Terrasse', capMin: 4, capMax: 6 },
  { id: 't4', n: 'T4', nm: '', salle: 'Bar', capMin: 1, capMax: 2 },
]

function timeToMins(time: string): number {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function minsToSlot(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`
}

export function Salles() {
  const { t } = useT()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('salles')
  const [salles, setSalles] = useState(DEMO_SALLES)
  const [services, setServices] = useState(DEMO_SERVICES)
  const [tables] = useState(DEMO_TABLES)

  // Modal state
  const [modal, setModal] = useState<ModalKind>('none')
  const [editSalleId, setEditSalleId] = useState<string | null>(null)
  const [editSvcId, setEditSvcId] = useState<string | null>(null)

  const defaultSalleForm: SalleForm = { name: '', type: 'intérieure', color: '#4480d8', exterior: false, openByDefault: false, active: true }
  const defaultSvcForm: SvcForm = { name: '', icon: '🍽️', open: '12:00', close: '14:30', lastOrder: '13:45', buffer: 15, bookingCutoffMins: 0, active: true }
  const [salleForm, setSalleForm] = useState<SalleForm>(defaultSalleForm)
  const [svcForm, setSvcForm] = useState<SvcForm>(defaultSvcForm)

  function openAddSalle() {
    setSalleForm(defaultSalleForm)
    setEditSalleId(null)
    setModal('add-salle')
  }

  function openEditSalle(id: string) {
    const s = salles.find(s => s.id === id)
    if (!s) return
    setSalleForm({ name: s.name, type: s.type, color: s.color, exterior: s.exterior, openByDefault: s.openByDefault, active: s.active })
    setEditSalleId(id)
    setModal('edit-salle')
  }

  function submitSalle() {
    if (!salleForm.name.trim()) return
    if (modal === 'add-salle') {
      const newId = `sa${Date.now()}`
      setSalles(prev => [...prev, { id: newId, ...salleForm, priority: prev.length + 1 }])
      toast('Salle ajoutée', 'success')
    } else if (editSalleId) {
      setSalles(prev => prev.map(s => s.id === editSalleId ? { ...s, ...salleForm } : s))
      toast('Salle modifiée', 'success')
    }
    setModal('none')
  }

  function openAddSvc() {
    setSvcForm(defaultSvcForm)
    setEditSvcId(null)
    setModal('add-service')
  }

  function openEditSvc(id: string) {
    const s = services.find(s => s.id === id)
    if (!s) return
    setSvcForm({ name: s.name, icon: s.icon, open: s.open, close: s.close, lastOrder: s.lastOrder, buffer: s.buffer, bookingCutoffMins: s.bookingCutoffMins, active: s.active })
    setEditSvcId(id)
    setModal('edit-service')
  }

  function submitSvc() {
    if (!svcForm.name.trim()) return
    if (modal === 'add-service') {
      const newId = `s${Date.now()}`
      setServices(prev => [...prev, { id: newId, ...svcForm }])
      toast('Service ajouté', 'success')
    } else if (editSvcId) {
      setServices(prev => prev.map(s => s.id === editSvcId ? { ...s, ...svcForm } : s))
      toast('Service modifié', 'success')
    }
    setModal('none')
  }

  // Get salle stats
  const getSalleStats = (salle: typeof DEMO_SALLES[0]) => {
    const salleTables = tables.filter(t => t.salle === salle.name)
    const capTot = salleTables.reduce((a, t) => a + t.capMax, 0)
    const capOcc = Math.floor(capTot * (Math.random() * 0.8)) // Demo occupation
    const pct = capTot ? Math.round((capOcc / capTot) * 100) : 0
    return { capTot, capOcc, tblCount: salleTables.length, pct }
  }

  const typeIcon: Record<string, string> = {
    intérieure: '🏠',
    privée: '🔒',
    extérieure: '🌿',
    bar: '🍸',
  }

  const activeSalles = salles.filter(s => s.active).length
  const activeServices = services.filter(s => s.active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
            Salles & Services
          </div>
          <div style={{ fontSize: 13, color: 'var(--t3)' }}>
            {activeSalles} salles · {activeServices} services
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
          {['salles', 'services', 'avance'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabType)}
              style={{
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 4,
                border: `1px solid ${activeTab === tab ? 'var(--bl)' : 'var(--border)'}`,
                background: activeTab === tab ? 'var(--bp)' : 'transparent',
                color: activeTab === tab ? 'var(--bl)' : 'var(--t3)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tab === 'salles' && `🏛 Salles (${salles.length})`}
              {tab === 'services' && `⏱ Services (${services.length})`}
              {tab === 'avance' && '⚙️ Avancé'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {activeTab === 'salles' && (
            <button
              onClick={openAddSalle}
              style={{
                fontSize: 11,
                padding: '3px 11px',
                borderRadius: 4,
                border: '1px solid var(--bl)',
                background: 'var(--bl)',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ➕ Salle
            </button>
          )}
          {activeTab === 'services' && (
            <button
              onClick={openAddSvc}
              style={{
                fontSize: 11,
                padding: '3px 11px',
                borderRadius: 4,
                border: '1px solid var(--bl)',
                background: 'var(--bl)',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ➕ Service
            </button>
          )}
          <button
            style={{
              fontSize: 11,
              padding: '3px 9px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--surf2)',
              color: 'var(--text)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📐 Éditeur
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'salles' && (
          <div style={{ padding: '12px 18px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {salles.map(salle => {
              const stats = getSalleStats(salle)
              const pctCol = stats.pct >= 90 ? 'var(--rd)' : stats.pct >= 70 ? '#e08030' : 'var(--gn)'
              return (
                <div
                  key={salle.id}
                  style={{
                    background: 'var(--surf2)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 13,
                    overflow: 'hidden',
                    opacity: salle.active ? 1 : 0.55,
                  }}
                >
                  <div
                    style={{
                      padding: '11px 13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: salle.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
                        {salle.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)', marginTop: 1 }}>
                        {salle.exterior ? '🌿 Extérieure' : '🏠 Intérieure'}
                        {salle.openByDefault && ' · Ouverte par défaut'}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 20,
                        background: salle.active ? 'rgba(60,200,112,.15)' : 'rgba(220,80,80,.1)',
                        color: salle.active ? 'var(--gn)' : 'var(--rd)',
                      }}
                    >
                      {salle.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ padding: '11px 13px' }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 9 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--text)' }}>
                          {stats.tblCount}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>tables</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--text)' }}>
                          {stats.capTot}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>couverts</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: 'var(--t3)' }}>Occupation</span>
                          <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--fm)', color: pctCol }}>
                            {stats.pct}%
                          </span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.07)' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${stats.pct}%`,
                              background: pctCol,
                              borderRadius: 3,
                              transition: '.4s',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                      <button
                        onClick={() => openEditSalle(salle.id)}
                        style={{
                          fontSize: 11,
                          padding: '5px 0',
                          borderRadius: 4,
                          border: '1px solid var(--border)',
                          background: 'var(--surf3)',
                          color: 'var(--text)',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() =>
                          setSalles(salles.map(s => (s.id === salle.id ? { ...s, active: !s.active } : s)))
                        }
                        style={{
                          fontSize: 11,
                          padding: '5px 0',
                          borderRadius: 4,
                          border: `1px solid var(--border)`,
                          background: salle.active ? 'var(--surf3)' : 'var(--gn)',
                          color: salle.active ? 'var(--text)' : 'white',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {salle.active ? '⏸ Pause' : '▶ Activer'}
                      </button>
                      <button
                        onClick={() => setSalles(salles.filter(s => s.id !== salle.id))}
                        style={{
                          fontSize: 11,
                          padding: '5px 0',
                          borderRadius: 4,
                          border: '1px solid var(--rd)',
                          background: 'rgba(220,80,80,.1)',
                          color: 'var(--rd)',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🗑 Suppr.
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {/* Add Salle Card */}
            <div
              onClick={openAddSalle}
              style={{
                background: 'var(--surf2)',
                border: '1.5px dashed var(--border)',
                borderRadius: 13,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: 24,
                cursor: 'pointer',
                minHeight: 160,
              }}
            >
              <div style={{ fontSize: 26, opacity: 0.25 }}>➕</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>Ajouter une salle</div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div style={{ padding: '12px 18px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
            {services.map(svc => {
              const openM = timeToMins(svc.open)
              const loM = timeToMins(svc.lastOrder)
              const closeM = timeToMins(svc.close)
              const slotCount = Math.floor((closeM - openM) / 15) + 1
              const slotsPreview = []
              for (let m = openM; m <= loM && slotsPreview.length < 4; m += 15) {
                slotsPreview.push(minsToSlot(m).replace('h', ':'))
              }

              return (
                <div
                  key={svc.id}
                  style={{
                    background: 'var(--surf2)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 13,
                    padding: 13,
                    opacity: svc.active ? 1 : 0.55,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>{svc.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                        {svc.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>
                        {slotCount} créneaux · 15min
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 20,
                        background: svc.active ? 'rgba(60,200,112,.15)' : 'rgba(220,80,80,.1)',
                        color: svc.active ? 'var(--gn)' : 'var(--rd)',
                      }}
                    >
                      {svc.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 9 }}>
                    <div style={{ padding: '6px 9px', background: 'rgba(68,128,216,.07)', border: '1px solid rgba(68,128,216,.15)', borderRadius: 7 }}>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 1 }}>Ouverture</div>
                      <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--text)' }}>
                        {svc.open}
                      </div>
                    </div>
                    <div style={{ padding: '6px 9px', background: 'rgba(68,128,216,.07)', border: '1px solid rgba(68,128,216,.15)', borderRadius: 7 }}>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 1 }}>Fermeture</div>
                      <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--text)' }}>
                        {svc.close}
                      </div>
                    </div>
                    <div style={{ padding: '6px 9px', background: 'rgba(220,80,80,.07)', border: '1px solid rgba(220,80,80,.2)', borderRadius: 7 }}>
                      <div style={{ fontSize: 11, color: 'var(--rd)', marginBottom: 1 }}>Last order</div>
                      <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--rd)' }}>
                        {svc.lastOrder}
                      </div>
                    </div>
                    {svc.bookingCutoffMins > 0 && (
                      <div style={{ padding: '6px 9px', background: 'rgba(250,204,21,.07)', border: '1px solid rgba(250,204,21,.2)', borderRadius: 7 }}>
                        <div style={{ fontSize: 11, color: '#d4a800' }}>Cutoff</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#d4a800' }}>
                          {svc.bookingCutoffMins >= 60 ? `${svc.bookingCutoffMins / 60}h` : `${svc.bookingCutoffMins}min`}
                        </div>
                      </div>
                    )}
                    <div style={{ padding: '6px 9px', background: 'rgba(68,128,216,.07)', border: '1px solid rgba(68,128,216,.15)', borderRadius: 7 }}>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 1 }}>Retournement</div>
                      <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--text)' }}>
                        {svc.buffer}<span style={{ fontSize: 11, opacity: 0.6 }}>min</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 9 }}>
                    {slotsPreview.map((sl, i) => (
                      <span key={i} style={{ fontFamily: 'var(--fm)', fontSize: 11, padding: '1px 5px', borderRadius: 4, background: 'rgba(68,128,216,.12)', color: 'var(--bl)' }}>
                        {sl}
                      </span>
                    ))}
                    {slotCount > 4 && (
                      <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--fm)', padding: '1px 4px' }}>
                        +{slotCount - 4}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                    <button
                      onClick={() => openEditSvc(svc.id)}
                      style={{
                        fontSize: 11,
                        padding: '5px 0',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        background: 'var(--surf3)',
                        color: 'var(--text)',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() =>
                        setServices(services.map(s => (s.id === svc.id ? { ...s, active: !s.active } : s)))
                      }
                      style={{
                        fontSize: 11,
                        padding: '5px 0',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        background: svc.active ? 'var(--surf3)' : 'var(--gn)',
                        color: svc.active ? 'var(--text)' : 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {svc.active ? '⏸ Pause' : '▶ Activer'}
                    </button>
                    <button
                      onClick={() => setServices(services.filter(s => s.id !== svc.id))}
                      style={{
                        fontSize: 11,
                        padding: '5px 0',
                        borderRadius: 4,
                        border: '1px solid var(--rd)',
                        background: 'rgba(220,80,80,.1)',
                        color: 'var(--rd)',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      🗑 Suppr.
                    </button>
                  </div>
                </div>
              )
            })}
            {/* Add Service Card */}
            <div
              onClick={openAddSvc}
              style={{
                background: 'var(--surf2)',
                border: '1.5px dashed var(--border)',
                borderRadius: 13,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: 24,
                cursor: 'pointer',
                minHeight: 160,
              }}
            >
              <div style={{ fontSize: 26, opacity: 0.25 }}>➕</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>Ajouter un service</div>
            </div>
          </div>
        )}

        {activeTab === 'avance' && (
          <div style={{ padding: '12px 18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.09em', fontFamily: 'var(--fm)', marginBottom: 7 }}>
              Priorité des salles
            </div>
            <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 7 }}>
              L'algorithme remplit les salles dans cet ordre
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {salles.filter(s => s.active).map((salle, i) => (
                <div
                  key={salle.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    background: 'var(--surf2)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--t3)', minWidth: 16 }}>
                    {i + 1}
                  </span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: salle.color }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                    {salle.name}
                  </span>
                  <button
                    onClick={() => {
                      const newSalles = [...salles]
                      if (i > 0) {
                        const tmp = newSalles[i]
                        newSalles[i] = newSalles[i - 1]
                        newSalles[i - 1] = tmp
                        setSalles(newSalles)
                      }
                    }}
                    disabled={i === 0}
                    style={{
                      padding: '2px 7px',
                      border: '1px solid var(--border)',
                      borderRadius: 5,
                      background: 'transparent',
                      cursor: i === 0 ? 'not-allowed' : 'pointer',
                      color: 'var(--t3)',
                      fontSize: 12,
                      opacity: i === 0 ? 0.5 : 1,
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => {
                      const activeSalles = salles.filter(s => s.active)
                      const newSalles = [...salles]
                      if (i < activeSalles.length - 1) {
                        const tmp = newSalles[i]
                        newSalles[i] = newSalles[i + 1]
                        newSalles[i + 1] = tmp
                        setSalles(newSalles)
                      }
                    }}
                    disabled={i >= salles.filter(s => s.active).length - 1}
                    style={{
                      padding: '2px 7px',
                      border: '1px solid var(--border)',
                      borderRadius: 5,
                      background: 'transparent',
                      cursor: i >= salles.filter(s => s.active).length - 1 ? 'not-allowed' : 'pointer',
                      color: 'var(--t3)',
                      fontSize: 12,
                      opacity: i >= salles.filter(s => s.active).length - 1 ? 0.5 : 1,
                    }}
                  >
                    ↓
                  </button>
                </div>
              ))}
            </div>

            {/* ── FLUX RULES ── */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.09em', fontFamily: 'var(--fm)', marginBottom: 7 }}>
                Règles de flux
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 9 }}>
                Quand une salle atteint un seuil, l'IA redirige vers la salle suivante
              </div>
              {salles.filter(s => s.active).map((salle, i, arr) => {
                const nextSalle = arr[(i + 1) % arr.length]
                return (
                  <div key={salle.id + '-flux'} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px',
                    background: 'var(--surf2)', border: '1.5px solid var(--border)', borderRadius: 8, marginBottom: 5,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: salle.color }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', minWidth: 90 }}>{salle.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--t4)' }}>à</span>
                    <select defaultValue="80" style={{
                      fontSize: 11, padding: '2px 6px', borderRadius: 5, border: '1px solid var(--border)',
                      background: 'var(--surf)', color: 'var(--text)', fontFamily: 'var(--fm)',
                    }}>
                      {[60, 70, 80, 90, 100].map(v => <option key={v} value={v}>{v}%</option>)}
                    </select>
                    <span style={{ fontSize: 10, color: 'var(--t4)' }}>→</span>
                    <select defaultValue={nextSalle?.name} style={{
                      fontSize: 11, padding: '2px 6px', borderRadius: 5, border: '1px solid var(--border)',
                      background: 'var(--surf)', color: 'var(--text)', flex: 1,
                    }}>
                      {arr.filter(s => s.id !== salle.id).map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                      <option value="">— Aucun (refuser)</option>
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--t3)', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" defaultChecked style={{ accentColor: 'var(--bl)', width: 12, height: 12 }} />
                      Actif
                    </label>
                  </div>
                )
              })}
              <button
                onClick={() => toast('Règle de flux ajoutée', 'success')}
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 5, border: '1px dashed var(--border)',
                  background: 'transparent', color: 'var(--t3)', cursor: 'pointer', marginTop: 4,
                }}
              >
                + Ajouter une règle personnalisée
              </button>
            </div>

            {/* ── FLOW GROUPS ── */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.09em', fontFamily: 'var(--fm)', marginBottom: 7 }}>
                Groupes de flux
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 9 }}>
                Regroupez les salles pour gérer le remplissage par zones
              </div>
              <div style={{
                padding: '11px 13px', background: 'var(--surf2)', border: '1.5px solid var(--border)',
                borderRadius: 8, marginBottom: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Flux principal</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'rgba(68,128,216,.12)', color: 'var(--bl)', fontWeight: 700 }}>Par défaut</span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {salles.filter(s => s.active).map((s, i) => (
                    <span key={s.id} style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 5,
                      background: s.color + '20', color: s.color, fontWeight: 700,
                      border: `1px solid ${s.color}40`,
                    }}>
                      {i + 1}. {s.name}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => toast('Nouveau groupe de flux créé', 'success')}
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 5, border: '1px dashed var(--border)',
                  background: 'transparent', color: 'var(--t3)', cursor: 'pointer',
                }}
              >
                + Créer un groupe de flux
              </button>
            </div>

            {/* Table Priority Section */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>
                {tables.length} tables · Glissez le curseur pour ajuster la priorité IA
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {tables.map(tbl => (
                  <div
                    key={tbl.id}
                    style={{
                      background: 'var(--surf2)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 11,
                      padding: '11px 13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'var(--surf)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--fm)',
                        fontWeight: 800,
                        fontSize: 13,
                        color: 'var(--bl)',
                        border: '1.5px solid var(--bl)',
                      }}
                    >
                      {tbl.n}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                        {tbl.n}
                        {tbl.nm && ` · ${tbl.nm}`}
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      defaultValue="5"
                      style={{
                        width: 80,
                        accentColor: 'var(--bl)',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL OVERLAY ──────────────────────────────── */}
      {modal !== 'none' && (
        <div
          onClick={() => setModal('none')}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surf)',
              border: '1.5px solid var(--border)',
              borderRadius: 14,
              padding: '22px 22px 18px',
              width: 360,
              maxWidth: '92vw',
              boxShadow: '0 12px 40px rgba(0,0,0,.35)',
            }}
          >
            {/* SALLE FORM */}
            {(modal === 'add-salle' || modal === 'edit-salle') && (
              <>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', marginBottom: 16 }}>
                  {modal === 'add-salle' ? '➕ Nouvelle salle' : '✏️ Modifier la salle'}
                </div>

                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Nom</label>
                <input
                  autoFocus
                  value={salleForm.name}
                  onChange={e => setSalleForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submitSalle()}
                  placeholder="Ex : Salle principale, Terrasse…"
                  style={{
                    width: '100%', padding: '7px 10px', fontSize: 13,
                    borderRadius: 7, border: '1.5px solid var(--border)',
                    background: 'var(--surf2)', color: 'var(--text)',
                    fontFamily: 'var(--ff)', marginBottom: 12, boxSizing: 'border-box',
                  }}
                />

                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Type</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                  {(['intérieure', 'extérieure', 'privée', 'bar'] as const).map(tp => (
                    <button
                      key={tp}
                      onClick={() => setSalleForm(f => ({ ...f, type: tp, exterior: tp === 'extérieure' }))}
                      style={{
                        padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                        border: `1.5px solid ${salleForm.type === tp ? 'var(--bl)' : 'var(--border)'}`,
                        background: salleForm.type === tp ? 'var(--bp)' : 'transparent',
                        color: salleForm.type === tp ? 'var(--bl)' : 'var(--t3)',
                        cursor: 'pointer',
                      }}
                    >
                      {tp === 'intérieure' ? '🏠' : tp === 'extérieure' ? '🌿' : tp === 'privée' ? '🔒' : '🍸'} {tp}
                    </button>
                  ))}
                </div>

                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Couleur</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {SALLE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setSalleForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 22, height: 22, borderRadius: '50%', background: c,
                        border: `2.5px solid ${salleForm.color === c ? 'var(--text)' : 'transparent'}`,
                        cursor: 'pointer', padding: 0,
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={salleForm.color}
                    onChange={e => setSalleForm(f => ({ ...f, color: e.target.value }))}
                    style={{ width: 22, height: 22, border: 'none', borderRadius: '50%', padding: 0, cursor: 'pointer', background: 'transparent' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--t2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={salleForm.openByDefault}
                      onChange={e => setSalleForm(f => ({ ...f, openByDefault: e.target.checked }))}
                      style={{ accentColor: 'var(--bl)' }}
                    />
                    Ouverte par défaut
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--t2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={salleForm.active}
                      onChange={e => setSalleForm(f => ({ ...f, active: e.target.checked }))}
                      style={{ accentColor: 'var(--bl)' }}
                    />
                    Active
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setModal('none')} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--t2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button
                    onClick={submitSalle}
                    disabled={!salleForm.name.trim()}
                    style={{
                      padding: '7px 16px', borderRadius: 7, border: 'none',
                      background: salleForm.name.trim() ? 'var(--bl)' : 'var(--border)',
                      color: salleForm.name.trim() ? 'white' : 'var(--t4)',
                      fontWeight: 700, fontSize: 12, cursor: salleForm.name.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {modal === 'add-salle' ? 'Ajouter' : 'Enregistrer'}
                  </button>
                </div>
              </>
            )}

            {/* SERVICE FORM */}
            {(modal === 'add-service' || modal === 'edit-service') && (
              <>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', marginBottom: 16 }}>
                  {modal === 'add-service' ? '➕ Nouveau service' : '✏️ Modifier le service'}
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Nom</label>
                    <input
                      autoFocus
                      value={svcForm.name}
                      onChange={e => setSvcForm(f => ({ ...f, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && submitSvc()}
                      placeholder="Ex : Déjeuner, Dîner…"
                      style={{
                        width: '100%', padding: '7px 10px', fontSize: 13,
                        borderRadius: 7, border: '1.5px solid var(--border)',
                        background: 'var(--surf2)', color: 'var(--text)',
                        fontFamily: 'var(--ff)', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Icône</label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 140 }}>
                      {SVC_ICONS.map(ic => (
                        <button
                          key={ic}
                          onClick={() => setSvcForm(f => ({ ...f, icon: ic }))}
                          style={{
                            width: 30, height: 30, borderRadius: 6, fontSize: 16,
                            border: `1.5px solid ${svcForm.icon === ic ? 'var(--bl)' : 'var(--border)'}`,
                            background: svcForm.icon === ic ? 'var(--bp)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {([['Ouverture', 'open'], ['Last order', 'lastOrder'], ['Fermeture', 'close']] as const).map(([lbl, key]) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>{lbl}</label>
                      <input
                        type="time"
                        value={svcForm[key]}
                        onChange={e => setSvcForm(f => ({ ...f, [key]: e.target.value }))}
                        style={{
                          width: '100%', padding: '6px 7px', fontSize: 12,
                          borderRadius: 7, border: '1.5px solid var(--border)',
                          background: 'var(--surf2)', color: 'var(--text)',
                          fontFamily: 'var(--fm)', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Retournement (min)</label>
                    <input
                      type="number" min={0} max={120}
                      value={svcForm.buffer}
                      onChange={e => setSvcForm(f => ({ ...f, buffer: Number(e.target.value) }))}
                      style={{
                        width: '100%', padding: '6px 9px', fontSize: 12,
                        borderRadius: 7, border: '1.5px solid var(--border)',
                        background: 'var(--surf2)', color: 'var(--text)',
                        fontFamily: 'var(--fm)', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Cutoff résa (min)</label>
                    <input
                      type="number" min={0} max={1440}
                      value={svcForm.bookingCutoffMins}
                      onChange={e => setSvcForm(f => ({ ...f, bookingCutoffMins: Number(e.target.value) }))}
                      style={{
                        width: '100%', padding: '6px 9px', fontSize: 12,
                        borderRadius: 7, border: '1.5px solid var(--border)',
                        background: 'var(--surf2)', color: 'var(--text)',
                        fontFamily: 'var(--fm)', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--t2)', cursor: 'pointer', marginBottom: 16 }}>
                  <input
                    type="checkbox"
                    checked={svcForm.active}
                    onChange={e => setSvcForm(f => ({ ...f, active: e.target.checked }))}
                    style={{ accentColor: 'var(--bl)' }}
                  />
                  Actif
                </label>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setModal('none')} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--t2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button
                    onClick={submitSvc}
                    disabled={!svcForm.name.trim()}
                    style={{
                      padding: '7px 16px', borderRadius: 7, border: 'none',
                      background: svcForm.name.trim() ? 'var(--bl)' : 'var(--border)',
                      color: svcForm.name.trim() ? 'white' : 'var(--t4)',
                      fontWeight: 700, fontSize: 12, cursor: svcForm.name.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {modal === 'add-service' ? 'Ajouter' : 'Enregistrer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
