import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { useToast } from '../../components/ui/Toast'
import type { Fermeture } from '../../types/index'

// Swiss public holidays 2026
const FERIES_CH = [
  { date: '2026-01-01', label: 'Jour de l\'an' },
  { date: '2026-04-19', label: 'Dimanche de Pâques' },
  { date: '2026-04-20', label: 'Lundi de Pâques' },
  { date: '2026-05-01', label: 'Fête du Travail' },
  { date: '2026-05-28', label: 'Ascension' },
  { date: '2026-06-08', label: 'Pentecôte' },
  { date: '2026-08-01', label: 'Fête nationale suisse' },
  { date: '2026-12-25', label: 'Noël' },
  { date: '2026-12-26', label: 'Deuxième jour de Noël' },
]

export function Fermetures() {
  const { t } = useT()
  const { fermetures, salles, services } = useAppStore()
  const { toast } = useToast()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [fermType, setFermType] = useState('restaurant')
  const [selectedSalle, setSelectedSalle] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [showingFermetures, setShowingFermetures] = useState(true)

  // Demo data initialization
  const demoFermetures: Fermeture[] = [
    {
      id: 'f1',
      type: 'vacances',
      date: '2026-08-01',
      dateFin: '2026-08-16',
      label: 'Vacances été',
      note: 'Fermeture complète du restaurant',
      active: true,
    },
    {
      id: 'f2',
      type: 'ferie',
      date: '2026-12-25',
      label: 'Noël',
      active: true,
    },
  ]

  const activeFermetures = fermetures.length === 0 ? demoFermetures : fermetures
  const activeSalles = salles.length > 0 ? salles : [{ id: 's1', name: 'Salle principale', color: '#4480d8', active: true }]
  const activeServices = services.length > 0 ? services : []

  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      restaurant: '🏪',
      salle: '🚪',
      service: '⏰',
      vacances: '🌴',
      ferie: '🏖',
      exception: '⚠️',
      travaux: '🔧',
    }
    return icons[type] || '📅'
  }

  const handleFermTypeChange = () => {
    if (fermType === 'salle' || fermType === 'salle_service') {
      setSelectedSalle('')
    }
    if (fermType === 'service' || fermType === 'salle_service') {
      setSelectedService('')
    }
  }

  const handleAddFermeture = () => {
    toast('Fermeture ajoutée', 'success')
  }

  const handleToggleFermeture = (id: string) => {
    toast('Statut mise à jour', 'success')
  }

  const handleDeleteFermeture = (id: string) => {
    toast('Fermeture supprimée', 'success')
  }

  const handleAddHoliday = (date: string, label: string) => {
    toast(`${label} marqué comme jour fermé`, 'success')
  }

  return (
    <div style={{ padding: '14px 18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {/* Left column: Add new closure */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
          ➕ Nouvelle fermeture
        </div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 12 }}>
          Bloquée automatiquement dans le widget et les réservations
        </div>

        {/* Type selector */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Périmètre</label>
          <select
            value={fermType}
            onChange={(e) => {
              setFermType(e.target.value)
              handleFermTypeChange()
            }}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: 11,
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--surf)',
              color: 'var(--text)',
            }}
          >
            <option value="restaurant">🏪 Restaurant entier</option>
            <option value="salle">🚪 Salle spécifique</option>
            <option value="service">⏰ Service spécifique</option>
            <option value="salle_service">🎯 Salle + Service précis</option>
            <option value="vacances">🌴 Vacances / Congé annuel</option>
            <option value="ferie">🏖 Jour férié</option>
            <option value="travaux">🔧 Travaux</option>
          </select>
        </div>

        {/* Salle selector */}
        {(fermType === 'salle' || fermType === 'salle_service') && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Salle concernée</label>
            <select
              value={selectedSalle}
              onChange={(e) => setSelectedSalle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: 11,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--surf)',
                color: 'var(--text)',
              }}
            >
              <option value="">Tout le restaurant</option>
              {activeSalles.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Service selector */}
        {(fermType === 'service' || fermType === 'salle_service') && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Service concerné</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: 11,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--surf)',
                color: 'var(--text)',
              }}
            >
              <option value="">Tous les services</option>
              {activeServices.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Label */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
            Libellé <span style={{ color: 'var(--rd)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="Congé annuel, Travaux rénovation…"
            style={{
              width: '100%',
              padding: '8px',
              fontSize: 11,
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--surf)',
              color: 'var(--text)',
            }}
          />
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
              Début <span style={{ color: 'var(--rd)' }}>*</span>
            </label>
            <input
              type="date"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: 11,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--surf)',
                color: 'var(--text)',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
              Fin (optionnel)
            </label>
            <input
              type="date"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: 11,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--surf)',
                color: 'var(--text)',
              }}
            />
          </div>
        </div>

        {/* Note */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Note interne</label>
          <input
            type="text"
            placeholder="Visible uniquement par votre équipe"
            style={{
              width: '100%',
              padding: '8px',
              fontSize: 11,
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--surf)',
              color: 'var(--text)',
            }}
          />
        </div>

        {/* Widget message */}
        <div style={{ margin: '10px 0 8px', padding: '10px 12px', background: 'rgba(68,128,216,.06)', border: '1px solid rgba(68,128,216,.15)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bl)', marginBottom: 6 }}>
            🔌 Message widget pendant cette période
          </div>
          <input
            type="text"
            placeholder="Nous sommes fermés. Réouverture le…"
            style={{
              width: '100%',
              padding: '8px',
              fontSize: 11,
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--surf)',
              color: 'var(--text)',
              marginBottom: 4,
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>
            Affiché à la place du formulaire de réservation sur votre widget
          </div>
        </div>

        <button
          onClick={handleAddFermeture}
          style={{
            width: '100%',
            marginTop: 4,
            padding: '10px',
            fontSize: 11,
            fontWeight: 700,
            background: 'var(--bl)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Ajouter cette fermeture
        </button>
      </div>

      {/* Right column: Planned closures & settings */}
      <div>
        {/* Closures list */}
        <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
            Fermetures planifiées
          </div>
          <div id="ferm-list">
            {activeFermetures.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', padding: '20px 0' }}>
                Aucune fermeture programmée
              </div>
            ) : (
              activeFermetures.map((f) => (
                <div
                  key={f.id}
                  style={{
                    marginBottom: 8,
                    padding: '9px 14px',
                    background: 'rgba(232,165,48,.12)',
                    border: '1px solid rgba(232,165,48,.35)',
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{getTypeIcon(f.type)}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--am)' }}>{f.label}</span>
                    {f.dateFin && (
                      <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 8, fontFamily: 'DM Mono,monospace' }}>
                        du {f.date.slice(5).replace('-', '/')} au {f.dateFin.slice(5).replace('-', '/')}
                      </span>
                    )}
                    {f.note && (
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{f.note}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleFermeture(f.id)}
                    style={{
                      fontSize: 11,
                      padding: '3px 9px',
                      background: 'var(--am)',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Gérer
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget settings */}
        <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>
            🔌 Réglages widget
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Orientation
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[
              { v: 'vertical', l: 'Vertical', ico: '▯', d: 'Formulaire pleine hauteur' },
              { v: 'horizontal', l: 'Horizontal', ico: '▭', d: 'Compact, idéal pour header' },
            ].map((o) => (
              <button
                key={o.v}
                style={{
                  flex: 1,
                  padding: 9,
                  borderRadius: 9,
                  border: `1.5px solid var(--border)`,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--ff)',
                  color: 'var(--text)',
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 3 }}>{o.ico}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{o.l}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{o.d}</div>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Texte par défaut en cas de fermeture
          </div>
          <input
            type="text"
            defaultValue="Nous sommes actuellement fermés. Consultez nos prochaines disponibilités ci-dessous."
            style={{
              width: '100%',
              padding: '8px',
              fontSize: 11,
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--surf)',
              color: 'var(--text)',
              marginBottom: 4,
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>
            Utilisé si aucun message spécifique n'est défini pour la fermeture
          </div>
          <button
            style={{
              width: '100%',
              fontSize: 11,
              padding: 6,
              background: 'transparent',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Sauvegarder
          </button>
        </div>

        {/* Swiss holidays */}
        <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bl)', marginBottom: 8 }}>
            🇨🇭 Jours fériés suisses
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {FERIES_CH.map((f) => (
              <span
                key={f.date}
                onClick={() => handleAddHoliday(f.date, f.label)}
                style={{
                  fontSize: 11,
                  padding: '3px 9px',
                  background: 'rgba(68,128,216,.08)',
                  border: '1px solid rgba(68,128,216,.2)',
                  borderRadius: 5,
                  color: 'var(--bl)',
                  cursor: 'pointer',
                }}
              >
                {f.date.slice(5).replace('-', '/')} {f.label}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>
            Cliquez pour ajouter
          </div>
        </div>
      </div>
    </div>
  )
}
