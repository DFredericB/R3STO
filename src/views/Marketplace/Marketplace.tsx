import { useAppStore } from '../../store/useAppStore'
import { useState, useEffect, useMemo } from 'react'
import { api } from '../../api/apiService'
import { useToast } from '../../components/ui/Toast'

const CUISINE_TYPES = [
  'française','italienne','suisse','méditerranéenne','japonaise','asiatique',
  'thaïlandaise','indienne','mexicaine','américaine','libanaise','fusion',
  'végétarienne','fruits de mer','gastronomique','brasserie','pizzeria','steakhouse',
]

const FEATURES_LIST = [
  'Terrasse','Vue lac','Parking','Valet parking','WiFi','Climatisation',
  'Salle privée','Bar','Accessible PMR','Animaux bienvenus','Enfants bienvenus',
  'Cave à vins','Four à bois','Bio','Sans gluten','Gastronomique',
]

interface Promo { type: 'discount'|'special'|'fidelity'|'gift'; label: string }

// ── Helpers pour parser les champs DB (features/promos stockés en JSON ou CSV)
const parseArr = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.filter(x => typeof x === 'string')
  if (typeof v === 'string' && v.trim()) {
    try { const j = JSON.parse(v); if (Array.isArray(j)) return j.filter(x => typeof x === 'string') } catch {}
    return v.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}
const parsePromos = (v: unknown): Promo[] => {
  if (Array.isArray(v)) return v.filter(p => p && typeof p === 'object' && 'label' in p) as Promo[]
  if (typeof v === 'string' && v.trim()) {
    try { const j = JSON.parse(v); if (Array.isArray(j)) return j as Promo[] } catch {}
  }
  return []
}

export function Marketplace() {
  const { resto, updateResto } = useAppStore()
  const { toast } = useToast()
  const restoName = resto?.name || 'Mon restaurant'

  // ── État hydraté depuis le resto ──
  const [photo, setPhoto] = useState('')
  const [cuisine, setCuisine] = useState('française')
  const [cuisineLabel, setCuisineLabel] = useState('')
  const [features, setFeatures] = useState<string[]>([])
  const [avgPrice, setAvgPrice] = useState(45)
  const [promos, setPromos] = useState<Promo[]>([])
  const [boostEnabled, setBoostEnabled] = useState(false)
  const [visible, setVisible] = useState(true)

  // ── UI state ──
  const [newPromoType, setNewPromoType] = useState<Promo['type']>('special')
  const [newPromoLabel, setNewPromoLabel] = useState('')
  const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [dirty, setDirty] = useState(false)

  // ── Hydratation depuis resto au mount + quand resto change ──
  useEffect(() => {
    if (!resto) return
    setPhoto(resto.photo || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop')
    setCuisine(resto.cuisine_tag || 'française')
    setCuisineLabel(resto.description || 'Cuisine française raffinée')
    setFeatures(parseArr(resto.features))
    setAvgPrice(resto.avg_price ?? resto.avg_ticket ?? 45)
    setPromos(parsePromos(resto.promos))
    setBoostEnabled((resto.boost_score || 0) >= 70)
    setVisible(resto.marketplace !== 0)
    setDirty(false)
  }, [resto])

  // Marque dirty sur tout changement
  const mark = () => { setDirty(true); if (saveState === 'saved') setSaveState('idle') }

  const toggleFeature = (f: string) => { setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]); mark() }
  const addPromo = () => {
    if (!newPromoLabel.trim()) return
    setPromos(p => [...p, { type: newPromoType, label: newPromoLabel.trim() }])
    setNewPromoLabel(''); mark()
  }
  const removePromo = (i: number) => { setPromos(p => p.filter((_, idx) => idx !== i)); mark() }

  const handleSave = async () => {
    setSaveState('saving')
    // Mapping front → colonnes DB réelles (service.js UPDATABLE_FIELDS)
    const patch = {
      marketplace: (visible ? 1 : 0) as 0 | 1,
      boost_score: boostEnabled ? 70 : 0,
      photo,
      cuisine_tag: cuisine,
      description: cuisineLabel,
      features,
      avg_price: avgPrice,
      promos,
    }
    try {
      // Appel direct API pour capter l'erreur (updateResto du store avale les erreurs)
      await api.resto.update(patch as any)
      updateResto(patch as any)  // met à jour le store local
      setSaveState('saved')
      setDirty(false)
      setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 2200)
    } catch (e) {
      console.warn('[Marketplace] save failed', e)
      setSaveState('error')
      toast('Erreur lors de la sauvegarde — veuillez r\u00e9essayer', 'error')
      setTimeout(() => setSaveState(s => s === 'error' ? 'idle' : s), 3500)
    }
  }

  // ── Stats : non câblées pour l'instant ──
  const stats = useMemo(() => ({ views: null, clicks: null, bookings: null, conversionRate: null }), [])

  const ptc: Record<Promo['type'], { icon: string; color: string; label: string }> = {
    discount: { icon: '🏷️', color: '#dc5050', label: 'Réduction' },
    special:  { icon: '🍽️', color: '#e89420', label: 'Menu spécial' },
    fidelity: { icon: '⭐', color: '#7c5cbe', label: 'Fidélité' },
    gift:     { icon: '🎁', color: '#1a9e6e', label: 'Bon cadeau' },
  }

  const S = {
    page: { padding: '24px 16px', maxWidth: 860, margin: '0 auto' } as React.CSSProperties,
    card: { background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px', marginBottom: 16 } as React.CSSProperties,
    cardTitle: { fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
    label: { fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginBottom: 4, display: 'block' } as React.CSSProperties,
    input: { width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--ff)', color: 'var(--text)', background: 'var(--surf)', outline: 'none' } as React.CSSProperties,
    select: { padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--ff)', color: 'var(--text)', background: 'var(--surf)', outline: 'none' } as React.CSSProperties,
    chip: (on: boolean): React.CSSProperties => ({ padding: '5px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, border: '1.5px solid ' + (on ? 'var(--bl)' : 'var(--border)'), background: on ? 'rgba(43,91,160,.08)' : 'var(--surf)', color: on ? 'var(--bl)' : 'var(--t3)', cursor: 'pointer', transition: '.15s' }),
    btn: (bg: string, disabled?: boolean): React.CSSProperties => ({ padding: '10px 20px', borderRadius: 8, border: 'none', background: bg, color: '#fff', fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'var(--ff)', opacity: disabled ? 0.6 : 1 }),
    statBox: { flex: 1, minWidth: 120, background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' as const } as React.CSSProperties,
  }

  const Toggle = ({ on, onToggle, colorOn, ariaLabel }: { on: boolean; onToggle: () => void; colorOn: string; ariaLabel: string }) => (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: on ? colorOn : 'var(--t4)', position: 'relative', transition: '.2s' }}
    >
      <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: '.2s' }} />
    </button>
  )

  const saveLabel =
    saveState === 'saving' ? 'Enregistrement…'
    : saveState === 'saved' ? '✓ Enregistré'
    : saveState === 'error' ? '⚠ Erreur — réessayer'
    : 'Enregistrer les modifications'
  const saveBg =
    saveState === 'saved' ? 'var(--gn)'
    : saveState === 'error' ? 'var(--rd, #dc5050)'
    : 'var(--bl)'

  return (
    <div style={S.page}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>Marketplace</h1>
      <p style={{ fontSize: 13, color: 'var(--t3)', margin: '4px 0 16px' }}>
        {'Gérez votre fiche sur '}
        <a href="https://r3sto.ch/restaurants/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--bl)', fontWeight: 600 }}>r3sto.ch/restaurants</a>
        {' — visible par les clients en Suisse.'}
      </p>

      {/* Stats */}
      <div style={S.card}>
        <div style={S.cardTitle}>📊 Performance (30 derniers jours)</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Vues', value: stats.views, icon: '👁️' },
            { label: 'Clics', value: stats.clicks, icon: '👆' },
            { label: 'Réservations', value: stats.bookings, icon: '📅' },
            { label: 'Conversion', value: stats.conversionRate, icon: '📈', suffix: '%' },
          ].map(st => (
            <div key={st.label} style={S.statBox}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{st.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: st.value == null ? 'var(--t4)' : 'var(--t1)' }}>
                {st.value == null ? '—' : (st.value + (st.suffix || ''))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>{st.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 10, fontStyle: 'italic' }}>
          Les statistiques seront disponibles dès la mise en service du tracking marketplace.
        </div>
      </div>

      {/* Visibilité + Boost */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ ...S.card, flex: 1, minWidth: 240, marginBottom: 0 }}>
          <div style={S.cardTitle}>👁️ Visibilité</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--t2)' }}>Fiche visible sur la marketplace</span>
            <Toggle ariaLabel="Visibilité marketplace" on={visible} onToggle={() => { setVisible(!visible); mark() }} colorOn="var(--gn)" />
          </div>
          {visible && <div style={{ fontSize: 11, color: 'var(--gn)', marginTop: 6, fontWeight: 600 }}>✓ Votre fiche est en ligne</div>}
        </div>
        <div style={{ ...S.card, flex: 1, minWidth: 240, marginBottom: 0 }}>
          <div style={S.cardTitle}>🚀 Boost placement</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--t2)' }}>Priorité dans les résultats</span>
            <Toggle ariaLabel="Boost placement" on={boostEnabled} onToggle={() => { setBoostEnabled(!boostEnabled); mark() }} colorOn="var(--am)" />
          </div>
          {boostEnabled && <div style={{ fontSize: 11, color: 'var(--am)', marginTop: 6, fontWeight: 600 }}>🔥 Placement boosté</div>}
        </div>
      </div>

      {/* Fiche restaurant */}
      <div style={S.card}>
        <div style={S.cardTitle}>🏪 Fiche restaurant</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label style={S.label}>Nom</label><input style={S.input} value={restoName} readOnly /></div>
          <div><label style={S.label}>Photo (URL)</label><input style={S.input} value={photo} onChange={e => { setPhoto(e.target.value); mark() }} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={S.label}>Type de cuisine</label>
            <select style={{ ...S.select, width: '100%' }} value={cuisine} onChange={e => { setCuisine(e.target.value); mark() }}>
              {CUISINE_TYPES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Description cuisine</label><input style={S.input} value={cuisineLabel} onChange={e => { setCuisineLabel(e.target.value); mark() }} /></div>
          <div><label style={S.label}>Prix moyen (CHF)</label><input style={S.input} type="number" min={0} value={avgPrice} onChange={e => { setAvgPrice(Number(e.target.value)); mark() }} /></div>
        </div>
        <label style={{ ...S.label, marginBottom: 8 }}>Caractéristiques</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {FEATURES_LIST.map(f => <span key={f} style={S.chip(features.includes(f))} onClick={() => toggleFeature(f)}>{f}</span>)}
        </div>
        {photo && <div style={{ width: '100%', height: 180, borderRadius: 10, overflow: 'hidden', marginBottom: 14, backgroundImage: 'url(' + photo + ')', backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--border)' }} />}
      </div>

      {/* Promotions */}
      <div style={S.card}>
        <div style={S.cardTitle}>🏷️ Promotions visibles</div>
        {promos.length === 0 && <p style={{ fontSize: 12, color: 'var(--t4)', fontStyle: 'italic', margin: '0 0 12px' }}>Aucune promotion active.</p>}
        {promos.map((p, i) => {
          const cfg = ptc[p.type] || ptc.special
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, marginBottom: 6, background: cfg.color + '0a', border: '1px solid ' + cfg.color + '20' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.icon} {p.label}</span>
              <button aria-label="Supprimer cette promo" title="Supprimer" onClick={() => removePromo(i)} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
          )
        })}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select style={S.select} value={newPromoType} onChange={e => setNewPromoType(e.target.value as Promo['type'])}>
            {Object.entries(ptc).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
          <input style={{ ...S.input, flex: 1, minWidth: 160 }} placeholder="Ex: -20% le mardi, Menu midi 29 CHF..." value={newPromoLabel} onChange={e => setNewPromoLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPromo()} />
          <button onClick={addPromo} style={S.btn('var(--bl)')}>+ Ajouter</button>
        </div>
      </div>

      {/* Aperçu */}
      <div style={S.card}>
        <div style={S.cardTitle}>👀 Aperçu de votre fiche</div>
        <div style={{ background: 'var(--bg)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', maxWidth: 340 }}>
          <div style={{ height: 140, backgroundImage: 'url(' + photo + ')', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
            <span style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', borderRadius: 5, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', background: 'rgba(26,158,110,.9)', color: '#fff' }}>Ouvert</span>
            {boostEnabled && <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 5, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', background: 'rgba(232,148,32,.92)', color: '#fff' }}>🔥 En vedette</span>}
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{restoName}</div>
            <div style={{ fontSize: 11, color: 'var(--bl)', fontWeight: 600, marginBottom: 4 }}>{cuisineLabel}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>{'📍 ' + (resto?.ville || 'Lausanne') + (features.length ? ' · ' + features.slice(0, 3).join(' · ') : '')}</div>
            {promos.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {promos.slice(0, 2).map((p, i) => { const cfg = ptc[p.type] || ptc.special; return <span key={i} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: cfg.color + '12', color: cfg.color, border: '1px solid ' + cfg.color + '20' }}>{cfg.icon} {p.label}</span> })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>{'Menu moyen '}<strong style={{ color: 'var(--t1)' }}>{avgPrice} CHF</strong></span>
            <span style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--gn)', color: '#fff', fontSize: 11, fontWeight: 800 }}>Réserver</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleSave} disabled={saveState === 'saving' || (!dirty && saveState === 'idle')} style={S.btn(saveBg, saveState === 'saving' || (!dirty && saveState === 'idle'))}>
          {saveLabel}
        </button>
        {dirty && saveState === 'idle' && <span style={{ fontSize: 12, color: 'var(--am)', fontWeight: 600 }}>● Modifications non enregistrées</span>}
        <a href="https://r3sto.ch/restaurants/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--bl)', fontWeight: 600 }}>Voir la marketplace en ligne ↗</a>
      </div>
    </div>
  )
}
