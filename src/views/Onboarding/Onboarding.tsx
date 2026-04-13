import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Salle, Service, Table } from '../../types'

type OnboardingStep = 1 | 2 | 3 | 4

interface StepData {
  salles: Salle[]
  services: Service[]
  tables: Table[]
}

// ── Helpers tables ──────────────────────────────────
const TABLE_SHAPES: { value: Table['shape']; label: string; icon: string }[] = [
  { value: 'round',     label: 'Ronde',      icon: '⚪' },
  { value: 'square',    label: 'Carrée',     icon: '⬜' },
  { value: 'rect',      label: 'Rectangle',  icon: '▬' },
  { value: 'banquette', label: 'Banquette',  icon: '🪑' },
]

function makeTable(idx: number, salle: string): Table {
  const col = 4
  const row = Math.floor(idx / col)
  const colIdx = idx % col
  return {
    id: `t${idx + 1}`,
    n: `T${idx + 1}`,
    salle,
    shape: 'square',
    capMin: 2,
    capMax: 4,
    x: 10 + colIdx * 22,
    y: 10 + row * 22,
    w: 8,
    h: 8,
    active: true,
    priority: idx + 1,
    blocked: false,
    held: false,
  }
}

const DAYS_OF_WEEK = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mer', value: 3 },
  { label: 'Jeu', value: 4 },
  { label: 'Ven', value: 5 },
  { label: 'Sam', value: 6 },
  { label: 'Dim', value: 0 }
]

const SALLE_TYPES: Array<{ label: string; value: Salle['type'] }> = [
  { label: 'Intérieure', value: 'intérieure' },
  { label: 'Extérieure', value: 'extérieure' },
  { label: 'Privée', value: 'privée' },
  { label: 'Bar', value: 'bar' },
  
]

const DEFAULT_SALLE: Salle = {
  id: 'sa1',
  name: 'Salle principale',
  type: 'intérieure',
  exterior: false,
  active: true,
  openByDefault: true,
  color: '#4480d8',
  priority: 1
}

const DEFAULT_SERVICE: Service = {
  id: 'sv1',
  name: 'Midi',
  icon: '☀️',
  open: '12:00',
  close: '14:30',
  lastOrder: '13:45',
  buffer: 15,
  bookingCutoffMins: 0,
  active: true,
  color: '#4480d8',
  jours: [1, 2, 3, 4, 5, 6],
  maxCouverts: 80,
  maxParService: 0
}

// ── Didacticiel items ───────────────────────────────
const TUTO_ITEMS = [
  { icon: '📐', label: 'Plan de salle', desc: 'Placez vos tables sur le plan interactif' },
  { icon: '⚙️', label: 'Options',       desc: 'WiFi, allergènes, prépaiement, widget...' },
  { icon: '📅', label: 'Fermetures',    desc: 'Jours fériés, congés, fermetures ponctuelles' },
  { icon: '📱', label: 'Widget',        desc: 'Réservation en ligne sur votre site web' },
  { icon: '🍽️', label: 'Menu / Carte',  desc: 'Ajoutez votre carte pour les clients' },
  { icon: '👥', label: 'Accès & rôles', desc: 'Invitez votre équipe et gérez les permissions' },
]

export const Onboarding: React.FC = () => {
  const { resto, setSalles, setServices, setTables, updateResto} = useAppStore()
  const [phase, setPhase] = useState<'intro' | 'steps' | 'congrats'>('intro')
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)

  const [stepData, setStepData] = useState<StepData>({
    salles: [DEFAULT_SALLE],
    services: [DEFAULT_SERVICE],
    tables: Array.from({ length: 6 }, (_, i) => makeTable(i, 'sa1'))
  })

  // ── Capacité totale calculée depuis les tables ─────
  const totalCapacity = stepData.tables.reduce((sum, t) => sum + (t.capMax || 0), 0)

  // ── Step 1: Salles ────────────────────────────────
  const addSalle = () => {
    const newSalle: Salle = {
      id: `sa${Date.now()}`,
      name: `Salle ${stepData.salles.length + 1}`,
      type: 'intérieure',
      exterior: false,
      active: true,
      openByDefault: true,
      color: '#4480d8',
      priority: stepData.salles.length + 1
    }
    setStepData(prev => ({ ...prev, salles: [...prev.salles, newSalle] }))
  }

  const removeSalle = (id: string) => {
    if (stepData.salles.length > 1) {
      setStepData(prev => ({ ...prev, salles: prev.salles.filter(s => s.id !== id) }))
    }
  }

  const updateSalle = (id: string, key: keyof Salle, value: any) => {
    setStepData(prev => ({
      ...prev,
      salles: prev.salles.map(s => s.id === id ? { ...s, [key]: value } : s)
    }))
  }

  // ── Step 2: Services ──────────────────────────────
  const updateService = (id: string, key: keyof Service, value: any) => {
    setStepData(prev => ({
      ...prev,
      services: prev.services.map(sv => sv.id === id ? { ...sv, [key]: value } : sv)
    }))
  }

  const toggleServiceDay = (id: string, day: number) => {
    setStepData(prev => ({
      ...prev,
      services: prev.services.map(sv => {
        if (sv.id !== id) return sv
        const jours = sv.jours.includes(day)
          ? sv.jours.filter(d => d !== day)
          : [...sv.jours, day]
        return { ...sv, jours }
      })
    }))
  }

  const addService = () => {
    const newService: Service = {
      id: `sv${Date.now()}`,
      name: 'Nouveau service',
      icon: '⏰',
      open: '19:00',
      close: '22:30',
      lastOrder: '21:30',
      buffer: 15,
      bookingCutoffMins: 0,
      active: true,
      color: '#7c3aed',
      jours: [1, 2, 3, 4, 5, 6],
      maxCouverts: 80,
      maxParService: 0
    }
    setStepData(prev => ({ ...prev, services: [...prev.services, newService] }))
  }

  const removeService = (id: string) => {
    if (stepData.services.length > 1) {
      setStepData(prev => ({ ...prev, services: prev.services.filter(sv => sv.id !== id) }))
    }
  }

  // ── Step 3: Tables ────────────────────────────────
  const setTableCount = (count: number) => {
    const clamped = Math.max(1, Math.min(count, 40))
    const salleId = stepData.salles[0]?.id || 'sa1'
    setStepData(prev => {
      const existing = prev.tables
      if (clamped > existing.length) {
        const toAdd = Array.from({ length: clamped - existing.length }, (_, i) =>
          makeTable(existing.length + i, salleId)
        )
        return { ...prev, tables: [...existing, ...toAdd] }
      }
      return { ...prev, tables: existing.slice(0, clamped) }
    })
  }

  const setAllShape = (shape: Table['shape']) => {
    setStepData(prev => ({
      ...prev,
      tables: prev.tables.map(t => ({ ...t, shape }))
    }))
  }

  // ── Navigation ─────────────────────────────────────
  const canProceed = () => {
    if (currentStep === 3) return stepData.tables.length > 0
    return true
  }

  const handleNext = () => {
    if (!canProceed()) return
    if (currentStep < 4) setCurrentStep((currentStep + 1) as OnboardingStep)
  }

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as OnboardingStep)
  }

  // ── Finish ─────────────────────────────────────────
  const handleFinish = () => {
    setSalles(stepData.salles)

    // Capacité = somme des capMax des tables
    const servicesWithCapacity = stepData.services.map(sv => ({
      ...sv,
      maxCouverts: sv.maxCouverts || totalCapacity,
    }))
    setServices(servicesWithCapacity)

    // Recalculer positions et sauvegarder tables
    const salleId = stepData.salles[0]?.id || 'sa1'
    const finalTables = stepData.tables.map((t, i) => ({
      ...t,
      salle: salleId,
      id: `t${i + 1}`,
      n: `T${i + 1}`,
      priority: i + 1,
      x: 10 + (i % 4) * 22,
      y: 10 + Math.floor(i / 4) * 22,
    }))
    setTables(finalTables)

    // Capacité auto-calculée
    updateResto({ maxCvt: totalCapacity })

    void 0 //stubbed

    localStorage.setItem('r3sto-tutorial-active', 'true')
    localStorage.setItem('r3sto-tutorial-step', '0')

    setPhase('congrats')
  }

  // ══════════════════════════════════════════════════
  //  STYLES
  // ══════════════════════════════════════════════════

  const containerStyles: React.CSSProperties = {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--surf)',
    color: 'var(--text)',
    fontFamily: 'var(--ff)',
    overflow: 'auto',
    padding: '24px'
  }

  const contentStyles: React.CSSProperties = {
    maxWidth: '600px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px'
  }

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px'
  }

  const logoStyles: React.CSSProperties = {
    width: '80px',
    height: '80px',
    objectFit: 'cover'
  }

  const progressBarStyles: React.CSSProperties = {
    width: '100%',
    height: '4px',
    backgroundColor: 'var(--surf3)',
    borderRadius: '2px',
    overflow: 'hidden'
  }

  const progressFillStyles: React.CSSProperties = {
    height: '100%',
    backgroundColor: 'var(--bl)',
    width: `${(currentStep / 4) * 100}%`,
    transition: 'width 0.3s ease'
  }

  const titleStyles: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '8px',
    textAlign: 'center'
  }

  const subtitleStyles: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--t3)',
    textAlign: 'center'
  }

  const formStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minHeight: '300px'
  }

  const fieldGroupStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  }

  const labelStyles: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text)',
    textAlign: 'left'
  }

  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'var(--surf3)',
    border: '1.5px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    fontFamily: 'var(--ff)',
    fontSize: '13px',
    transition: 'border-color 0.15s',
    outline: 'none'
  }

  const selectStyles: React.CSSProperties = { ...inputStyles }

  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  }

  const buttonGroupStyles: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
    marginTop: '24px'
  }

  const buttonStyles: React.CSSProperties = {
    flex: 1,
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    fontFamily: 'var(--ff)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const secondaryButtonStyles: React.CSSProperties = {
    ...buttonStyles,
    backgroundColor: 'var(--surf3)',
    color: 'var(--t2)',
    border: '1.5px solid var(--border)'
  }

  const primaryButtonStyles: React.CSSProperties = {
    ...buttonStyles,
    backgroundColor: 'var(--bl)',
    color: '#fff'
  }

  const disabledButtonStyles: React.CSSProperties = {
    ...primaryButtonStyles,
    opacity: 0.5,
    cursor: 'not-allowed'
  }

  const cardStyles: React.CSSProperties = {
    padding: '16px',
    backgroundColor: 'var(--surf3)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  }

  const chipStyles = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    backgroundColor: active ? 'var(--bl)' : 'var(--surf4)',
    color: active ? '#fff' : 'var(--t3)',
    transition: 'all 0.2s'
  })

  // ══════════════════════════════════════════════════
  //  INTRO — Bienvenue (avant les steps)
  // ══════════════════════════════════════════════════

  const INTRO_FEATURES = [
    { icon: '0%',  text: 'Aucune commission sur vos réservations' },
    { icon: '🤖', text: 'IA de placement automatique' },
    { icon: '📊', text: 'Dashboard temps réel' },
    { icon: '👥', text: 'CRM intégré : fiches clients, VIP, allergies' },
    { icon: '📱', text: 'Widget de réservation en ligne' },
  ]

  if (phase === 'intro') {
    return (
      <div style={containerStyles}>
        <div style={{ ...contentStyles, maxWidth: '480px', textAlign: 'center' }}>
          <style>{`
            @keyframes r3fadeIn { from { opacity:0 } to { opacity:1 } }
            @keyframes r3scaleIn { from { opacity:0; transform:scale(.92) } to { opacity:1; transform:scale(1) } }
          `}</style>

          <div style={{ animation: 'r3scaleIn .4s ease' }}>
            <img src="/logo-r3sto.jpg" alt="R3STO" style={{ ...logoStyles, margin: '0 auto 16px' }} />
            <h1 style={{ ...titleStyles, fontSize: '28px', marginBottom: '4px' }}>
              Bienvenue sur R3STO
            </h1>
            <p style={{ ...subtitleStyles, fontSize: '14px', lineHeight: 1.6, marginBottom: '32px' }}>
              Le système de gestion complet pour votre restaurant.
              <br />Configurez votre établissement en quelques minutes.
            </p>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: '10px',
              textAlign: 'left', marginBottom: '32px'
            }}>
              {INTRO_FEATURES.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', backgroundColor: 'var(--surf3)', borderRadius: '10px',
                  fontSize: '13px', color: 'var(--text)', animation: `r3fadeIn .4s ease ${i * .08}s both`
                }}>
                  <span style={{
                    minWidth: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--bp)', borderRadius: '8px',
                    fontSize: f.icon.length <= 2 ? '16px' : '12px',
                    fontWeight: 700, color: 'var(--bl)'
                  }}>{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>

            <button
              style={{ ...primaryButtonStyles, width: '100%', padding: '14px', fontSize: '15px', borderRadius: '10px' }}
              onClick={() => setPhase('steps')}
            >
              Commencer l'installation
            </button>
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '14px' }}>
              {resto.name ? `Configuration de ${resto.name}` : '4 étapes rapides pour être opérationnel'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════
  //  CONGRATS — Félicitations (après les steps)
  // ══════════════════════════════════════════════════

  if (phase === 'congrats') {
    return (
      <div style={containerStyles}>
        <style>{`
          @keyframes r3fadeIn { from { opacity:0 } to { opacity:1 } }
          @keyframes r3scaleIn { from { opacity:0; transform:scale(.92) } to { opacity:1; transform:scale(1) } }
        `}</style>
        <div style={{ ...contentStyles, maxWidth: '520px', textAlign: 'center', animation: 'r3scaleIn .4s ease' }}>
          <div style={{ fontSize: '56px', marginBottom: '8px' }}>🎉</div>
          <h1 style={{ ...titleStyles, fontSize: '26px', marginBottom: '2px' }}>
            Félicitations !
          </h1>
          <p style={{ ...subtitleStyles, fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            <strong style={{ color: 'var(--text)' }}>{resto.name || 'Votre restaurant'}</strong> est configuré.
            <br />{stepData.salles.length} salle{stepData.salles.length > 1 ? 's' : ''}, {stepData.services.length} service{stepData.services.length > 1 ? 's' : ''}, {stepData.tables.length} table{stepData.tables.length > 1 ? 's' : ''} — capacité {totalCapacity} couverts.
          </p>

          {/* Didacticiel */}
          <div style={{
            textAlign: 'left', marginBottom: '24px',
            padding: '20px', backgroundColor: 'var(--surf3)', borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
              Pour aller plus loin
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '0 0 16px', lineHeight: 1.5 }}>
              Ces éléments sont optionnels mais recommandés pour tirer le meilleur parti de R3STO.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TUTO_ITEMS.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', backgroundColor: 'var(--surf)', borderRadius: '8px',
                  animation: `r3fadeIn .3s ease ${i * .06}s both`,
                  cursor: 'default'
                }}>
                  <span style={{
                    minWidth: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--bp)', borderRadius: '8px',
                    fontSize: '16px'
                  }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{item.desc}</div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>→</span>
                </div>
              ))}
            </div>
          </div>

          <button
            style={{ ...primaryButtonStyles, width: '100%', padding: '14px', fontSize: '15px', borderRadius: '10px' }}
            onClick={() => { window.location.href = '/dashboard' }}
          >
            Accéder à R3STO
          </button>
          <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '14px', lineHeight: 1.4 }}>
            Vous pouvez modifier tous ces paramètres à tout moment depuis les réglages.
          </p>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════
  //  STEPS — Wizard principal (4 étapes)
  // ══════════════════════════════════════════════════

  // ── STEP 1: Salles ────────────────────────────────
  const renderStep1 = () => (
    <div style={formStyles}>
      {stepData.salles.map((salle, idx) => (
        <div key={salle.id} style={cardStyles}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Salle {idx + 1}</h3>
            {stepData.salles.length > 1 && (
              <button
                style={{ background: 'none', border: 'none', color: 'var(--rd)', cursor: 'pointer', fontSize: '16px', padding: '4px 8px' }}
                onClick={() => removeSalle(salle.id)}
              >✕</button>
            )}
          </div>

          <div style={fieldGroupStyles}>
            <label style={labelStyles}>Nom</label>
            <input
              style={inputStyles}
              type="text"
              value={salle.name}
              onChange={e => updateSalle(salle.id, 'name', e.target.value)}
              placeholder="ex: Salle principale"
            />
          </div>

          <div style={fieldGroupStyles}>
            <label style={labelStyles}>Type</label>
            <select
              style={selectStyles}
              value={salle.type}
              onChange={e => {
                updateSalle(salle.id, 'type', e.target.value as Salle['type'])
                updateSalle(salle.id, 'exterior', e.target.value === 'extérieure')
              }}
            >
              {SALLE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      ))}

      <button
        style={{ ...secondaryButtonStyles, marginTop: '12px', backgroundColor: 'var(--bp)', color: 'var(--bl)', border: '1.5px solid var(--b2)' }}
        onClick={addSalle}
      >+ Ajouter une salle</button>
    </div>
  )

  // ── STEP 2: Services ──────────────────────────────
  const renderStep2 = () => (
    <div style={formStyles}>
      {stepData.services.map((service, idx) => (
        <div key={service.id} style={cardStyles}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Service {idx + 1}</h3>
            {stepData.services.length > 1 && (
              <button
                style={{ background: 'none', border: 'none', color: 'var(--rd)', cursor: 'pointer', fontSize: '16px', padding: '4px 8px' }}
                onClick={() => removeService(service.id)}
              >✕</button>
            )}
          </div>

          <div style={fieldGroupStyles}>
            <label style={labelStyles}>Nom du service</label>
            <input
              style={inputStyles}
              type="text"
              value={service.name}
              onChange={e => updateService(service.id, 'name', e.target.value)}
              placeholder="ex: Midi"
            />
          </div>

          <div style={gridStyles}>
            <div style={fieldGroupStyles}>
              <label style={labelStyles}>Ouverture</label>
              <input style={inputStyles} type="time" value={service.open}
                onChange={e => updateService(service.id, 'open', e.target.value)} />
            </div>
            <div style={fieldGroupStyles}>
              <label style={labelStyles}>Fermeture</label>
              <input style={inputStyles} type="time" value={service.close}
                onChange={e => updateService(service.id, 'close', e.target.value)} />
            </div>
          </div>

          <div style={fieldGroupStyles}>
            <label style={labelStyles}>Dernière commande</label>
            <input style={inputStyles} type="time" value={service.lastOrder}
              onChange={e => updateService(service.id, 'lastOrder', e.target.value)} />
          </div>

          <div style={fieldGroupStyles}>
            <label style={labelStyles}>Jours d'ouverture</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.value}
                  style={chipStyles(service.jours.includes(day.value))}
                  onClick={() => toggleServiceDay(service.id, day.value)}
                >{day.label}</button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button
        style={{ ...secondaryButtonStyles, marginTop: '12px', backgroundColor: 'var(--bp)', color: 'var(--bl)', border: '1.5px solid var(--b2)' }}
        onClick={addService}
      >+ Ajouter un service</button>
    </div>
  )

  // ── STEP 3: Tables ────────────────────────────────
  const renderStep3 = () => (
    <div style={formStyles}>
      {/* Nombre de tables */}
      <div style={cardStyles}>
        <div style={fieldGroupStyles}>
          <label style={labelStyles}>Nombre de tables</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              style={{ ...chipStyles(false), fontSize: '18px', width: '36px', height: '36px', padding: 0 }}
              onClick={() => setTableCount(stepData.tables.length - 1)}
            >−</button>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', minWidth: '40px', textAlign: 'center' }}>
              {stepData.tables.length}
            </span>
            <button
              style={{ ...chipStyles(false), fontSize: '18px', width: '36px', height: '36px', padding: 0 }}
              onClick={() => setTableCount(stepData.tables.length + 1)}
            >+</button>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            {[4, 6, 8, 10, 15, 20].map(n => (
              <button key={n} style={chipStyles(stepData.tables.length === n)}
                onClick={() => setTableCount(n)}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Forme par défaut */}
      <div style={cardStyles}>
        <div style={fieldGroupStyles}>
          <label style={labelStyles}>Forme par défaut</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {TABLE_SHAPES.map(s => (
              <button
                key={s.value}
                style={{
                  ...chipStyles(stepData.tables[0]?.shape === s.value),
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px'
                }}
                onClick={() => setAllShape(s.value)}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Capacité par défaut */}
      <div style={cardStyles}>
        <div style={fieldGroupStyles}>
          <label style={labelStyles}>Capacité par défaut</label>
          <div style={gridStyles}>
            <div style={fieldGroupStyles}>
              <label style={{ ...labelStyles, fontSize: '11px', color: 'var(--t3)' }}>Min</label>
              <input
                style={inputStyles}
                type="number"
                min={1}
                max={20}
                value={stepData.tables[0]?.capMin ?? 2}
                onChange={e => {
                  const v = Number(e.target.value) || 1
                  setStepData(prev => ({
                    ...prev,
                    tables: prev.tables.map(t => ({ ...t, capMin: v }))
                  }))
                }}
              />
            </div>
            <div style={fieldGroupStyles}>
              <label style={{ ...labelStyles, fontSize: '11px', color: 'var(--t3)' }}>Max</label>
              <input
                style={inputStyles}
                type="number"
                min={1}
                max={20}
                value={stepData.tables[0]?.capMax ?? 4}
                onChange={e => {
                  const v = Number(e.target.value) || 2
                  setStepData(prev => ({
                    ...prev,
                    tables: prev.tables.map(t => ({ ...t, capMax: v }))
                  }))
                }}
              />
            </div>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>
            Capacité totale estimée : <strong style={{ color: 'var(--text)' }}>{totalCapacity} couverts</strong>
          </p>
        </div>
      </div>

      {/* Aperçu grille */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
        gap: '8px',
        padding: '16px',
        backgroundColor: 'var(--surf3)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
      }}>
        {stepData.tables.map(t => (
          <div key={t.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '10px 4px',
            backgroundColor: 'var(--surf)',
            borderRadius: t.shape === 'round' ? '50%' : '6px',
            border: '1.5px solid var(--b2)',
            fontSize: '11px', fontWeight: 600, color: 'var(--bl)',
            aspectRatio: '1',
          }}>
            <div>{t.n}</div>
            <div style={{ fontSize: '9px', color: 'var(--t3)', fontWeight: 400 }}>{t.capMin}-{t.capMax}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '11px', color: 'var(--t3)', textAlign: 'center', lineHeight: 1.4 }}>
        Vous pourrez personnaliser chaque table et les disposer sur le plan interactif après l'installation.
      </p>
    </div>
  )

  // ── STEP 4: Récapitulatif ─────────────────────────
  const renderStep4 = () => (
    <div style={formStyles}>
      <div style={cardStyles}>
        <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px', marginTop: 0 }}>
          Salles ({stepData.salles.length})
        </h4>
        <div style={{ fontSize: '12px', color: 'var(--t3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {stepData.salles.map(s => (
            <div key={s.id}>{s.name} ({s.type})</div>
          ))}
        </div>
      </div>

      <div style={cardStyles}>
        <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px', marginTop: 0 }}>
          Services ({stepData.services.length})
        </h4>
        <div style={{ fontSize: '12px', color: 'var(--t3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {stepData.services.map(sv => (
            <div key={sv.id}>{sv.icon} {sv.name}: {sv.open} - {sv.close}</div>
          ))}
        </div>
      </div>

      <div style={cardStyles}>
        <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px', marginTop: 0 }}>
          Tables ({stepData.tables.length})
        </h4>
        <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
          {stepData.tables.length} table{stepData.tables.length > 1 ? 's' : ''} — {stepData.tables[0]?.capMin}-{stepData.tables[0]?.capMax} couverts — {TABLE_SHAPES.find(s => s.value === stepData.tables[0]?.shape)?.label || 'Carrée'}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bl)', marginTop: '4px' }}>
          Capacité totale : {totalCapacity} couverts
        </div>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════
  //  RENDER PRINCIPAL
  // ══════════════════════════════════════════════════

  const stepTitles = ['Salles', 'Services', 'Tables', 'Récapitulatif']
  const stepSubtitles = [
    'Configurez les espaces de votre établissement',
    "Définissez vos créneaux d'ouverture",
    'Ajoutez vos tables',
    'Vérifiez vos paramètres avant de lancer'
  ]

  return (
    <div style={containerStyles}>
      <div style={contentStyles}>
        {/* Header */}
        <div style={headerStyles}>
          <img src="/logo-r3sto.jpg" alt="R3STO" style={logoStyles} />
          <div>
            <h1 style={titleStyles}>Configuration R3STO</h1>
            <p style={subtitleStyles}>
              {resto.name ? `Installation de ${resto.name}` : 'Installation de votre restaurant'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={progressBarStyles}>
          <div style={progressFillStyles} />
        </div>

        {/* Step Title */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
            Étape {currentStep}: {stepTitles[currentStep - 1]}
          </h2>
          <p style={subtitleStyles}>{stepSubtitles[currentStep - 1]}</p>
        </div>

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {/* Navigation */}
        <div style={buttonGroupStyles}>
          <button
            style={currentStep === 1 ? { ...secondaryButtonStyles, opacity: 0.5, cursor: 'not-allowed' } : secondaryButtonStyles}
            onClick={handlePrev}
            disabled={currentStep === 1}
          >
            ← Précédent
          </button>

          {currentStep < 4 ? (
            <button
              style={!canProceed() ? disabledButtonStyles : primaryButtonStyles}
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Suivant →
            </button>
          ) : (
            <button style={primaryButtonStyles} onClick={handleFinish}>
              Lancer R3STO
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
