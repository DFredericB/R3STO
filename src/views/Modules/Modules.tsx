// ══════════════════════════════════════════════════
//  R3STO — Modules Marketplace
//  Vue pour découvrir et activer les modules add-on
// ══════════════════════════════════════════════════

import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { PLANS as _PLANS, type PlanId, redirectToCheckout as _redirectToCheckout } from '../../utils/stripe'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Module {
  id: string
  name: string
  icon: string
  description: string
  price: string
  color: string
  status: 'active' | 'available' | 'coming'
  requiredPlan?: PlanId
  features: string[]
  url?: string   // URL du sous-site correspondant
  appPath?: string // Route interne dans l'app
}

const MODULES: Module[] = [
  {
    id: 'resa', name: 'R3STO Résa', icon: '📅',
    description: 'Réservations, plan de salle, CRM clients, widget en ligne',
    price: 'Inclus', color: '#3cc870', status: 'active',
    features: ['Réservations illimitées', 'Plan de salle interactif', 'Widget en ligne', 'CRM clients', 'Rappels SMS/email'],
    url: 'https://booking.r3sto.ch', appPath: '/grille',
  },
  {
    id: 'order', name: 'R3STO Order', icon: '🍳',
    description: 'KDS cuisine & bar, prise de commande, caisse',
    price: 'Bientôt', color: '#f97316', status: 'available', requiredPlan: 'resto',
    features: ['KDS cuisine temps réel', 'KDS bar', 'Prise de commande serveur', 'Caisse & encaissement'],
    appPath: '/commandes',
  },
  {
    id: 'delivery', name: 'R3STO Delivery', icon: '🛵',
    description: 'Livraison à domicile, take-away, suivi temps réel',
    price: 'Bientôt', color: '#10b981', status: 'available',
    features: ['Commandes livraison', 'Take-away', 'Zones & tarifs', 'Suivi livreurs GPS'],
    url: 'https://delivery.r3sto.ch', appPath: '/delivery',
  },
  {
    id: 'menu', name: 'R3STO Menu', icon: '📋',
    description: 'Menu digital QR code, allergènes, photos, multilingue',
    price: 'Bientôt', color: '#8b5cf6', status: 'available',
    features: ['QR code dynamique', 'Allergènes automatiques', 'Photos plats', 'FR/EN/DE/IT'],
    url: 'https://menu.r3sto.ch', appPath: '/menu',
  },
  {
    id: 'cash', name: 'R3STO Cash', icon: '💰',
    description: 'Caisse certifiée, TPE, factures, TVA',
    price: 'Bientôt', color: '#eab308', status: 'coming',
    features: ['Caisse certifiée Suisse', 'Terminal de paiement', 'Factures PDF', 'Calcul TVA'],
  },
  {
    id: 'stock', name: 'R3STO Stock', icon: '📦',
    description: 'Inventaire, fournisseurs, alertes rupture',
    price: 'Bientôt', color: '#06b6d4', status: 'coming',
    features: ['Inventaire temps réel', 'Fournisseurs & commandes', 'Alertes rupture', 'Coût matière'],
  },
  {
    id: 'team', name: 'R3STO Team', icon: '👥',
    description: 'Planning, pointage, congés, paie',
    price: 'Bientôt', color: '#6366f1', status: 'coming',
    features: ['Planning équipe', 'Pointage horaire', 'Gestion congés', 'Export paie'],
  },
  {
    id: 'finance', name: 'R3STO Finance', icon: '📊',
    description: 'Comptabilité simplifiée, rapports, export',
    price: 'Bientôt', color: '#14b8a6', status: 'coming',
    features: ['Journal comptable', 'Rapports mensuels', 'Export comptable', 'Dashboard CA'],
  },
  {
    id: 'insights', name: 'R3STO Insights', icon: '📈',
    description: 'Analytics avancées, prédictions, benchmarks',
    price: 'Bientôt', color: '#f43f5e', status: 'coming',
    features: ['Analytics avancées', 'Benchmarks secteur', 'Rapports personnalisés', 'Export PDF'],
  },
]

// Liens rapides vers les sous-sites R3STO
const QUICK_LINKS = [
  { icon: '📅', label: 'Réservations', url: 'https://booking.r3sto.ch', desc: 'Widget réservation' },
  { icon: '📋', label: 'Menu digital', url: 'https://menu.r3sto.ch', desc: 'QR code menu' },
  { icon: '🛵', label: 'Delivery', url: 'https://delivery.r3sto.ch', desc: 'Commandes en ligne' },
  { icon: '💳', label: 'Addition', url: 'https://bill.r3sto.ch', desc: 'Facture table' },
  { icon: '🌐', label: 'Vitrine', url: 'https://demo.r3sto.ch/lecomptoirdulac/', desc: 'Page restaurant' },
  { icon: '⚙️', label: 'Admin', url: 'https://admin.r3sto.ch', desc: 'Back-office' },
]

export function Modules() {
  const { resto } = useAppStore(); const enabledModules = [] as string[]; const toggleModule = (_m: string) => {}
  useT()
  const navigate = useNavigate()
  const plan = (resto?.plan || 'bistro') as PlanId
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [_interestedModuleId, _setInterestedModuleId] = useState<string | null>(null)

  const statusLabel = (mod: Module) => {
    if (mod.status === 'active') return { text: 'Actif', bg: 'rgba(60,200,112,.15)', color: '#3cc870' }
    if (enabledModules.includes(mod.id)) return { text: 'Activé', bg: 'rgba(60,200,112,.15)', color: '#3cc870' }
    if (mod.status === 'coming') return { text: 'Bientôt', bg: 'rgba(251,191,36,.12)', color: '#d97706' }
    return { text: 'Disponible', bg: 'rgba(59,130,246,.12)', color: '#3b82f6' }
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>
          Modules R3STO
        </h1>
        <p style={{ fontSize: 13, color: 'var(--t3)', margin: '4px 0 0' }}>
          Activez les modules dont vous avez besoin. Votre plan : <strong style={{ color: 'var(--gn)' }}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong>
        </p>
      </div>

      {/* ── Accès rapides sous-sites ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 8, marginBottom: 20,
      }}>
        {QUICK_LINKS.map(link => (
          <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surf)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 12px', textDecoration: 'none',
              transition: 'border-color .2s, transform .1s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bl)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
          >
            <span style={{ fontSize: 18 }}>{link.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.label}</div>
              <div style={{ fontSize: 10, color: 'var(--t4)' }}>{link.desc}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Bundle promo */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(60,200,112,.08), rgba(99,102,241,.08))',
        border: '1px solid rgba(60,200,112,.2)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>R3STO Total</div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>Tous les modules inclus — Économisez plus de 80 CHF/mois</div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gn)' }}>199 <small style={{ fontSize: 12, fontWeight: 400 }}>CHF/mois</small></div>
      </div>

      {/* Module grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {MODULES.map((mod) => {
          const st = statusLabel(mod)
          const expanded = expandedId === mod.id

          return (
            <div
              key={mod.id}
              onClick={() => setExpandedId(expanded ? null : mod.id)}
              style={{
                background: 'var(--surf)',
                border: `1px solid ${expanded ? mod.color : 'var(--border)'}`,
                borderRadius: 10,
                padding: 16,
                cursor: 'pointer',
                transition: 'border-color .2s',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{mod.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{mod.name}</span>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: st.bg, color: st.color, textTransform: 'uppercase',
                }}>{st.text}</span>
              </div>

              {/* Description */}
              <p style={{ fontSize: 12, color: 'var(--t3)', margin: '0 0 10px', lineHeight: 1.4 }}>{mod.description}</p>

              {/* Price */}
              <div style={{ fontSize: 14, fontWeight: 700, color: mod.color }}>{mod.price}</div>

              {/* Expanded features */}
              {expanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  {mod.features.map((f) => (
                    <div key={f} style={{ fontSize: 11, color: 'var(--t2)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: mod.color }}>✓</span> {f}
                    </div>
                  ))}
                  {/* Boutons d'action */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {mod.url && (
                      <a href={mod.url} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 6, textAlign: 'center',
                          border: `1.5px solid ${mod.color}`, background: 'transparent', color: mod.color,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
                        }}>
                        Ouvrir ↗
                      </a>
                    )}
                    {mod.status === 'available' && mod.status !== 'active' as any && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleModule(mod.id) }}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 6, textAlign: 'center',
                          border: 'none',
                          background: enabledModules.includes(mod.id) ? '#ef4444' : mod.color,
                          color: '#fff',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
                        }}>
                        {enabledModules.includes(mod.id) ? 'Désactiver' : 'Activer'}
                      </button>
                    )}
                    {(mod.status === 'active' || enabledModules.includes(mod.id)) && mod.appPath && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(mod.appPath!) }}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 6, textAlign: 'center',
                          border: 'none', background: mod.color, color: '#fff',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
                        }}>
                        Configurer
                      </button>
                    )}
                  </div>
                  {mod.status === 'coming' && (
                    <div style={{ marginTop: 10, fontSize: 11, color: '#d97706', textAlign: 'center', fontStyle: 'italic' }}>
                      Disponible prochainement
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
