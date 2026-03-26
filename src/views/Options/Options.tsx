import { useState } from 'react'
import { useT } from '../../i18n/useTranslation'

export function Options() {
  const { t } = useT()
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [options, setOptions] = useState({
    // Équipements
    wifi: true,
    wifi_payant: false,
    parking: true,
    parking_valet: false,
    terrasse: true,
    terrasse_couverte: false,
    terrasse_chauffee: false,
    climatisation: true,
    borne_recharge: false,
    vue_panoramique: false,

    // Accueil & Accès
    accessible: true,
    animaux: true,
    animaux_terrasse_only: false,
    fumeur: false,
    salle_privee: true,
    vestiaire: true,
    cave_vins: false,
    code_dress: false,

    // Notifications
    notif_new_resa: true,
    notif_sound: false,
    notif_new_hours: 24,

    // Langues
    langues: ['fr', 'en'] as string[],

    // Réservation
    reservation_min: 2,
    reservation_max: 12,
    annulation_h: 24,
    booking_horizon_days: 90,
    slot_interval_mins: 15,
    default_duration_mins: 75,
    allow_past_booking: false,
    require_phone: true,
    allow_walkin: true,

    // Dispersion
    dispersion_mode: 'ia' as 'ia' | 'manuel',
    dispersion_interval: 30,
    dispersion_max_per_slot: 3,

    // Groupes
    groupes_prives: true,
    groupe_validation: false,
    privatisation: false,
    groupe_seuil: 10,
    groupe_max_taille: 100,
    groupe_max_par_service: 3,
    groupe_quota_pct: 30,
    privatisation_min: 20,

    // Automatisations
    auto_confirm: false,
    auto_remind_24h: true,
    auto_remind_2h: false,
    auto_noshow_flag: true,
    auto_cancel_noreply: false,
    auto_confirm_delay: 0,

    // Accessibilité
    chaises_bebe_active: true,
    chaises_bebe: 4,
    places_pmr_active: true,
    places_pmr: 2,
    chaises_bebe_par_table: false,

    // Widget & Online
    widget_active: true,
    widget_table_choice: false,
    widget_client_recognition: true,
    widget_pref_table: true,
    widget_auto_waitlist: true,
    widget_qr_payment: false,

    // Carte & Menu
    menu_on_widget: true,
    menu_du_jour: true,
    menu_allergenes: true,
    menu_prix_visible: true,
    menu_photos: false,

    // Campagnes
    campaigns_email: false,
    campaigns_sms: false,
    campaigns_birthday: false,
    campaigns_loyalty: false,
  })

  const handleToggle = (key: string) => {
    setOptions(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof options],
    }))
  }

  const handleNumber = (key: string, value: number) => {
    setOptions(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleToggleLang = (lang: string) => {
    setOptions(prev => ({
      ...prev,
      langues: prev.langues.includes(lang)
        ? prev.langues.filter(l => l !== lang)
        : [...prev.langues, lang],
    }))
  }

  const handleSave = async () => {
    setSaveState('saving')
    setTimeout(() => {
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    }, 500)
  }

  const Toggle = ({ label, desc, keyName }: { label: string; desc?: string; keyName: string }) => {
    const value = options[keyName as keyof typeof options]
    const isOn = typeof value === 'boolean' ? value : false
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
          {desc && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{desc}</div>}
        </div>
        <button
          onClick={() => handleToggle(keyName)}
          style={{
            fontSize: 11,
            minWidth: 68,
            flexShrink: 0,
            padding: '6px 12px',
            borderRadius: 5,
            border: `1px solid var(--border)`,
            background: isOn ? 'var(--gn)' : 'var(--surf2)',
            color: isOn ? 'white' : 'var(--t3)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isOn ? '✓ Oui' : 'Non'}
        </button>
      </div>
    )
  }

  const NumField = ({ label, keyName, min = 0, max, unit }: { label: string; keyName: string; min?: number; max?: number; unit?: string }) => {
    const value = options[keyName as keyof typeof options]
    const numVal = typeof value === 'number' ? value : 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
          {label} {unit && <span style={{ fontSize: 11, color: 'var(--t3)' }}>{unit}</span>}
        </label>
        <input
          type="number"
          value={numVal}
          min={min}
          max={max}
          onChange={e => handleNumber(keyName, parseInt(e.target.value) || 0)}
          style={{
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--surf2)',
            color: 'var(--text)',
            fontSize: 12,
            fontFamily: 'var(--ff)',
          }}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 0', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>
          Options
        </div>
        <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 12 }}>
          Équipements, politiques de réservation et automatisations
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingBottom: 12 }}>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: saveState === 'saved' ? 'var(--gn)' : 'var(--bl)',
              color: 'white',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all .3s',
            }}
          >
            {saveState === 'saving' && '⏳ Enregistrement...'}
            {saveState === 'saved' && '✓ Enregistré'}
            {saveState === 'idle' && '💾 Enregistrer'}
          </button>
        </div>
      </div>

      {/* Content - 2 column layout */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 18px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Column 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Équipements */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📡 Équipements</div>
              <Toggle label="WiFi gratuit" keyName="wifi" />
              <Toggle label="WiFi payant" desc="Connexion facturée aux clients" keyName="wifi_payant" />
              <Toggle label="Parking" keyName="parking" />
              <Toggle label="Service voiturier" keyName="parking_valet" />
              <Toggle label="Terrasse" keyName="terrasse" />
              <Toggle label="Terrasse couverte" keyName="terrasse_couverte" />
              <Toggle label="Terrasse chauffée" keyName="terrasse_chauffee" />
              <Toggle label="Climatisation" keyName="climatisation" />
              <Toggle label="Borne recharge électrique" keyName="borne_recharge" />
              <Toggle label="Vue panoramique" keyName="vue_panoramique" />
            </div>

            {/* Accueil & Accès */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🤝 Accueil & Accès</div>
              <Toggle label="Accès PMR / handicapé" keyName="accessible" />
              <Toggle label="Animaux acceptés" desc="Chiens et animaux de compagnie" keyName="animaux" />
              <Toggle label="Animaux terrasse uniquement" keyName="animaux_terrasse_only" />
              <Toggle label="Zone fumeur" keyName="fumeur" />
              <Toggle label="Salle privée disponible" keyName="salle_privee" />
              <Toggle label="Vestiaire" keyName="vestiaire" />
              <Toggle label="Cave à vins" keyName="cave_vins" />
              <Toggle label="Dress code requis" keyName="code_dress" />
            </div>

            {/* Notifications */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🔔 Nouvelles réservations</div>
              <Toggle label='Badge "NOUVEAU" dans le Book' desc="Signale les réservations récentes au personnel" keyName="notif_new_resa" />
              <Toggle label="Son à chaque nouvelle réservation" keyName="notif_sound" />
              <div style={{ marginTop: 10 }}>
                <NumField label="Durée badge NOUVEAU" keyName="notif_new_hours" min={1} max={24} unit="heures" />
              </div>
            </div>

            {/* Langues */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🌍 Langues</div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 8, display: 'block' }}>
                Langues parlées
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { code: 'fr', flag: '🇫🇷 FR' },
                  { code: 'en', flag: '🇬🇧 EN' },
                  { code: 'de', flag: '🇩🇪 DE' },
                  { code: 'it', flag: '🇮🇹 IT' },
                  { code: 'es', flag: '🇪🇸 ES' },
                ].map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleToggleLang(lang.code)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 5,
                      border: `1.5px solid var(--border)`,
                      background: options.langues.includes(lang.code) ? 'var(--bl)' : 'var(--surf2)',
                      color: options.langues.includes(lang.code) ? 'white' : 'var(--text)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Réservation */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📋 Réservation</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <NumField label="Min. couverts" keyName="reservation_min" min={1} />
                <NumField label="Max. couverts" keyName="reservation_max" min={1} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <NumField label="Délai annulation" keyName="annulation_h" min={0} unit="heures" />
                <NumField label="Horizon max" keyName="booking_horizon_days" min={1} max={365} unit="jours" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <NumField label="Intervalle créneaux" keyName="slot_interval_mins" min={5} max={60} unit="min" />
                <NumField label="Durée moy. table" keyName="default_duration_mins" min={30} max={300} unit="min" />
              </div>
              <Toggle label="Autoriser réservations passées" desc="Pour corriger ou saisir des réservations passées" keyName="allow_past_booking" />
              <Toggle label="Téléphone obligatoire" desc="Bloque la confirmation si absent" keyName="require_phone" />
              <Toggle label="Autoriser walk-ins" desc="Depuis le plan de service et la grille" keyName="allow_walkin" />
            </div>

            {/* Dispersion */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🔀 Dispersion des arrivées</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 12 }}>
                Répartit les arrivées clients pour éviter les pics
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { v: 'ia', l: '🤖 IA', d: 'Redistribution automatique intelligente' },
                  { v: 'manuel', l: '👆 Manuel', d: 'Créneaux fixes définis par vous' },
                ].map(o => (
                  <button
                    key={o.v}
                    onClick={() => setOptions(prev => ({ ...prev, dispersion_mode: o.v as 'ia' | 'manuel' }))}
                    style={{
                      flex: 1,
                      padding: '9px 6px',
                      borderRadius: 9,
                      border: `1.5px solid ${options.dispersion_mode === o.v ? 'var(--ac)' : 'var(--border)'}`,
                      background: options.dispersion_mode === o.v ? 'var(--bp)' : 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'var(--ff)',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: options.dispersion_mode === o.v ? 'var(--ac)' : 'var(--text)' }}>
                      {o.l}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                      {o.d}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
                    Intervalle entre créneaux
                  </label>
                  <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--text)' }}>
                    {options.dispersion_interval} min
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => handleNumber('dispersion_interval', Math.max(15, options.dispersion_interval - 15))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '1.5px solid var(--border)',
                      background: 'var(--surf2)',
                      fontSize: 16,
                      cursor: 'pointer',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    −
                  </button>
                  <div style={{ flex: 1, position: 'relative', height: 6, background: 'var(--border)', borderRadius: 3 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        background: 'var(--ac)',
                        borderRadius: 3,
                        width: `${Math.round(((options.dispersion_interval - 15) / 45) * 100)}%`,
                      }}
                    />
                  </div>
                  <button
                    onClick={() => handleNumber('dispersion_interval', Math.min(60, options.dispersion_interval + 15))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '1.5px solid var(--border)',
                      background: 'var(--surf2)',
                      fontSize: 16,
                      cursor: 'pointer',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
                    Max réservations / créneau
                  </label>
                  <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--text)' }}>
                    {options.dispersion_max_per_slot}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => handleNumber('dispersion_max_per_slot', Math.max(1, options.dispersion_max_per_slot - 1))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '1.5px solid var(--border)',
                      background: 'var(--surf2)',
                      fontSize: 16,
                      cursor: 'pointer',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    −
                  </button>
                  <div style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'center' }}>
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 18,
                          borderRadius: 3,
                          background: i + 1 <= options.dispersion_max_per_slot ? 'var(--ac)' : 'var(--border)',
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => handleNumber('dispersion_max_per_slot', Math.min(10, options.dispersion_max_per_slot + 1))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '1.5px solid var(--border)',
                      background: 'var(--surf2)',
                      fontSize: 16,
                      cursor: 'pointer',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Groupes */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>👥 Politique groupes</div>
              <Toggle label="Groupes & événements privés" keyName="groupes_prives" />
              <Toggle label="Validation manuelle obligatoire" desc="Chaque demande groupe doit être approuvée" keyName="groupe_validation" />
              <Toggle label="Autoriser privatisation totale" keyName="privatisation" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <NumField label="Seuil groupe (min pers.)" keyName="groupe_seuil" min={2} max={50} />
                <NumField label="Taille max groupe" keyName="groupe_max_taille" min={5} max={200} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <NumField label="Max groupes / service" keyName="groupe_max_par_service" min={0} max={10} />
                <NumField label="Quota couverts groupes" keyName="groupe_quota_pct" min={0} max={100} unit="%" />
              </div>
              {options.privatisation && (
                <div style={{ marginTop: 8 }}>
                  <NumField label="Couverts min privatisation" keyName="privatisation_min" min={1} />
                </div>
              )}
            </div>

            {/* Automatisations */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>⚡ Automatisations</div>
              <Toggle label="Confirmation automatique" desc="Réservations confirmées instantanément sans validation" keyName="auto_confirm" />
              <Toggle label="Rappel 24h avant" desc="E-mail / SMS envoyé la veille aux clients" keyName="auto_remind_24h" />
              <Toggle label="Rappel 2h avant" desc="Second rappel proche du service" keyName="auto_remind_2h" />
              <Toggle label="Marquage auto no-show" desc="Après 15 min sans arrivée confirmée" keyName="auto_noshow_flag" />
              <Toggle label="Annulation si pas de réponse" desc="Si le client ne confirme pas dans les 24h" keyName="auto_cancel_noreply" />
              <div style={{ marginTop: 10 }}>
                <NumField label="Délai confirmation auto" keyName="auto_confirm_delay" min={0} max={120} unit="min" />
              </div>
            </div>

            {/* Accessibilité */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>👶♿ Accessibilité & Familles</div>
              <Toggle label="Chaises bébé disponibles" desc="Haute-chaises pour enfants en bas âge" keyName="chaises_bebe_active" />
              <div style={{ marginTop: 6 }}>
                <NumField label="Nombre de chaises bébé" keyName="chaises_bebe" min={0} max={20} unit="chaises" />
              </div>
              <Toggle label="Places PMR / accessibilité" desc="Tables accessibles fauteuil roulant" keyName="places_pmr_active" />
              <div style={{ marginTop: 6 }}>
                <NumField label="Nombre de places PMR" keyName="places_pmr" min={0} max={20} unit="places" />
              </div>
              <Toggle label="Gérer par table" desc="Cocher les tables avec équipement PMR/bébé (vs global)" keyName="chaises_bebe_par_table" />
            </div>

            {/* Widget & Online */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🌐 Widget & Réservation en ligne</div>
              <Toggle label="Widget de réservation actif" desc="Page booking.r3sto.ch accessible aux clients" keyName="widget_active" />
              <Toggle label="Choix de table sur le widget" desc="Les clients peuvent choisir leur table" keyName="widget_table_choice" />
              <Toggle label="Reconnaissance profil client" desc="Remplissage auto si le client a déjà réservé" keyName="widget_client_recognition" />
              <Toggle label="Table préférée automatique" desc="Proposer en priorité la dernière table du client" keyName="widget_pref_table" />
              <Toggle label="Liste d'attente auto" desc="Si complet, proposer la liste d'attente" keyName="widget_auto_waitlist" />
              <Toggle label="QR code de paiement" desc="Générer un QR code pour le prépaiement" keyName="widget_qr_payment" />
            </div>

            {/* Carte & Menu */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🍽️ Carte & Menu</div>
              <Toggle label="Afficher la carte sur le widget" desc="Les clients voient le menu avant de réserver" keyName="menu_on_widget" />
              <Toggle label="Menu du jour" desc="Section menu du jour modifiable quotidiennement" keyName="menu_du_jour" />
              <Toggle label="Allergènes affichés" desc="Indicateurs allergènes sur chaque plat" keyName="menu_allergenes" />
              <Toggle label="Prix affichés" desc="Montrer les prix sur le widget" keyName="menu_prix_visible" />
              <Toggle label="Photos des plats" desc="Galerie photos par plat" keyName="menu_photos" />
            </div>

            {/* Campagnes */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📣 Campagnes & Communication</div>
              <Toggle label="Campagnes email" desc="Envoyer des offres et promotions aux clients" keyName="campaigns_email" />
              <Toggle label="Campagnes SMS" desc="Notifications SMS pour les événements spéciaux" keyName="campaigns_sms" />
              <Toggle label="Anniversaires auto" desc="Message automatique pour les anniversaires clients" keyName="campaigns_birthday" />
              <Toggle label="Fidélité" desc="Programme de fidélité basé sur les visites" keyName="campaigns_loyalty" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
