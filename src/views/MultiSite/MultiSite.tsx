// ══════════════════════════════════════════════════
//  R3STO — Multi-Sites (Plan Gastro)
//  Gestion de plusieurs établissements depuis un seul compte
//  Jusqu'à 12 sites — switch instantané
// ══════════════════════════════════════════════════

import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import { useT } from '../../i18n/useTranslation'
import { RADIUS, labelStyle, inputStyle, sectionTitle } from '../../utils/design'
import type { Site } from '../../types'

const MAX_SITES = 12

const SITE_COLORS = [
  '#4480d8', '#38b090', '#e08030', '#7c3aed', '#e05070',
  '#20a0c0', '#d4a030', '#6b8e23', '#cd5c5c', '#708090',
  '#9370db', '#20b2aa',
]

const cardS: React.CSSProperties = {
  background: 'var(--surf)', border: '1px solid var(--border)',
  borderRadius: RADIUS.md, padding: 16,
}

const btnPrimary: React.CSSProperties = {
  padding: '10px 20px', borderRadius: RADIUS.sm,
  background: 'var(--bl)', color: '#fff', border: 'none',
  fontWeight: 700, fontSize: 13, cursor: 'pointer',
  fontFamily: 'var(--ff)',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 14px', borderRadius: RADIUS.sm,
  background: 'var(--surf3)', color: 'var(--text)', border: '1px solid var(--border)',
  fontWeight: 600, fontSize: 12, cursor: 'pointer',
  fontFamily: 'var(--ff)',
}

const btnDanger: React.CSSProperties = {
  ...btnSecondary, color: 'var(--rd)', borderColor: 'rgba(220,80,80,.3)',
}

export function MultiSite() {
  const { toast } = useToast()
  const { t } = useT()
  const sites = useAppStore(s => s.sites)
  const activeSiteId = useAppStore(s => s.activeSiteId)
  const addSite = useAppStore(s => s.addSite)
  const updateSite = useAppStore(s => s.updateSite)
  const deleteSite = useAppStore(s => s.deleteSite)
  const setActiveSite = useAppStore(s => s.setActiveSite)
  const resto = useAppStore(s => s.resto)
  const plan = useAppStore(s => s.resto.plan)

  const [view, setView] = useState<'list' | 'add' | 'edit'>('list')
  const [editId, setEditId] = useState<string | null>(null)

  // Form state
  const [fn, setFn] = useState('')        // name
  const [fv, setFv] = useState('')        // ville
  const [fa, setFa] = useState('')        // adresse
  const [ft, setFt] = useState('')        // tel
  const [fe, setFe] = useState('')        // email
  const [fw, setFw] = useState('')        // web
  const [fc, setFc] = useState(SITE_COLORS[0])  // color
  const [fMaxCvt, setFMaxCvt] = useState(30)

  const isGastro = plan === 'gastro'
  const canAdd = sites.length < MAX_SITES

  function resetForm() {
    setFn(''); setFv(''); setFa(''); setFt(''); setFe(''); setFw('')
    setFc(SITE_COLORS[sites.length % SITE_COLORS.length])
    setFMaxCvt(30)
  }

  function loadSite(site: Site) {
    setFn(site.name); setFv(site.ville); setFa(site.adresse)
    setFt(site.tel); setFe(site.email); setFw(site.web)
    setFc(site.color); setFMaxCvt(site.maxCvt)
  }

  function handleAdd() {
    if (!fn.trim()) return toast(t('multisite.nameRequired'), 'error')
    if (!fv.trim()) return toast(t('multisite.cityRequired'), 'error')

    const site: Site = {
      id: `site_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: fn.trim(),
      ville: fv.trim(),
      adresse: fa.trim(),
      tel: ft.trim(),
      email: fe.trim(),
      web: fw.trim(),
      active: true,
      color: fc,
      plan: 'gastro',
      maxCvt: fMaxCvt,
      createdAt: Date.now(),
    }

    addSite(site)
    toast(`${site.name} ${t('multisite.added')}`, 'success')
    resetForm()
    setView('list')
  }

  function handleUpdate() {
    if (!editId) return
    if (!fn.trim()) return toast(t('multisite.nameRequired'), 'error')

    updateSite(editId, {
      name: fn.trim(),
      ville: fv.trim(),
      adresse: fa.trim(),
      tel: ft.trim(),
      email: fe.trim(),
      web: fw.trim(),
      color: fc,
      maxCvt: fMaxCvt,
    })
    toast(`${fn.trim()} ${t('multisite.updated')}`, 'success')
    resetForm()
    setEditId(null)
    setView('list')
  }

  function handleDelete(site: Site) {
    if (!confirm(`${t('multisite.confirmDelete')} "${site.name}" ?`)) return
    deleteSite(site.id)
    toast(`${site.name} ${t('multisite.deleted')}`, 'warning')
  }

  function handleSwitch(siteId: string | null) {
    setActiveSite(siteId)
    const name = siteId ? sites.find(s => s.id === siteId)?.name : resto.name || t('multisite.mainSite')
    toast(`${t('multisite.switchedTo')} ${name}`, 'success')
  }

  // ══════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════

  // Plan gate
  if (!isGastro) {
    return (
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
              🏢 {t('multisite.title')}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
              {t('multisite.subtitle')}
            </p>
          </div>
        </div>

        <div style={{
          ...cardS, textAlign: 'center', padding: 40,
          background: 'linear-gradient(135deg, var(--surf), var(--surf2))',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>
            {t('multisite.gastroOnly')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--t2)', maxWidth: 480, margin: '0 auto 20px' }}>
            {t('multisite.gastroDesc')}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: RADIUS.pill,
            background: 'var(--am)', color: '#fff',
            fontSize: 14, fontWeight: 700,
          }}>
            💎 Plan Gastro — 79 CHF/mois
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
            🏢 {t('multisite.title')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
            {sites.length} / {MAX_SITES} {t('multisite.sitesUsed')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {view !== 'list' && (
            <button style={btnSecondary} onClick={() => { setView('list'); setEditId(null); resetForm() }}>
              ← {t('multisite.back')}
            </button>
          )}
          {view === 'list' && canAdd && (
            <button style={btnPrimary} onClick={() => { resetForm(); setView('add') }}>
              + {t('multisite.addSite')}
            </button>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ ...cardS, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>{t('multisite.totalSites')}</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>{sites.length + 1}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{t('multisite.includingMain')}</div>
        </div>
        <div style={{ ...cardS, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>{t('multisite.activeSites')}</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--gn)', fontFamily: 'var(--fm)' }}>{sites.filter((s: any) => s.active).length + 1}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{t('multisite.operational')}</div>
        </div>
        <div style={{ ...cardS, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>{t('multisite.totalCapacity')}</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--am)', fontFamily: 'var(--fm)' }}>
            {(resto.maxCvt || 0) + sites.reduce((s, si) => s + si.maxCvt, 0)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{t('multisite.covers')}</div>
        </div>
      </div>

      {/* ═══════════════ VUE LISTE ═══════════════ */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Site principal */}
          <div
            style={{
              ...cardS, display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer',
              border: activeSiteId === null ? '2px solid var(--bl)' : '1px solid var(--border)',
              background: activeSiteId === null ? 'var(--bp)' : 'var(--surf)',
            }}
            onClick={() => handleSwitch(null)}
          >
            <div style={{
              width: 48, height: 48, borderRadius: RADIUS.md,
              background: 'var(--bl)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: '#fff', fontWeight: 900, flexShrink: 0,
            }}>
              🏠
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                {resto.name || t('multisite.mainSite')}
                <span style={{
                  marginLeft: 8, padding: '2px 8px', borderRadius: RADIUS.pill,
                  background: 'var(--bp)', color: 'var(--bl)',
                  fontSize: 10, fontWeight: 700,
                }}>{t('multisite.main')}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                {resto.ville} · {resto.maxCvt} {t('multisite.covers')} · {resto.tel}
              </div>
            </div>
            {activeSiteId === null && (
              <div style={{
                padding: '4px 10px', borderRadius: RADIUS.pill,
                background: 'var(--bl)', color: '#fff',
                fontSize: 11, fontWeight: 700,
              }}>✓ {t('multisite.active')}</div>
            )}
          </div>

          {/* Sites additionnels */}
          {sites.map((site: Site, _idx: number) => (
            <div
              key={site.id}
              style={{
                ...cardS, display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer',
                border: activeSiteId === site.id ? `2px solid ${site.color}` : '1px solid var(--border)',
                background: activeSiteId === site.id ? `${site.color}10` : 'var(--surf)',
                opacity: site.active ? 1 : 0.55,
              }}
              onClick={() => site.active && handleSwitch(site.id)}
            >
              <div style={{
                width: 48, height: 48, borderRadius: RADIUS.md,
                background: site.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: '#fff', fontWeight: 900, flexShrink: 0,
              }}>
                {site.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                  {site.name}
                  {!site.active && (
                    <span style={{
                      marginLeft: 8, padding: '2px 8px', borderRadius: RADIUS.pill,
                      background: 'var(--surf3)', color: 'var(--t3)',
                      fontSize: 10, fontWeight: 700,
                    }}>{t('multisite.inactive')}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                  {site.ville}{site.adresse ? ` · ${site.adresse}` : ''} · {site.maxCvt} {t('multisite.covers')} · {site.tel || '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {activeSiteId === site.id && (
                  <div style={{
                    padding: '4px 10px', borderRadius: RADIUS.pill,
                    background: site.color, color: '#fff',
                    fontSize: 11, fontWeight: 700,
                  }}>✓ {t('multisite.active')}</div>
                )}
                <button
                  style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11 }}
                  onClick={e => {
                    e.stopPropagation()
                    loadSite(site); setEditId(site.id); setView('edit')
                  }}
                >
                  ✏️
                </button>
                <button
                  style={{ ...btnDanger, padding: '6px 10px', fontSize: 11 }}
                  onClick={e => { e.stopPropagation(); handleDelete(site) }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {sites.length === 0 && (
            <div style={{
              ...cardS, textAlign: 'center', padding: 30,
              background: 'var(--surf2)',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                {t('multisite.noSites')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
                {t('multisite.noSitesDesc')}
              </div>
              <button style={btnPrimary} onClick={() => { resetForm(); setView('add') }}>
                + {t('multisite.addFirst')}
              </button>
            </div>
          )}

          {/* Info box */}
          <div style={{
            ...cardS, display: 'flex', alignItems: 'flex-start', gap: 12,
            background: 'var(--surf2)',
          }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>
              <strong>{t('multisite.howItWorks')}</strong><br />
              {t('multisite.howItWorksDesc')}
            </div>
          </div>

          {/* Redirection config */}
          {sites.length > 0 && (
            <div style={cardS}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🔄</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                    {t('multisite.redirectTitle') || 'Redirection clients'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t2)' }}>
                    {t('multisite.redirectDesc') || 'Quand un restaurant est complet, proposer des alternatives via le widget'}
                  </div>
                </div>
              </div>

              {/* Main site */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: 'var(--bp)', border: '1px solid rgba(68,128,216,.2)', borderRadius: 8, marginBottom: 6,
              }}>
                <span style={{ fontSize: 14 }}>🏠</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                    {resto.name || t('multisite.mainSite')}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{resto.ville}</div>
                </div>
                <div style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: 'rgba(60,200,112,.12)', color: 'var(--gn)',
                }}>
                  Accepte les redirections
                </div>
              </div>

              {/* Sibling sites with toggle */}
              {sites.map((site: Site, idx: number) => (
                <div key={site.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 4,
                  opacity: site.active ? 1 : 0.5,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, background: site.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 900, flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{site.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{site.ville} · {site.maxCvt}p</div>
                  </div>
                  <button
                    onClick={() => {
                      updateSite(site.id, { acceptRedirect: !site.acceptRedirect })
                      toast(`${site.name} — ${!site.acceptRedirect ? 'accepte' : 'refuse'} les redirections`, 'success')
                    }}
                    style={{
                      width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                      background: site.acceptRedirect ? 'var(--gn)' : 'var(--surf3)',
                      position: 'relative' as const,
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      position: 'absolute' as const, top: 3,
                      left: site.acceptRedirect ? 21 : 3,
                      transition: 'left .15s',
                    }} />
                  </button>
                </div>
              ))}

              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 8, padding: '0 4px' }}>
                {t('multisite.redirectHint') || 'Les clients seront redirigés vers le premier site disponible dans l\'ordre affiché ci-dessus.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ VUE AJOUT / ÉDITION ═══════════════ */}
      {(view === 'add' || view === 'edit') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
          {/* Colonne gauche */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={cardS}>
              <div style={sectionTitle}>{t('multisite.siteInfo')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <div>
                  <span style={labelStyle}>{t('multisite.siteName')} *</span>
                  <input value={fn} onChange={e => setFn(e.target.value)} placeholder="Le Bistro de Sion" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>{t('multisite.city')} *</span>
                  <input value={fv} onChange={e => setFv(e.target.value)} placeholder="Sion" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>{t('multisite.address')}</span>
                  <input value={fa} onChange={e => setFa(e.target.value)} placeholder="Rue du Grand-Pont 12" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>{t('multisite.maxCovers')}</span>
                  <input type="number" min={1} max={500} value={fMaxCvt} onChange={e => setFMaxCvt(Number(e.target.value))} style={inputStyle} />
                </div>
              </div>
            </div>

            <div style={cardS}>
              <div style={sectionTitle}>{t('multisite.contact')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <div>
                  <span style={labelStyle}>{t('multisite.phone')}</span>
                  <input value={ft} onChange={e => setFt(e.target.value)} placeholder="+41 27 123 45 67" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>Email</span>
                  <input type="email" value={fe} onChange={e => setFe(e.target.value)} placeholder="sion@restaurant.ch" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>{t('multisite.website')}</span>
                  <input value={fw} onChange={e => setFw(e.target.value)} placeholder="https://www.restaurant.ch" style={inputStyle} />
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={cardS}>
              <div style={sectionTitle}>{t('multisite.siteColor')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginTop: 10 }}>
                {SITE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setFc(color)}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: RADIUS.sm,
                      background: color, border: fc === color ? '3px solid #fff' : 'none',
                      boxShadow: fc === color ? `0 0 0 2px ${color}` : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Aperçu */}
            <div style={{
              padding: 20, borderRadius: RADIUS.lg,
              background: `linear-gradient(135deg, ${fc}, ${fc}cc)`,
              color: '#fff', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 80, opacity: 0.1 }}>🏢</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.7 }}>
                SITE
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, margin: '6px 0' }}>
                {fn || t('multisite.newSite')}
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                {fv || '...'}{fa ? ` · ${fa}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                {ft && <span>📞 {ft}</span>}
                <span>👥 {fMaxCvt} {t('multisite.covers')}</span>
              </div>
            </div>

            <button
              style={{ ...btnPrimary, width: '100%', padding: '14px 20px', fontSize: 15 }}
              onClick={view === 'edit' ? handleUpdate : handleAdd}
            >
              {view === 'edit'
                ? `✏️ ${t('multisite.updateSite')}`
                : `🏢 ${t('multisite.createSite')}`
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
