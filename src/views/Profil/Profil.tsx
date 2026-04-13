import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import PhoneInput from '../../components/ui/PhoneInput'
import { PLANS, type PlanId, redirectToCheckout, redirectToPortal } from '../../utils/stripe'

interface HoraireDay {
  d: string
  open: boolean
  from: string
  to: string
  from2?: string
  to2?: string
}

// Demo Google Places results
const GPLACES_RESULTS = [
  {
    name: 'Le Gourmet',
    addr: 'Rue du Lac 12, 1006 Lausanne',
    tel: '+41 21 612 34 56',
    web: 'www.legourmet.ch',
    type: 'Restaurant français',
    lat: 46.5218,
    lng: 6.6327,
    rating: 4.6,
  },
  {
    name: 'Le Gourmet Bio',
    addr: 'Avenue de la Gare 8, 1003 Lausanne',
    tel: '+41 21 323 11 22',
    web: 'legourmetbio.ch',
    type: 'Restaurant bio',
    lat: 46.517,
    lng: 6.629,
    rating: 4.3,
  },
  {
    name: 'Le Gourmet Terrasse',
    addr: "Quai d'Ouchy 3, 1006 Lausanne",
    tel: '+41 21 601 44 55',
    web: 'legourmetouchy.ch',
    type: 'Restaurant méditerranéen',
    lat: 46.5089,
    lng: 6.6287,
    rating: 4.8,
  },
]

export function Profil() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { updateResto } = useAppStore()
  const [gplInput, setGplInput] = useState('')
  const [gplResults, setGplResults] = useState<typeof GPLACES_RESULTS>([])
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  const [formData, setFormData] = useState({
    nom: 'Le Gourmet',
    cuisine: 'Française',
    adr: 'Rue du Lac 12, 1006 Lausanne',
    tel: '21 612 34 56',
    telInd: '+41',
    email: 'contact@legourmet.ch',
    web: 'www.legourmet.ch',
  })

  const [horaires, setHoraires] = useState<HoraireDay[]>([
    { d: 'Lundi', open: false, from: '', to: '' },
    { d: 'Mardi', open: true, from: '12:00', to: '14:30', from2: '19:00', to2: '22:30' },
    { d: 'Mercredi', open: true, from: '12:00', to: '14:30', from2: '19:00', to2: '22:30' },
    { d: 'Jeudi', open: true, from: '12:00', to: '14:30', from2: '19:00', to2: '22:30' },
    { d: 'Vendredi', open: true, from: '12:00', to: '14:30', from2: '19:00', to2: '23:00' },
    { d: 'Samedi', open: true, from: '', to: '', from2: '19:00', to2: '23:00' },
    { d: 'Dimanche', open: false, from: '', to: '' },
  ])

  const [ambiances, setAmbiances] = useState<string[]>(['Romantique', 'Gastronomique'])
  const [description, setDescription] = useState('Restaurant au bord du lac, cuisine raffinée, produits locaux…')
  const [plan] = useState<'bistro' | 'resto' | 'gastro'>('gastro')

  const ambianceOptions = [
    '🕯 Romantique',
    '👔 Business',
    '👨‍👩‍👧 Famille',
    '🎉 Festif',
    '🌿 Détendu',
    '⭐ Gastronomique',
    '🎵 Vivant',
    '🤫 Calme',
    '☀️ Terrasse',
    '🍷 Bar & vins',
    '🎭 Événements',
    '🏡 Authentique',
    '🌊 Vue panorama',
  ]

  // Plan data from centralized Stripe config
  const planFeatures = {
    bistro: PLANS.bistro.features,
    resto: PLANS.resto.features,
    gastro: PLANS.gastro.features,
  }

  const planData = {
    bistro: { price: `CHF ${PLANS.bistro.priceMonthly}/mois`, annual: `CHF ${PLANS.bistro.priceAnnual}/an`, label: 'moins de 500 CHF/an', color: PLANS.bistro.color },
    resto: { price: `CHF ${PLANS.resto.priceMonthly}/mois`, annual: `CHF ${PLANS.resto.priceAnnual}/an`, label: 'moins de 1\'000 CHF/an', color: PLANS.resto.color },
    gastro: { price: `CHF ${PLANS.gastro.priceMonthly}/mois`, annual: `CHF ${PLANS.gastro.priceAnnual}/an`, label: 'moins de 1\'000 CHF/an', color: PLANS.gastro.color },
  }

  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const handleCheckout = async (targetPlan: PlanId) => {
    setCheckoutLoading(true)
    try {
      await redirectToCheckout(targetPlan)
    } catch (err: any) {
      toast(`Erreur Stripe : ${err.message}`, 'error')
      setCheckoutLoading(false)
    }
  }

  const handlePortal = async () => {
    try {
      await redirectToPortal()
    } catch (err: any) {
      toast(`Erreur portail : ${err.message}`, 'error')
    }
  }

  const handleGplSearch = () => {
    const q = gplInput.trim().toLowerCase()
    if (!q) {
      setGplResults([])
      return
    }
    setTimeout(() => {
      const res = GPLACES_RESULTS.filter((r) => r.name.toLowerCase().includes(q))
      setGplResults(res)
    }, 300)
  }

  const handleGplImport = (idx: number) => {
    const r = gplResults[idx]
    setFormData((prev) => ({
      ...prev,
      nom: r.name,
      adr: r.addr,
      tel: r.tel.replace(/\D/g, '').slice(2),
      web: r.web,
    }))
    setGeoLocation({ lat: r.lat, lng: r.lng })
    setGplInput('')
    setGplResults([])
    toast(`✓ Données Google importées — ${r.name}`, 'success')
  }

  const handleHoursToggle = (idx: number) => {
    setHoraires((h) => h.map((hr, i) => (i === idx ? { ...hr, open: !hr.open } : hr)))
  }

  const handleTimeChange = (idx: number, field: string, val: string) => {
    setHoraires((h) => h.map((hr, i) => (i === idx ? { ...hr, [field]: val } : hr)))
  }

  const handleAddSlot2 = (idx: number) => {
    setHoraires((h) => h.map((hr, i) => (i === idx ? { ...hr, from2: '19:00', to2: '22:30' } : hr)))
  }

  const handleRemoveSlot2 = (idx: number) => {
    setHoraires((h) => h.map((hr, i) => (i === idx ? { from2: undefined, to2: undefined, ...hr } : hr)))
  }

  const toggleAmbiance = (amb: string) => {
    setAmbiances((a) => (a.includes(amb) ? a.filter((x) => x !== amb) : [...a, amb]))
  }

  const handlePasswordSave = () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast('Les mots de passe ne correspondent pas', 'error')
      return
    }
    if (passwordForm.new.length < 8) {
      toast('Le mot de passe doit contenir au moins 8 caractères', 'error')
      return
    }
    toast('Mot de passe changé avec succès ✓', 'success')
    setShowPasswordForm(false)
    setPasswordForm({ current: '', new: '', confirm: '' })
  }

  const handleSave = async () => {
    try {
      await updateResto({
        // @ts-ignore
        name: formData.nom,
        // @ts-ignore cuisine field
        cuisine: formData.cuisine,
        adresse: formData.adr,
        tel: formData.tel,
        email: formData.email,
        web: formData.web,
      })
      toast('Profil enregistré ✓', 'success')
    } catch (err: any) {
      toast(`Erreur : ${err.message}`, 'error')
    }
  }

  const shortcuts = [
    { icon: '🚪', lbl: 'Salles & Services', sub: 'Créneaux de réservation', path: '/salles' },
    { icon: '⊞', lbl: 'Éditeur de tables', sub: 'Positionnement des tables', path: '/setup-plan' },
    { icon: '📐', lbl: 'Plan de salle', sub: 'Vue d\'ensemble', path: '/plan' },
    { icon: '⚙️', lbl: 'Paramètres', sub: 'Préférences', path: '/options' },
  ]

  return (
    <div style={{ padding: '14px 18px', overflowY: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 3 }}>Mon restaurant</div>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--bl)',
            color: 'white',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          💾 Enregistrer
        </button>
      </div>

      {/* Google Places Import */}
      <div
        style={{
          background: 'linear-gradient(135deg,rgba(68,128,216,.05),rgba(68,128,216,.02))',
          border: '1px solid rgba(68,128,216,.3)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(68,128,216,.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            🔍
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Importer depuis Google</div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>Pré-remplissage automatique · adresse · téléphone · horaires · géolocalisation</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Nom de votre restaurant…"
            value={gplInput}
            onChange={(e) => setGplInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGplSearch()}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surf)',
              color: 'var(--text)',
              fontSize: 12,
            }}
          />
          <button
            onClick={handleGplSearch}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--bl)',
              color: 'white',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Rechercher
          </button>
        </div>
        {gplResults.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gplResults.map((r, i) => (
              <div
                key={i}
                onClick={() => handleGplImport(i)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: 'var(--surf3)',
                  transition: '.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{r.name}</span>
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--am)' }}>★ {r.rating}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{r.addr}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{r.type} · {r.tel}</div>
                <div style={{ marginTop: 5, fontSize: 11, fontWeight: 700, color: 'var(--bl)' }}>
                  📍 Lat {r.lat.toFixed(4)} · Lng {r.lng.toFixed(4)} — Cliquer pour importer →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informations générales */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🏠 Informations générales</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Nom</label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData((p) => ({ ...p, nom: e.target.value }))}
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surf2)',
                color: 'var(--text)',
                fontSize: 12,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Type de cuisine</label>
              <select
                value={formData.cuisine}
                onChange={(e) => setFormData((p) => ({ ...p, cuisine: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surf2)',
                  color: 'var(--text)',
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {['Française', 'Italienne', 'Suisse', 'Méditerranéenne', 'Japonaise', 'Asiatique', 'Thaïlandaise', 'Indienne', 'Mexicaine', 'Américaine', 'Autre'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Adresse</label>
            <input
              type="text"
              value={formData.adr}
              onChange={(e) => setFormData((p) => ({ ...p, adr: e.target.value }))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surf2)',
                color: 'var(--text)',
                fontSize: 12,
                marginTop: 4,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              Téléphone <span style={{ color: 'var(--rd)' }}>*</span>
            </label>
            <div style={{ marginTop: 4 }}>
              <PhoneInput value={formData.tel} onChange={v => setFormData(p => ({ ...p, tel: v }))} compact />
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3, fontFamily: 'DM Mono, monospace' }}>
              {formData.telInd} {formData.tel.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surf2)',
                  color: 'var(--text)',
                  fontSize: 12,
                  marginTop: 4,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Site web</label>
              <input
                type="text"
                value={formData.web}
                onChange={(e) => setFormData((p) => ({ ...p, web: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surf2)',
                  color: 'var(--text)',
                  fontSize: 12,
                  marginTop: 4,
                }}
              />
            </div>
          </div>

          {geoLocation && (
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                fontFamily: 'DM Mono, monospace',
                color: 'var(--t3)',
                padding: '8px 10px',
                background: 'rgba(60,200,112,.06)',
                border: '1px solid rgba(60,200,112,.2)',
                borderRadius: 7,
              }}
            >
              📍 <strong>Géolocalisation importée</strong> · Lat {geoLocation.lat.toFixed(4)} · Lng {geoLocation.lng.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      {/* Horaires d'ouverture */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>🕐 Horaires d'ouverture</div>
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>Affichés sur votre fiche Google, widget et site</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--am)', marginBottom: 12, padding: '5px 8px', background: 'rgba(240,160,32,.08)', borderRadius: 5 }}>
          ℹ️ Ces horaires sont distincts des créneaux de réservation — ils indiquent quand votre établissement est ouvert au public.
        </div>

        {horaires.map((h, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 80px 1fr', alignItems: 'start', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', paddingTop: 3 }}>{h.d}</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', paddingTop: 3 }}>
              <input
                type="checkbox"
                checked={h.open}
                onChange={() => handleHoursToggle(i)}
                style={{ width: 13, height: 13 }}
              />
              <span style={{ fontSize: 11, fontWeight: 600, color: h.open ? 'var(--gn)' : 'var(--t3)' }}>
                {h.open ? 'Ouvert' : 'Fermé'}
              </span>
            </label>
            <div style={{ display: h.open ? 'flex' : 'none', flexDirection: 'column' }}>
              {h.open && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {h.from2 || h.to2 ? <span style={{ fontSize: 11, color: 'var(--t3)', minWidth: 28 }}>Midi</span> : ''}
                    <input
                      type="time"
                      value={h.from || '12:00'}
                      onChange={(e) => handleTimeChange(i, 'from', e.target.value)}
                      style={{ width: 72, padding: '3px 6px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surf2)' }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>&rarr;</span>
                    <input
                      type="time"
                      value={h.to || '14:30'}
                      onChange={(e) => handleTimeChange(i, 'to', e.target.value)}
                      style={{ width: 72, padding: '3px 6px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surf2)' }}
                    />
                    {!h.from2 && !h.to2 ? (
                      <button
                        onClick={() => handleAddSlot2(i)}
                        style={{
                          padding: '2px 8px',
                          fontSize: 11,
                          border: '1px solid rgba(68,128,216,.4)',
                          borderRadius: 5,
                          background: 'transparent',
                          color: 'var(--bl)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          marginLeft: 4,
                        }}
                      >
                        + Soir
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRemoveSlot2(i)}
                        style={{
                          padding: '2px 7px',
                          fontSize: 11,
                          border: '1px solid var(--border)',
                          borderRadius: 5,
                          background: 'transparent',
                          color: 'var(--t3)',
                          cursor: 'pointer',
                        }}
                      >
                        × Soir
                      </button>
                    )}
                  </div>
                  {h.from2 || h.to2 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--t3)', minWidth: 28 }}>Soir</span>
                      <input
                        type="time"
                        value={h.from2 || '19:00'}
                        onChange={(e) => handleTimeChange(i, 'from2', e.target.value)}
                        style={{ width: 72, padding: '3px 6px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surf2)' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--t3)' }}>&rarr;</span>
                      <input
                        type="time"
                        value={h.to2 || '22:30'}
                        onChange={(e) => handleTimeChange(i, 'to2', e.target.value)}
                        style={{ width: 72, padding: '3px 6px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surf2)' }}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ambiance & description */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>🎨 Ambiance & description</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 12 }}>Visible sur votre widget · Plusieurs choix possibles</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
          {ambianceOptions.map((amb) => (
            <span
              key={amb}
              onClick={() => toggleAmbiance(amb)}
              style={{
                padding: '6px 10px',
                borderRadius: 20,
                border: ambiances.includes(amb) ? '1px solid var(--bl)' : '1px solid var(--border)',
                background: ambiances.includes(amb) ? 'rgba(68,128,216,.15)' : 'var(--surf2)',
                color: 'var(--text)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {amb}
            </span>
          ))}
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          Description courte <span style={{ fontSize: 11, color: 'var(--t3)' }}>(visible sur le widget)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Restaurant au bord du lac, cuisine raffinée, produits locaux…"
          rows={2}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--surf2)',
            color: 'var(--text)',
            fontSize: 12,
            marginTop: 4,
            resize: 'vertical',
          }}
        />
      </div>

      {/* Abonnement */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>💎 Mon abonnement</div>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(60,200,112,.2)', border: '1px solid rgba(60,200,112,.3)', color: 'var(--gn)', fontWeight: 700 }}>
            Actif
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bl)' }}>{planData[plan].price}</span>
        </div>

        <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 12 }}>
          {planData[plan].annual} · Engagement annuel · <span style={{ color: 'var(--gn)' }}>{planData[plan].label}</span>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--t3)', marginBottom: 6 }}>
          Inclus dans votre plan
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
          {planFeatures[plan].map((f) => (
            <span key={f} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(60,200,112,.15)', color: 'var(--gn)', fontWeight: 700 }}>
              {f}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Upgrade/downgrade → Stripe Checkout for different plan */}
          {(['bistro', 'resto', 'gastro'] as PlanId[]).filter(p => p !== plan).map(p => (
            <button
              key={p}
              onClick={() => handleCheckout(p)}
              disabled={checkoutLoading}
              style={{
                fontSize: 11,
                padding: '6px 12px',
                borderRadius: 6,
                border: `1px solid ${planData[p].color}`,
                background: 'var(--surf2)',
                color: planData[p].color,
                fontWeight: 700,
                cursor: checkoutLoading ? 'wait' : 'pointer',
                opacity: checkoutLoading ? .5 : 1,
              }}
            >
              {(['bistro', 'resto', 'gastro'] as PlanId[]).indexOf(p) > (['bistro', 'resto', 'gastro'] as PlanId[]).indexOf(plan) ? '⬆' : '⬇'} {PLANS[p].name} — CHF {PLANS[p].priceMonthly}/mo
            </button>
          ))}
          {/* Manage subscription via Stripe Customer Portal */}
          <button
            onClick={handlePortal}
            style={{
              fontSize: 11,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surf2)',
              color: 'var(--text)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📄 Factures & Paiement
          </button>
        </div>
      </div>

      {/* Accès & Sécurité */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🔑 Accès & Sécurité</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Email de connexion</label>
            <input
              type="email"
              value="admin@legourmet.ch"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surf2)',
                color: 'var(--text)',
                fontSize: 12,
                marginTop: 4,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Mot de passe</label>
            {!showPasswordForm ? (
              <>
                <input
                  type="password"
                  value="••••••••"
                  readOnly
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surf2)',
                    color: 'var(--text)',
                    fontSize: 12,
                    marginTop: 4,
                  }}
                />
                <button
                  onClick={() => setShowPasswordForm(true)}
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surf2)',
                    color: 'var(--text)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🔒 Changer le mot de passe
                </button>
              </>
            ) : (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 10px', background: 'rgba(68,128,216,.08)', border: '1px solid rgba(68,128,216,.2)', borderRadius: 8 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Mot de passe actuel</label>
                  <input
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--surf2)',
                      color: 'var(--text)',
                      fontSize: 12,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, new: e.target.value }))}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--surf2)',
                      color: 'var(--text)',
                      fontSize: 12,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--surf2)',
                      color: 'var(--text)',
                      fontSize: 12,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handlePasswordSave}
                    style={{
                      flex: 1,
                      fontSize: 11,
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'var(--bl)',
                      color: 'white',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordForm(false)
                      setPasswordForm({ current: '', new: '', confirm: '' })
                    }}
                    style={{
                      flex: 1,
                      fontSize: 11,
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--surf2)',
                      color: 'var(--text)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick shortcuts */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 30 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>⚡ Configuration rapide</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shortcuts.map((s) => (
            <div
              key={s.path}
              onClick={() => navigate(s.path)}
              style={{
                background: 'var(--surf2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '11px 13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: '.15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{s.lbl}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{s.sub}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--t3)' }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
