import { useState, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { useToast } from '../../components/ui/Toast'
import PhoneInput from '../../components/ui/PhoneInput'

/* ═══════════════════════════════════════════════════
   THEMES
   ═══════════════════════════════════════════════════ */
const THEMES = [
  { id: 'dark-elegant', name: 'Élégant sombre', description: 'Fond sombre, accents rouges', colors: { bg: '#1a1a1a', accent: '#d64545', text: '#f5f5f5', gold: '#d4af37' } },
  { id: 'light-fresh', name: 'Frais et lumineux', description: 'Blanc pur, accents verts', colors: { bg: '#ffffff', accent: '#10b981', text: '#1a1a1a', gold: '#d4af37' } },
  { id: 'warm-bistro', name: 'Bistro chaleureux', description: 'Bruns chauds, accents ambrés', colors: { bg: '#3d2817', accent: '#d4a574', text: '#f5e6d3', gold: '#d4af37' } },
  { id: 'modern-minimal', name: 'Moderne minimal', description: 'Noir pur, accents bleus', colors: { bg: '#000000', accent: '#4f46e5', text: '#ffffff', gold: '#d4af37' } },
  { id: 'zen-japanese', name: 'Zen raffiné', description: 'Vert foncé, accents sages', colors: { bg: '#1b3d2c', accent: '#8fa68a', text: '#f0f0f0', gold: '#d4af37' } },
]

/* ═══════════════════════════════════════════════════
   SECTIONS DU SITE
   ═══════════════════════════════════════════════════ */
const SITE_SECTIONS = [
  { id: 'story', icon: '📖', label: 'Notre histoire', desc: 'Racontez l\'histoire de votre restaurant', auto: false },
  { id: 'specialties', icon: '⭐', label: 'Spécialités', desc: 'Mettez en avant vos plats signature', auto: false },
  { id: 'menu', icon: '📋', label: 'La carte', desc: 'Synchronisé depuis votre menu R3STO', auto: true },
  { id: 'hours', icon: '🕐', label: 'Horaires', desc: 'Heures d\'ouverture synchro depuis R3STO', auto: true },
  { id: 'events', icon: '🎉', label: 'Événements', desc: 'Affichage automatique depuis vos événements', auto: true },
  { id: 'spaces', icon: '🏛️', label: 'Espaces', desc: 'Photos de vos salles et terrasses', auto: false },
  { id: 'reviews', icon: '⭐⭐⭐', label: 'Avis clients', desc: 'Témoignages de vos clients', auto: false },
  { id: 'contact', icon: '📍', label: 'Contact & carte', desc: 'Adresse, horaires et Google Maps', auto: false },
  { id: 'reservation', icon: '🍽️', label: 'Réservation', desc: 'Widget de réservation intégré', auto: true },
]

const AUTO_CONNECTIONS = [
  { icon: '📋', label: 'Menu', desc: 'Synchronisé depuis votre carte digitale' },
  { icon: '🕐', label: 'Horaires', desc: 'Statut ouvert/fermé en temps réel' },
  { icon: '🚫', label: 'Fermetures', desc: 'Bannière automatique en cas de fermeture' },
  { icon: '🎉', label: 'Événements', desc: 'Affichés automatiquement' },
  { icon: '💰', label: 'Rabais', desc: 'Bannière promotionnelle automatique' },
  { icon: '📅', label: 'Réservations', desc: 'Widget connecté à votre système' },
]

export function SiteVitrine() {
  const { t } = useT()
  const { resto, reviews: storeReviews, options } = useAppStore()
  const { toast } = useToast()

  /* ── STATE ── */
  const [selectedTheme, setSelectedTheme] = useState('dark-elegant')
  const [customColors, setCustomColors] = useState<null | { bg: string; accent: string; text: string; gold: string }>(null)
  const [sections, setSections] = useState<Record<string, boolean>>({
    story: true, specialties: true, menu: true, hours: true,
    events: true, spaces: true, reviews: true, contact: true, reservation: true,
  })
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [languages, setLanguages] = useState<string[]>(['fr'])
  const [defaultLang, setDefaultLang] = useState('fr')
  const [showPreview, setShowPreview] = useState(false)

  // Content states
  const [storyData, setStoryData] = useState({ title: 'Notre histoire', text: '', year: '', image: '' })
  const [specData, setSpecData] = useState({ title: 'Spécialités', items: [{ emoji: '🍽️', name: '', desc: '', price: '' }] })
  const [spacesData, setSpacesData] = useState([{ name: '', image: '' }])
  const [reviewsData, setReviewsData] = useState({ score: '4.8', countText: '124 avis', title: 'Excellent', items: [{ text: '', stars: 5, who: '', source: '' }] })
  const [reviewsSource, setReviewsSource] = useState<'auto' | 'manual'>('auto')
  const [resaData, setResaData] = useState({ title: 'Réservez votre table' })

  // SEO
  const [seo, setSeo] = useState({ metaTitle: '', metaDesc: '', ogImage: '', favicon: '' })

  // Hosting
  const [subdomain, setSubdomain] = useState('')
  const [hostingOption, setHostingOption] = useState<'r3sto' | 'own' | 'existing'>('r3sto')

  const [formData, setFormData] = useState({
    name: resto?.name || 'Mon restaurant', tagline: '', founded: '',
    address: resto?.name || '', city: resto?.ville || '',
    phone: resto?.tel || '', email: resto?.email || '',
    mapsQuery: '',
  })
  const [socialLinks, setSocialLinks] = useState({ instagram: '', facebook: '', tripadvisor: '', google: '' })

  /* ── Auto reviews from store ── */
  const autoReviews = useMemo(() => {
    const eligible = storeReviews
      .filter(r => r.visible && !r.flagged && r.rating >= 4 && r.comment)
      .sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt)
      .slice(0, 6)
    if (eligible.length === 0) return null
    const avg = (eligible.reduce((s, r) => s + r.rating, 0) / eligible.length).toFixed(1)
    return {
      score: avg,
      countText: `${storeReviews.filter(r => r.visible && !r.flagged).length} avis`,
      title: Number(avg) >= 4.5 ? 'Excellent' : Number(avg) >= 4 ? 'Très bien' : 'Bien',
      items: eligible.map(r => ({ text: r.comment, stars: r.rating, who: r.clientName, source: r.source === 'google' ? 'Google' : 'R3STO' })),
    }
  }, [storeReviews])

  const effectiveReviews = reviewsSource === 'auto' && autoReviews ? autoReviews : reviewsData
  const googleUrl = (options as any).reviews_google_url || ''

  /* ── Computed ── */
  const selectedThemeObj = customColors
    ? { id: 'custom', name: 'Personnalisé', description: 'Vos couleurs', colors: customColors }
    : THEMES.find(th => th.id === selectedTheme)!
  const isConfigured = useMemo(() => formData.name && formData.address && Object.values(sections).some(v => v), [formData, sections])
  const hasSiteAccess = resto?.plan === 'resto' || resto?.plan === 'gastro'
  const siteUrl = subdomain ? `${subdomain}.r3sto.ch` : 'monresto.r3sto.ch'

  /* ── GATE : plan Resto ou Gastro requis ── */
  if (!hasSiteAccess) {
    return (
      <div style={{ padding: '14px 18px 20px', maxWidth: 740 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          🌐 Site Vitrine
        </div>
        <div style={{ fontSize: '.85rem', color: 'var(--t2)', marginBottom: 20 }}>
          {t('siteVitrine.gate.sub') || 'Créez le site web de votre restaurant — synchronisé en temps réel avec R3STO.'}
        </div>

        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 14, padding: '32px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
            {t('siteVitrine.gate.title') || 'Disponible avec les plans Resto et Gastro'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--t2)', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.6 }}>
            {t('siteVitrine.gate.desc') || 'Le Site Vitrine est inclus dans les abonnements Resto (59 CHF/mois) et Gastro (79 CHF/mois). Votre site se connecte automatiquement à votre système de réservation R3STO — menu, horaires, événements et widget de réservation toujours à jour.'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 480, margin: '0 auto 24px', textAlign: 'left' }}>
            {[
              { plan: 'Premium', price: '59', sub: 'Site sur monresto.r3sto.ch', features: ['Site vitrine inclus', 'Sous-domaine R3STO', 'Branding R3STO', 'Widget réservation'], recommended: false },
              { plan: 'Signature', price: '79', sub: 'Domaine personnalisé', features: ['Site vitrine inclus', 'Votre propre domaine', 'Sans branding R3STO', 'Widget réservation'], recommended: true },
            ].map(p => (
              <div key={p.plan} style={{
                background: 'var(--bg)', border: p.recommended ? '2px solid var(--ac)' : '1px solid var(--border)',
                borderRadius: 10, padding: '18px 16px', position: 'relative',
              }}>
                {p.recommended && (
                  <div style={{
                    position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--ac)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                  }}>Recommandé</div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ac2)', marginBottom: 8 }}>{p.plan}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{p.price} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t3)' }}>CHF/mois</span></div>
                <div style={{ fontSize: 12, color: 'var(--t3)', margin: '8px 0 12px' }}>{p.sub}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ fontSize: 12, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--gn)', fontSize: 14 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <a href="https://bill.r3sto.ch" target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: 'var(--ac)', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            {t('siteVitrine.gate.upgrade') || 'Changer de plan →'}
          </a>
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--t3)' }}>
            {t('siteVitrine.gate.note') || 'Votre plan actuel : Bistro (39 CHF/mois) · Le Site Vitrine nécessite un plan avec gestion de réservations intégrée.'}
          </div>
        </div>

        {/* Preview features */}
        <div style={{ marginTop: 20, background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            {t('siteVitrine.gate.previewTitle') || 'Ce que vous débloquez avec le Site Vitrine'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {[
              { icon: '🎨', text: '5 thèmes + couleurs personnalisées' },
              { icon: '📋', text: 'Menu synchronisé en temps réel' },
              { icon: '🍽️', text: 'Widget de réservation intégré' },
              { icon: '🕐', text: 'Horaires d\'ouverture live' },
              { icon: '🎉', text: 'Événements automatiques' },
              { icon: '💰', text: 'Promotions automatiques' },
              { icon: '🔍', text: 'SEO optimisé (meta, OG)' },
              { icon: '🌍', text: 'Multilingue FR/DE/IT/EN' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--t2)', padding: '6px 0' }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span> {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════
     HANDLERS
     ═══════════════════════════════════════════════════ */
  const handleToggleSection = (sectionId: string) => {
    setSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }
  const handleExpandSection = (sectionId: string) => {
    setExpandedSection(prev => prev === sectionId ? null : sectionId)
  }
  const handleSave = () => toast(t('common.saved') || 'Site Vitrine sauvegardé', 'success')

  /* ═══════════════════════════════════════════════════
     STYLES
     ═══════════════════════════════════════════════════ */
  const inputS: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: '.85rem',
    border: '1px solid var(--border)', borderRadius: 8,
    background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--ff)', boxSizing: 'border-box',
  }
  const labelS: React.CSSProperties = {
    display: 'block', fontSize: '.65rem', fontWeight: 700, marginBottom: 6,
    color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.14em',
  }
  const cardS: React.CSSProperties = {
    background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 16px', marginBottom: 0,
  }
  const sectionHeaderS: React.CSSProperties = {
    fontSize: '.65rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 14, marginTop: 6,
  }
  const textareaS: React.CSSProperties = { ...inputS, minHeight: 100, resize: 'vertical' }

  /* ═══════════════════════════════════════════════════
     INLINE PREVIEW
     ═══════════════════════════════════════════════════ */
  const PreviewPanel = () => {
    const th = selectedThemeObj.colors
    const activeSections = SITE_SECTIONS.filter(s => sections[s.id])
    return (
      <div style={{
        background: th.bg, color: th.text, borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--border)', maxHeight: 500, overflowY: 'auto',
      }}>
        {/* Hero */}
        <div style={{ padding: '40px 28px', textAlign: 'center', borderBottom: `2px solid ${th.accent}30` }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.02em' }}>{formData.name || 'Mon Restaurant'}</div>
          {formData.tagline && <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>{formData.tagline}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ padding: '8px 18px', background: th.accent, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>Réserver</span>
            <span style={{ padding: '8px 18px', border: `1.5px solid ${th.accent}`, color: th.accent, borderRadius: 6, fontSize: 13, fontWeight: 700 }}>La carte</span>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: 2, padding: '10px 16px', overflowX: 'auto', borderBottom: `1px solid ${th.text}15`, flexWrap: 'wrap' }}>
          {activeSections.map(s => (
            <span key={s.id} style={{ padding: '4px 10px', fontSize: 10, color: th.text, opacity: 0.6, fontWeight: 600 }}>
              {s.icon} {s.label}
            </span>
          ))}
        </div>

        {/* Section previews */}
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {sections.story && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, color: th.gold }}>Notre histoire</div>
              <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.6 }}>{storyData.text || 'L\'histoire de votre restaurant apparaîtra ici…'}</div>
            </div>
          )}
          {sections.specialties && specData.items.some(i => i.name) && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: th.gold }}>Spécialités</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {specData.items.filter(i => i.name).map((i, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', background: `${th.accent}20`, borderRadius: 6, fontSize: 12 }}>
                    {i.emoji} {i.name} {i.price && <span style={{ color: th.gold, fontWeight: 700, marginLeft: 6 }}>{i.price}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {sections.menu && (
            <div style={{ padding: '12px', background: `${th.text}08`, borderRadius: 8, fontSize: 12, opacity: 0.6 }}>
              📋 La carte — synchronisée automatiquement
            </div>
          )}
          {sections.hours && (
            <div style={{ padding: '12px', background: `${th.text}08`, borderRadius: 8, fontSize: 12, opacity: 0.6 }}>
              🕐 Horaires d'ouverture — synchronisés en temps réel
            </div>
          )}
          {sections.reviews && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: th.gold }}>Avis clients</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: th.gold }}>{effectiveReviews.score}</span>
                <span style={{ fontSize: 14 }}>{'⭐'.repeat(Math.round(Number(effectiveReviews.score)))}</span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>{effectiveReviews.countText}</span>
              </div>
            </div>
          )}
          {sections.contact && (
            <div style={{ padding: '12px', background: `${th.text}08`, borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>📍 {formData.address || 'Adresse'}{formData.city ? `, ${formData.city}` : ''}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{formData.phone} · {formData.email}</div>
            </div>
          )}
          {sections.reservation && (
            <div style={{ textAlign: 'center', padding: '16px', borderTop: `1px solid ${th.text}15` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{resaData.title}</div>
              <span style={{ padding: '10px 24px', background: th.accent, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>Réserver maintenant</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 28px', borderTop: `1px solid ${th.text}15`, fontSize: 10, opacity: 0.4, textAlign: 'center' }}>
          © {new Date().getFullYear()} {formData.name} · Propulsé par R3STO
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            🌐 Site Vitrine
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--t2)', marginTop: 2 }}>
            Créez et gérez le site web de votre restaurant
            {subdomain && <span style={{ marginLeft: 8, fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--bl)' }}>→ {siteUrl}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-block', padding: '5px 12px', borderRadius: 6,
            fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
            background: isConfigured ? 'rgba(16,185,129,.15)' : 'rgba(107,125,160,.15)',
            color: isConfigured ? 'var(--gn)' : 'var(--t2)',
          }}>
            {isConfigured ? '✓ Publié' : '⊝ Non configuré'}
          </div>
          <button onClick={() => setShowPreview(!showPreview)} style={{
            padding: '7px 14px', fontSize: '.85rem', fontWeight: 700, borderRadius: 7, cursor: 'pointer',
            background: showPreview ? 'var(--bl)' : 'var(--surf3)', color: showPreview ? '#fff' : 'var(--text)',
            border: '1px solid var(--border)', transition: 'all .12s',
          }}>
            {showPreview ? '✕ Fermer l\'aperçu' : '👁️ Aperçu live'}
          </button>
        </div>
      </div>

      {/* ═══ SITES CLIENT — accès direct aux surfaces visibles par les clients ═══ */}
      <div style={cardS}>
        <div style={sectionHeaderS}>🌐 Sites client — tout voir (données démo cohérentes)</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 12 }}>
          Surfaces publiques avec <strong>Chez Bunny's</strong> comme tenant principal + 3 restos d'exemple. Ouvrent dans un nouvel onglet.
        </div>

        {/* Groupe 1 : Surfaces Chez Bunny's */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
          🐰 Chez Bunny's (tenant démo)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
          {([
            { icon: '🌐', label: 'Site Vitrine',       url: 'https://demo.r3sto.ch/chez-bunnys/?demo=1',      desc: 'demo.r3sto.ch/chez-bunnys' },
            { icon: '📖', label: 'Menu QR',            url: 'https://menu.r3sto.ch/chez-bunnys?demo=1',       desc: 'Carte digitale (QR code)' },
            { icon: '📅', label: 'Widget réservation', url: 'https://booking.r3sto.ch/chez-bunnys?demo=1',    desc: 'Vue client du widget' },
            { icon: '🛵', label: 'Livraison',          url: 'https://delivery.r3sto.ch/chez-bunnys?demo=1',   desc: 'Click & collect' },
            { icon: '💳', label: 'Addition / Paiement', url: 'https://bill.r3sto.ch/chez-bunnys?demo=1',      desc: 'Paiement table' },
          ]).map(site => (
            <a key={site.label} href={site.url} target="_blank" rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text)', textDecoration: 'none', transition: 'all .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ac)'; e.currentTarget.style.background = 'var(--surf2)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{site.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {site.label} <span style={{ fontSize: 10, color: 'var(--t3)' }}>↗</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.desc}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Groupe 2 : Exemples d'autres restos */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
          🍽️ Exemples d'autres sites vitrines
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {([
            { icon: '🐰', label: "Chez Bunny's · Lausanne", url: 'https://demo.r3sto.ch/chezbunnys-lausanne/', desc: 'Bistro contemporain' },
            { icon: '🥨', label: "Chez Bunny's · Bern",     url: 'https://demo.r3sto.ch/chezbunnys-bern/',     desc: 'Brasserie tradition' },
            { icon: '🍷', label: "Chez Bunny's · Zürich",   url: 'https://demo.r3sto.ch/chezbunnys-zurich/',   desc: 'Gastronomique moderne' },
          ]).map(site => (
            <a key={site.label} href={site.url} target="_blank" rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text)', textDecoration: 'none', transition: 'all .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ac)'; e.currentTarget.style.background = 'var(--surf2)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{site.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {site.label} <span style={{ fontSize: 10, color: 'var(--t3)' }}>↗</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ═══ LAYOUT: Config + Preview ═══ */}
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* LEFT: Config */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto', minWidth: 0 }}>

          {/* ═══ APPARENCE ═══ */}
          <div style={cardS}>
            <div style={sectionHeaderS}>🎨 Apparence</div>
            <label style={labelS}>Thème</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {THEMES.map(theme => (
                <div key={theme.id} onClick={() => { setSelectedTheme(theme.id); setCustomColors(null) }}
                  style={{
                    flex: '1 0 140px', padding: 10, borderRadius: 8, cursor: 'pointer',
                    background: 'var(--surf2)', transition: 'all .15s',
                    border: !customColors && selectedTheme === theme.id ? '2px solid var(--ac)' : '1px solid var(--border)',
                  }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{theme.name}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--t3)', marginBottom: 6 }}>{theme.description}</div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[theme.colors.bg, theme.colors.accent, theme.colors.text, theme.colors.gold].map((c, i) => (
                      <div key={i} style={{ width: 20, height: 20, borderRadius: 3, background: c, border: '1px solid rgba(0,0,0,.1)' }} />
                    ))}
                  </div>
                </div>
              ))}
              {/* Custom */}
              <div onClick={() => setCustomColors(customColors || { bg: '#1a1a1a', accent: '#d64545', text: '#f5f5f5', gold: '#d4af37' })}
                style={{
                  flex: '1 0 140px', padding: 10, borderRadius: 8, cursor: 'pointer',
                  background: 'var(--surf2)', transition: 'all .15s',
                  border: customColors ? '2px solid var(--ac)' : '1px solid var(--border)',
                }}>
                <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🎨 Personnalisé</div>
                <div style={{ fontSize: '.68rem', color: 'var(--t3)', marginBottom: 6 }}>Vos propres couleurs</div>
                {customColors && (
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[customColors.bg, customColors.accent, customColors.text, customColors.gold].map((c, i) => (
                      <div key={i} style={{ width: 20, height: 20, borderRadius: 3, background: c, border: '1px solid rgba(0,0,0,.1)' }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Custom color pickers */}
            {customColors && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                {([
                  { key: 'bg' as const, label: 'Fond' },
                  { key: 'accent' as const, label: 'Accent' },
                  { key: 'text' as const, label: 'Texte' },
                  { key: 'gold' as const, label: 'Or' },
                ]).map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ ...labelS, marginBottom: 4 }}>{label}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="color" value={customColors[key]}
                        onChange={e => setCustomColors({ ...customColors, [key]: e.target.value })}
                        style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                      <span style={{ fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>{customColors[key]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Logo & Hero */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              {[
                { label: 'Logo', icon: '📸', hint: 'PNG, JPG (max 2 MB)' },
                { label: 'Image Hero', icon: '🖼️', hint: 'PNG, JPG (max 5 MB)' },
              ].map(item => (
                <div key={item.label}>
                  <label style={labelS}>{item.label}</label>
                  <div style={{ padding: 20, border: '2px dashed var(--border)', borderRadius: 8, textAlign: 'center', cursor: 'pointer', background: 'var(--bg)' }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>{item.icon}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--t2)' }}>Télécharger {item.label.toLowerCase()}</div>
                    <div style={{ fontSize: '.65rem', color: 'var(--t3)', marginTop: 4 }}>{item.hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ INFORMATIONS ═══ */}
          <div style={cardS}>
            <div style={sectionHeaderS}>ℹ️ Informations</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelS}>Nom du restaurant</label>
                <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} style={inputS} />
              </div>
              <div>
                <label style={labelS}>Type de name</label>
                <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Française, Italienne, Fusion…" style={inputS} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelS}>Tagline</label>
              <input type="text" value={formData.tagline} onChange={e => setFormData(p => ({ ...p, tagline: e.target.value }))} placeholder="Votre slogan" style={inputS} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelS}>Adresse</label>
                <input type="text" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} style={inputS} />
              </div>
              <div>
                <label style={labelS}>Ville</label>
                <input type="text" value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} style={inputS} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelS}>Téléphone</label>
                <PhoneInput value={formData.phone} onChange={(v: string) => setFormData(p => ({ ...p, phone: v }))} style={inputS} />
              </div>
              <div>
                <label style={labelS}>Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} style={inputS} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelS}>Requête Google Maps</label>
              <input type="text" value={formData.mapsQuery} onChange={e => setFormData(p => ({ ...p, mapsQuery: e.target.value }))} placeholder="Mon restaurant, Ville" style={inputS} />
            </div>
            <label style={labelS}>Liens sociaux</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(['instagram', 'facebook', 'tripadvisor', 'google'] as const).map(key => (
                <input key={key} type="text" value={socialLinks[key]}
                  onChange={e => setSocialLinks(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={key.charAt(0).toUpperCase() + key.slice(1)} style={inputS} />
              ))}
            </div>
          </div>

          {/* ═══ SEO ═══ */}
          <div style={cardS}>
            <div style={sectionHeaderS}>🔍 SEO & Réseaux sociaux</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelS}>Titre meta <span style={{ fontWeight: 400, textTransform: 'none' }}>(~60 car.)</span></label>
                <input type="text" value={seo.metaTitle} onChange={e => setSeo(p => ({ ...p, metaTitle: e.target.value }))}
                  placeholder={`${formData.name} — Restaurant ${formData.name || ''} ${formData.city || ''}`}
                  style={inputS} maxLength={70} />
                <div style={{ fontSize: 10, color: seo.metaTitle.length > 60 ? 'var(--rd)' : 'var(--t4)', marginTop: 3, fontFamily: 'var(--fm)' }}>
                  {seo.metaTitle.length}/60
                </div>
              </div>
              <div>
                <label style={labelS}>Favicon</label>
                <div style={{ padding: 14, border: '2px dashed var(--border)', borderRadius: 8, textAlign: 'center', cursor: 'pointer', background: 'var(--bg)' }}>
                  <span style={{ fontSize: 20 }}>🔖</span>
                  <div style={{ fontSize: '.7rem', color: 'var(--t3)', marginTop: 4 }}>32×32 PNG</div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelS}>Description meta <span style={{ fontWeight: 400, textTransform: 'none' }}>(~160 car.)</span></label>
              <textarea value={seo.metaDesc} onChange={e => setSeo(p => ({ ...p, metaDesc: e.target.value }))}
                placeholder="Découvrez [nom], restaurant [name] à [ville]. Réservez en ligne votre table…"
                style={{ ...inputS, minHeight: 60, resize: 'vertical' }} maxLength={170} />
              <div style={{ fontSize: 10, color: seo.metaDesc.length > 160 ? 'var(--rd)' : 'var(--t4)', marginTop: 3, fontFamily: 'var(--fm)' }}>
                {seo.metaDesc.length}/160
              </div>
            </div>
            {/* OG Preview */}
            <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>Aperçu partage social (OG)</div>
              <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ height: 80, background: 'var(--surf3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', fontSize: 24 }}>🖼️</div>
                <div style={{ padding: '8px 10px', background: 'var(--surf2)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{seo.metaTitle || formData.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{seo.metaDesc || 'Description de votre restaurant…'}</div>
                  <div style={{ fontSize: 9, color: 'var(--t4)', marginTop: 4 }}>{siteUrl}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ SECTIONS DU SITE ═══ */}
          <div style={cardS}>
            <div style={sectionHeaderS}>🗂️ Sections du site</div>
            {SITE_SECTIONS.map(section => {
              const isActive = sections[section.id]
              const isExpanded = expandedSection === section.id
              return (
                <div key={section.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  {/* Section header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                    <input type="checkbox" checked={isActive}
                      onChange={() => handleToggleSection(section.id)}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--ac)', flexShrink: 0 }} />
                    <div style={{ flex: 1, cursor: isActive ? 'pointer' : 'default' }}
                      onClick={() => isActive && !section.auto && handleExpandSection(section.id)}>
                      <div style={{ fontSize: '.88rem', fontWeight: 600, color: isActive ? 'var(--text)' : 'var(--t3)' }}>
                        {section.icon} {section.label}
                        {section.auto && (
                          <span style={{
                            display: 'inline-block', background: 'rgba(16,185,129,.15)', color: 'var(--gn)',
                            fontSize: '.55rem', borderRadius: 10, padding: '2px 8px', fontWeight: 700, marginLeft: 8,
                            textTransform: 'uppercase', letterSpacing: '.06em',
                          }}>Auto</span>
                        )}
                      </div>
                      <div style={{ fontSize: '.73rem', color: 'var(--t3)', marginTop: 1 }}>{section.desc}</div>
                    </div>
                    {isActive && !section.auto && (
                      <button onClick={() => handleExpandSection(section.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}>
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    )}
                  </div>

                  {/* Expanded content */}
                  {isActive && isExpanded && (
                    <div style={{ padding: '8px 8px 14px 28px', background: 'var(--bg)', borderLeft: '2px solid var(--ac)' }}>
                      {section.id === 'story' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <label style={labelS}>Titre</label>
                            <input type="text" value={storyData.title} onChange={e => setStoryData(p => ({ ...p, title: e.target.value }))} style={inputS} />
                          </div>
                          <div>
                            <label style={labelS}>Histoire</label>
                            <textarea value={storyData.text} onChange={e => setStoryData(p => ({ ...p, text: e.target.value }))} style={textareaS} placeholder="Racontez l'histoire de votre restaurant…" />
                          </div>
                          <div>
                            <label style={labelS}>Année d'ouverture</label>
                            <input type="text" value={storyData.year} onChange={e => setStoryData(p => ({ ...p, year: e.target.value }))} placeholder="2020" style={inputS} />
                          </div>
                        </div>
                      )}

                      {section.id === 'specialties' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <label style={labelS}>Titre</label>
                            <input type="text" value={specData.title} onChange={e => setSpecData(p => ({ ...p, title: e.target.value }))} style={inputS} />
                          </div>
                          {specData.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 80px auto', gap: 8 }}>
                              <input type="text" value={item.emoji} onChange={e => {
                                const items = [...specData.items]; items[idx] = { ...items[idx], emoji: e.target.value }
                                setSpecData(p => ({ ...p, items }))
                              }} style={{ ...inputS, textAlign: 'center' }} placeholder="🍽️" maxLength={2} />
                              <input type="text" value={item.name} onChange={e => {
                                const items = [...specData.items]; items[idx] = { ...items[idx], name: e.target.value }
                                setSpecData(p => ({ ...p, items }))
                              }} style={inputS} placeholder="Nom du plat" />
                              <input type="text" value={item.desc} onChange={e => {
                                const items = [...specData.items]; items[idx] = { ...items[idx], desc: e.target.value }
                                setSpecData(p => ({ ...p, items }))
                              }} style={inputS} placeholder="Description" />
                              <input type="text" value={item.price} onChange={e => {
                                const items = [...specData.items]; items[idx] = { ...items[idx], price: e.target.value }
                                setSpecData(p => ({ ...p, items }))
                              }} style={inputS} placeholder="Prix" />
                              <button onClick={() => setSpecData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                                style={{ padding: '6px 10px', background: 'var(--rd)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '.8rem', fontWeight: 700 }}>✕</button>
                            </div>
                          ))}
                          <button onClick={() => setSpecData(p => ({ ...p, items: [...p.items, { emoji: '🍽️', name: '', desc: '', price: '' }] }))}
                            style={{ padding: '8px 12px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '.8rem', fontWeight: 700 }}>
                            ➕ Ajouter une spécialité
                          </button>
                        </div>
                      )}

                      {section.id === 'spaces' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {spacesData.map((space, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                              <input type="text" value={space.name} onChange={e => {
                                const s = [...spacesData]; s[idx] = { ...s[idx], name: e.target.value }
                                setSpacesData(s)
                              }} style={inputS} placeholder="Nom de la salle" />
                              <div style={{ padding: '10px', border: '2px dashed var(--border)', borderRadius: 8, textAlign: 'center', fontSize: '.8rem', color: 'var(--t3)', background: 'var(--bg)' }}>
                                📸 Image
                              </div>
                              <button onClick={() => setSpacesData(s => s.filter((_, i) => i !== idx))}
                                style={{ padding: '6px 10px', background: 'var(--rd)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '.8rem', fontWeight: 700 }}>✕</button>
                            </div>
                          ))}
                          <button onClick={() => setSpacesData(s => [...s, { name: '', image: '' }])}
                            style={{ padding: '8px 12px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '.8rem', fontWeight: 700 }}>
                            ➕ Ajouter une salle
                          </button>
                        </div>
                      )}

                      {section.id === 'reviews' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {(['auto', 'manual'] as const).map(mode => (
                              <button key={mode} onClick={() => setReviewsSource(mode)}
                                style={{
                                  flex: 1, padding: '8px 10px', borderRadius: 6, fontSize: '.8rem', fontWeight: 700, cursor: 'pointer',
                                  border: reviewsSource === mode ? '2px solid var(--ac)' : '1px solid var(--border)',
                                  background: reviewsSource === mode ? 'rgba(99,102,241,.08)' : 'var(--surf2)',
                                  color: reviewsSource === mode ? 'var(--ac)' : 'var(--t2)',
                                }}>
                                {mode === 'auto' ? '🤖 Auto (depuis les avis)' : '✏️ Manuel'}
                              </button>
                            ))}
                          </div>
                          {reviewsSource === 'auto' ? (
                            <div style={{ fontSize: '.8rem', color: 'var(--t2)', padding: '8px 0' }}>
                              {autoReviews
                                ? <>✅ {autoReviews.items.length} avis 4-5⭐ affichés automatiquement (note {autoReviews.score}, {autoReviews.countText}). Gérez depuis <strong>Avis clients → Tous les avis</strong>.</>
                                : <>⚠️ Pas encore d'avis éligibles (4-5⭐, visibles). Les premiers avis apparaîtront automatiquement.</>
                              }
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>
                                  <label style={labelS}>Note moyenne</label>
                                  <input type="text" value={reviewsData.score} onChange={e => setReviewsData(p => ({ ...p, score: e.target.value }))} style={inputS} placeholder="4.8" />
                                </div>
                                <div>
                                  <label style={labelS}>Nombre d'avis</label>
                                  <input type="text" value={reviewsData.countText} onChange={e => setReviewsData(p => ({ ...p, countText: e.target.value }))} style={inputS} placeholder="124 avis" />
                                </div>
                              </div>
                              {reviewsData.items.map((review, idx) => (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, background: 'var(--surf2)', borderRadius: 6 }}>
                                  <input type="text" value={review.text} onChange={e => {
                                    const items = [...reviewsData.items]; items[idx] = { ...items[idx], text: e.target.value }
                                    setReviewsData(p => ({ ...p, items }))
                                  }} style={inputS} placeholder="Témoignage" />
                                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr auto', gap: 8 }}>
                                    <input type="number" min={1} max={5} value={review.stars} onChange={e => {
                                      const items = [...reviewsData.items]; items[idx] = { ...items[idx], stars: parseInt(e.target.value) || 5 }
                                      setReviewsData(p => ({ ...p, items }))
                                    }} style={inputS} />
                                    <input type="text" value={review.who} onChange={e => {
                                      const items = [...reviewsData.items]; items[idx] = { ...items[idx], who: e.target.value }
                                      setReviewsData(p => ({ ...p, items }))
                                    }} style={inputS} placeholder="Nom" />
                                    <input type="text" value={review.source} onChange={e => {
                                      const items = [...reviewsData.items]; items[idx] = { ...items[idx], source: e.target.value }
                                      setReviewsData(p => ({ ...p, items }))
                                    }} style={inputS} placeholder="Source" />
                                    <button onClick={() => setReviewsData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                                      style={{ padding: '6px 10px', background: 'var(--rd)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '.8rem', fontWeight: 700 }}>✕</button>
                                  </div>
                                </div>
                              ))}
                              <button onClick={() => setReviewsData(p => ({ ...p, items: [...p.items, { text: '', stars: 5, who: '', source: '' }] }))}
                                style={{ padding: '8px 12px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '.8rem', fontWeight: 700 }}>
                                ➕ Ajouter un avis
                              </button>
                            </>
                          )}
                          {googleUrl && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surf2)', borderRadius: 6, marginTop: 4 }}>
                              <span style={{ fontSize: 16 }}>🔍</span>
                              <div style={{ flex: 1, fontSize: '.75rem', color: 'var(--t2)' }}>Lien Google Reviews configuré</div>
                              <a href={googleUrl} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--ac)', textDecoration: 'none' }}>Tester ↗</a>
                            </div>
                          )}
                        </div>
                      )}

                      {section.id === 'contact' && (
                        <div style={{ fontSize: '.85rem', color: 'var(--t2)', padding: '8px 0' }}>
                          📍 Les informations de contact sont reprises depuis la section Informations ci-dessus.
                        </div>
                      )}

                      {section.id === 'reservation' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <label style={labelS}>Titre du widget</label>
                            <input type="text" value={resaData.title} onChange={e => setResaData(p => ({ ...p, title: e.target.value }))} style={inputS} />
                          </div>
                          <div style={{ fontSize: '.85rem', color: 'var(--t2)', padding: '4px 0' }}>
                            🍽️ Le widget utilise votre configuration R3STO (salles, services, capacité).
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auto sections info when active */}
                  {isActive && section.auto && (
                    <div style={{ padding: '6px 8px 10px 28px', fontSize: '.78rem', color: 'var(--gn)' }}>
                      ✓ Synchronisé automatiquement depuis R3STO
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ═══ LANGUES ═══ */}
          <div style={cardS}>
            <div style={sectionHeaderS}>🌐 Langues</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelS}>Langues disponibles</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 10 }}>
                {['FR', 'DE', 'IT', 'EN'].map(lang => (
                  <label key={lang} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.9rem' }}>
                    <input type="checkbox" checked={languages.includes(lang.toLowerCase())}
                      onChange={e => {
                        const lc = lang.toLowerCase()
                        setLanguages(p => e.target.checked ? [...p, lc] : p.filter(l => l !== lc))
                      }}
                      style={{ width: 16, height: 16, accentColor: 'var(--ac)' }} /> {lang}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={labelS}>Langue par défaut</label>
              <select value={defaultLang} onChange={e => setDefaultLang(e.target.value)} style={inputS}>
                {languages.map(lang => <option key={lang} value={lang}>{lang.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          {/* ═══ CONNEXIONS AUTO ═══ */}
          <div style={cardS}>
            <div style={sectionHeaderS}>⚡ Connexions automatiques</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AUTO_CONNECTIONS.map((conn, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1.1rem' }}>{conn.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)' }}>{conn.label}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--t3)' }}>{conn.desc}</div>
                  </div>
                  <div style={{ fontSize: '.6rem', fontWeight: 700, color: 'var(--gn)', textTransform: 'uppercase' }}>🟢 Connecté</div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ HÉBERGEMENT ═══ */}
          <div style={cardS}>
            <div style={sectionHeaderS}>🌍 Hébergement et nom de domaine</div>

            {/* Option selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {([
                { id: 'r3sto' as const, icon: '🎁', label: 'Sous-domaine R3STO', sub: 'Gratuit' },
                { id: 'own' as const, icon: '🔗', label: 'Votre propre domaine', sub: '~15 CHF/an' },
                { id: 'existing' as const, icon: '📎', label: 'Site existant', sub: 'Sous-dossier' },
              ]).map(opt => (
                <button key={opt.id} onClick={() => setHostingOption(opt.id)}
                  style={{
                    flex: '1 0 140px', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    border: hostingOption === opt.id ? '2px solid var(--ac)' : '1px solid var(--border)',
                    background: hostingOption === opt.id ? 'rgba(99,102,241,.06)' : 'var(--surf2)', color: 'var(--text)',
                  }}>
                  <div style={{ fontSize: '.82rem', fontWeight: 700 }}>{opt.icon} {opt.label}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--t3)', marginTop: 2 }}>{opt.sub}</div>
                </button>
              ))}
            </div>

            {/* R3STO subdomain config */}
            {hostingOption === 'r3sto' && (
              <div style={{ padding: 14, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 14 }}>
                <label style={labelS}>Votre sous-domaine</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input type="text" value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="monresto"
                    style={{ ...inputS, borderTopRightRadius: 0, borderBottomRightRadius: 0, flex: 1 }} />
                  <div style={{
                    padding: '10px 14px', background: 'var(--surf3)', border: '1px solid var(--border)',
                    borderLeft: 'none', borderTopRightRadius: 8, borderBottomRightRadius: 8,
                    fontSize: '.82rem', color: 'var(--t2)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap',
                  }}>.r3sto.ch</div>
                </div>
                {subdomain && (
                  <div style={{ fontSize: '.75rem', color: 'var(--gn)', marginTop: 6 }}>
                    ✓ Votre site sera accessible sur <strong>{siteUrl}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Own domain guide */}
            {hostingOption === 'own' && (
              <div style={{ padding: 14, background: 'rgba(68,128,216,.06)', borderRadius: 8, border: '1px solid rgba(68,128,216,.15)', marginBottom: 14 }}>
                <div style={{ fontSize: '.8rem', fontWeight: 800, color: 'var(--bl)', marginBottom: 10 }}>🇨🇭 Guide Infomaniak</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { n: '1', t: 'Acheter un domaine', d: 'infomaniak.com → Domaines. Un .ch coûte ~15 CHF/an.' },
                    { n: '2', t: 'Créer un hébergement web', d: 'Plan Starter (~5.75 CHF/mois) suffit.' },
                    { n: '3', t: 'Accès FTP', d: 'Hébergement → FTP/SSH. Notez hôte, identifiant, mot de passe.' },
                    { n: '4', t: 'Uploader le fichier', d: 'FileZilla ou gestionnaire Infomaniak → déposez index.html.' },
                  ].map(step => (
                    <div key={step.n} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 22, height: 22, minWidth: 22, borderRadius: '50%',
                        background: 'var(--bl)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.65rem', fontWeight: 900,
                      }}>{step.n}</div>
                      <div>
                        <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text)' }}>{step.t}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--t2)' }}>{step.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing site guide */}
            {hostingOption === 'existing' && (
              <div style={{ padding: 14, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 14 }}>
                <div style={{ fontSize: '.8rem', color: 'var(--t2)', lineHeight: 1.7 }}>
                  Déposez <code style={{ background: 'var(--surf3)', padding: '1px 5px', borderRadius: 3, fontSize: '.75rem' }}>index.html</code> dans un sous-dossier
                  de votre site existant (ex. <code style={{ background: 'var(--surf3)', padding: '1px 5px', borderRadius: 3, fontSize: '.75rem' }}>monsite.ch/restaurant/</code>).
                  Le menu, les événements et les réservations se mettent à jour automatiquement.
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => toast('Fichier index.html prêt au téléchargement (fonctionnalité à venir)', 'success')}
                style={{ padding: '9px 16px', fontSize: '.82rem', fontWeight: 700, borderRadius: 7, cursor: 'pointer', background: 'var(--gn)', color: '#fff', border: 'none' }}>
                ⬇️ Télécharger index.html
              </button>
              {hostingOption === 'own' && (
                <>
                  <button onClick={() => window.open('https://www.infomaniak.com/fr/hebergement/hebergement-web', '_blank')}
                    style={{ padding: '9px 16px', fontSize: '.82rem', fontWeight: 700, borderRadius: 7, cursor: 'pointer', background: 'transparent', color: 'var(--bl)', border: '1.5px solid rgba(68,128,216,.3)' }}>
                    🇨🇭 Infomaniak
                  </button>
                  <button onClick={() => window.open('https://filezilla-project.org/', '_blank')}
                    style={{ padding: '9px 16px', fontSize: '.82rem', fontWeight: 700, borderRadius: 7, cursor: 'pointer', background: 'transparent', color: 'var(--t2)', border: '1.5px solid var(--border)' }}>
                    📂 FileZilla
                  </button>
                </>
              )}
            </div>

            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(16,185,129,.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,.2)', fontSize: '.75rem', color: 'var(--gn)', lineHeight: 1.6 }}>
              ✅ <strong>Pas de webmaster nécessaire.</strong> Le fichier se dépose en 2 minutes. Menu, événements, fermetures et réservations se mettent à jour automatiquement.
            </div>
          </div>

          {/* ═══ ACTIONS ═══ */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4, paddingBottom: 20 }}>
            <button onClick={handleSave}
              style={{ padding: '10px 20px', fontSize: '.9rem', fontWeight: 700, borderRadius: 7, cursor: 'pointer', background: 'var(--ac)', color: '#fff', border: 'none' }}>
              💾 Enregistrer
            </button>
            <button onClick={() => setShowPreview(!showPreview)}
              style={{ padding: '10px 20px', fontSize: '.9rem', fontWeight: 700, borderRadius: 7, cursor: 'pointer', background: 'transparent', color: 'var(--ac)', border: '1.5px solid var(--ac)' }}>
              {showPreview ? '✕ Masquer l\'aperçu' : '👁️ Aperçu live'}
            </button>
          </div>
        </div>

        {/* RIGHT: Preview */}
        {showPreview && (
          <div style={{ width: 380, flexShrink: 0, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Aperçu live
            </div>
            <PreviewPanel />
          </div>
        )}
      </div>
    </div>
  )
}
