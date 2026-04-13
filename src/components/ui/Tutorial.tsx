import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'

// ══════════════════════════════════════════════════
//  R3STO — Tutorial / Didacticiel
//  Checklist sidebar + Tooltip tour
// ══════════════════════════════════════════════════

// ── Tutorial Steps Definition ─────────────────────
export interface TutorialStep {
  id: string
  icon: string
  title: string
  desc: string
  route: string        // route ou le step est pertinent
  checkFn?: () => boolean  // verification auto si complete
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'tables',
    icon: '📐',
    title: 'Configurer vos tables',
    desc: 'Placez vos tables dans le plan de salle',
    route: '/setup-plan',
  },
  {
    id: 'first-resa',
    icon: '📝',
    title: 'Creer votre 1ere reservation',
    desc: 'Ajoutez une reservation pour tester le systeme',
    route: '/nouvelle-resa',
  },
  {
    id: 'plan-view',
    icon: '🗺️',
    title: 'Consulter le plan de salle',
    desc: 'Voyez vos reservations sur le plan interactif',
    route: '/plan',
  },
  {
    id: 'agenda-view',
    icon: '📅',
    title: 'Explorer l\'agenda',
    desc: 'Visualisez votre planning chronologique',
    route: '/agenda',
  },
  {
    id: 'clients',
    icon: '👥',
    title: 'Decouvrir le CRM clients',
    desc: 'Gerez les fiches clients, VIP et allergies',
    route: '/clients',
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Ajuster les reglages',
    desc: 'Personnalisez les options de reservation',
    route: '/options',
  },
  {
    id: 'dashboard',
    icon: '📊',
    title: 'Consulter le tableau de bord',
    desc: 'Suivez vos statistiques en temps reel',
    route: '/dashboard',
  },
  {
    id: 'widget',
    icon: '🌐',
    title: 'Installer le widget de reservation',
    desc: 'Integrez la reservation en ligne sur votre site',
    route: '/widget',
  },
]

// ── Tooltip content per route (first visit) ────────
interface TooltipConfig {
  route: string
  title: string
  text: string
  position: 'top-right' | 'center' | 'bottom-right'
}

const ROUTE_TOOLTIPS: TooltipConfig[] = [
  {
    route: '/dashboard',
    title: 'Tableau de bord',
    text: 'Voici votre vue d\'ensemble. Vous y trouverez le taux de remplissage, les prochaines reservations et les statistiques du jour.',
    position: 'center'
  },
  {
    route: '/plan',
    title: 'Plan de salle',
    text: 'Glissez-deposez les reservations sur les tables. Cliquez sur une table pour voir les details ou modifier l\'attribution.',
    position: 'center'
  },
  {
    route: '/agenda',
    title: 'Agenda',
    text: 'Vue chronologique de votre service. Chaque ligne represente un creneau horaire avec les reservations du jour.',
    position: 'center'
  },
  {
    route: '/reservations',
    title: 'Liste des reservations',
    text: 'Toutes vos reservations en un coup d\'oeil. Filtrez par service, statut ou recherchez un client.',
    position: 'center'
  },
  {
    route: '/nouvelle-resa',
    title: 'Nouvelle reservation',
    text: 'Remplissez les champs pour creer une reservation. Le systeme verifie automatiquement la disponibilite.',
    position: 'center'
  },
  {
    route: '/clients',
    title: 'Gestion des clients',
    text: 'Retrouvez l\'historique de chaque client, ses preferences, allergies et statut VIP.',
    position: 'center'
  },
  {
    route: '/setup-plan',
    title: 'Editeur de plan',
    text: 'Ajoutez des tables, definissez leur capacite et positionnez-les. L\'IA utilisera ce plan pour le placement automatique.',
    position: 'center'
  },
  {
    route: '/options',
    title: 'Reglages',
    text: 'Configurez les horaires, la politique d\'annulation, les notifications et toutes les options de votre restaurant.',
    position: 'center'
  },
  {
    route: '/widget',
    title: 'Widget de reservation',
    text: 'Copiez le code et collez-le sur votre site web pour permettre a vos clients de reserver en ligne, 24h/24.',
    position: 'center'
  },
]

// ── LocalStorage helpers ──────────────────────────
const LS_KEY_ACTIVE = 'r3sto-tutorial-active'
const LS_KEY_COMPLETED = 'r3sto-tutorial-completed'
const LS_KEY_SEEN_ROUTES = 'r3sto-tutorial-seen-routes'

function getCompleted(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_COMPLETED) || '[]')
  } catch { return [] }
}

function setCompleted(ids: string[]) {
  localStorage.setItem(LS_KEY_COMPLETED, JSON.stringify(ids))
}

function getSeenRoutes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_SEEN_ROUTES) || '[]')
  } catch { return [] }
}

function addSeenRoute(route: string) {
  const seen = getSeenRoutes()
  if (!seen.includes(route)) {
    seen.push(route)
    localStorage.setItem(LS_KEY_SEEN_ROUTES, JSON.stringify(seen))
  }
}

// ══════════════════════════════════════════════════
//  TutorialChecklist — Sidebar checklist
// ══════════════════════════════════════════════════

export const TutorialChecklist: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isActive, setIsActive] = useState(() => localStorage.getItem(LS_KEY_ACTIVE) === 'true')
  const [completed, setCompletedState] = useState<string[]>(getCompleted)
  const isDemo = useAppStore(s => s.isDemo)
  const navigate = useNavigate()

  // Ne pas afficher en mode demo
  if (isDemo || !isActive) return null

  const progress = completed.length
  const total = TUTORIAL_STEPS.length
  const pct = Math.round((progress / total) * 100)
  const allDone = progress === total

  const toggleStep = (id: string) => {
    const next = completed.includes(id)
      ? completed.filter(c => c !== id)
      : [...completed, id]
    setCompletedState(next)
    setCompleted(next)
  }

  const dismiss = () => {
    localStorage.removeItem(LS_KEY_ACTIVE)
    localStorage.removeItem(LS_KEY_COMPLETED)
    localStorage.removeItem(LS_KEY_SEEN_ROUTES)
    setIsActive(false)
  }

  const navigateTo = (route: string) => {
    navigate(route)
  }

  // ── Floating button (collapsed) ────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000,
          width: '52px', height: '52px', borderRadius: '50%',
          backgroundColor: 'var(--bl)', color: '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
          boxShadow: '0 4px 16px rgba(28,79,144,.4)',
          transition: 'transform .2s'
        }}
        title="Guide de demarrage"
      >
        {allDone ? '🎉' : '📋'}
        {!allDone && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '22px', height: '22px', borderRadius: '50%',
            backgroundColor: 'var(--am)', color: '#000',
            fontSize: '11px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--surf)'
          }}>
            {total - progress}
          </span>
        )}
      </button>
    )
  }

  // ── Panel (expanded) ───────────────────────────
  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000,
      width: '340px', maxHeight: '80vh',
      backgroundColor: 'var(--surf)', borderRadius: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,.25)',
      border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      animation: 'r3slideUp .25s ease',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes r3slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
            Guide de demarrage
          </span>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}
          >
            ✕
          </button>
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            flex: 1, height: '6px', backgroundColor: 'var(--surf3)',
            borderRadius: '3px', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              backgroundColor: allDone ? 'var(--gn)' : 'var(--bl)',
              borderRadius: '3px', transition: 'width .3s ease'
            }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', whiteSpace: 'nowrap' }}>
            {progress}/{total}
          </span>
        </div>
      </div>

      {/* Steps */}
      <div style={{ overflowY: 'auto', padding: '8px 12px', flex: 1 }}>
        {allDone && (
          <div style={{
            textAlign: 'center', padding: '20px 8px',
            color: 'var(--text)', fontSize: '13px', lineHeight: 1.5
          }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
            <strong>Bravo !</strong><br />
            Vous avez termine le guide de demarrage.<br />
            R3STO est pret a recevoir vos clients !
          </div>
        )}

        {TUTORIAL_STEPS.map(step => {
          const done = completed.includes(step.id)
          return (
            <div
              key={step.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '10px 8px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background .15s',
                opacity: done ? 0.55 : 1
              }}
              onClick={() => {
                if (!done) navigateTo(step.route)
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surf3)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {/* Checkbox */}
              <button
                onClick={e => { e.stopPropagation(); toggleStep(step.id) }}
                style={{
                  width: '22px', height: '22px', minWidth: '22px',
                  borderRadius: '6px', border: `2px solid ${done ? 'var(--gn)' : 'var(--border)'}`,
                  backgroundColor: done ? 'var(--gn)' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '12px', fontWeight: 700, marginTop: '2px',
                  transition: 'all .2s'
                }}
              >
                {done ? '✓' : ''}
              </button>
              <div>
                <div style={{
                  fontSize: '13px', fontWeight: 600, color: 'var(--text)',
                  textDecoration: done ? 'line-through' : 'none'
                }}>
                  {step.icon} {step.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
                  {step.desc}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'center'
      }}>
        <button
          onClick={dismiss}
          style={{
            background: 'none', border: 'none',
            color: 'var(--t3)', fontSize: '11px',
            cursor: 'pointer', textDecoration: 'underline'
          }}
        >
          Masquer le guide
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
//  TutorialTooltip — Route-based tooltip on first visit
// ══════════════════════════════════════════════════

export const TutorialTooltip: React.FC = () => {
  const [tooltip, setTooltip] = useState<TooltipConfig | null>(null)
  const [visible, setVisible] = useState(false)
  const isDemo = useAppStore(s => s.isDemo)
  const location = useLocation()

  useEffect(() => {
    if (isDemo) return
    if (localStorage.getItem(LS_KEY_ACTIVE) !== 'true') return

    const pathname = location.pathname
    const seen = getSeenRoutes()

    if (!seen.includes(pathname)) {
      const cfg = ROUTE_TOOLTIPS.find(t => t.route === pathname)
      if (cfg) {
        setTooltip(cfg)
        setVisible(true)
        addSeenRoute(pathname)

        const timer = setTimeout(() => setVisible(false), 6000)
        return () => clearTimeout(timer)
      }
    }
  }, [location.pathname, isDemo])

  if (!visible || !tooltip) return null

  return (
    <div style={{
      position: 'fixed',
      top: '80px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 1001,
      maxWidth: '400px', width: 'calc(100% - 32px)',
      backgroundColor: 'var(--bl)', color: '#fff',
      borderRadius: '12px', padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(28,79,144,.4)',
      animation: 'r3tooltipIn .3s ease',
      display: 'flex', gap: '12px', alignItems: 'flex-start'
    }}>
      <style>{`
        @keyframes r3tooltipIn { from { opacity:0; transform:translateX(-50%) translateY(-8px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
      `}</style>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
          💡 {tooltip.title}
        </div>
        <div style={{ fontSize: '12px', lineHeight: 1.5, opacity: 0.9 }}>
          {tooltip.text}
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        style={{
          background: 'rgba(255,255,255,.2)', border: 'none',
          color: '#fff', cursor: 'pointer', borderRadius: '6px',
          padding: '4px 8px', fontSize: '12px', fontWeight: 600,
          whiteSpace: 'nowrap'
        }}
      >
        OK
      </button>
    </div>
  )
}
