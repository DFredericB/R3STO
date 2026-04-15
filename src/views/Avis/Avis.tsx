// ══════════════════════════════════════════════════
//  R3STO — Avis Clients
//  Dashboard avis, modération, réponses, config
//  Source: interne (post-repas) + Google Reviews (lien)
// ══════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import { EmptyState } from '../../components/ui/EmptyState'
import { useT } from '../../i18n/useTranslation'
import { RADIUS, labelStyle, inputStyle, sectionTitle, filterChip } from '../../utils/design'
import type { Review } from '../../types'

// ── Constantes ─────────────────────────────────────
const STARS = [1, 2, 3, 4, 5] as const

const RATING_COLORS: Record<number, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16', 5: '#22c55e',
}

const SOURCE_META: Record<string, { icon: string; label: string; color: string }> = {
  internal: { icon: '🏪', label: 'Interne', color: 'var(--bl)' },
  google:   { icon: '🔍', label: 'Google', color: 'var(--am)' },
  email:    { icon: '✉️', label: 'Email', color: 'var(--pu)' },
}

// ── Styles ─────────────────────────────────────────
const cardS: React.CSSProperties = {
  background: 'var(--surf)', border: '1px solid var(--border)',
  borderRadius: RADIUS.md, padding: 14,
}

const kpiS: React.CSSProperties = { ...cardS, textAlign: 'center' }

const btnPrimary: React.CSSProperties = {
  padding: '10px 20px', borderRadius: RADIUS.sm,
  background: 'var(--bl)', color: '#fff', border: 'none',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--ff)',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 14px', borderRadius: RADIUS.sm,
  background: 'var(--surf3)', color: 'var(--text)', border: '1px solid var(--border)',
  fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)',
}

const chipS = filterChip

// ── Helpers ────────────────────────────────────────
function Stars({ rating, size = 16, onClick }: { rating: number; size?: number; onClick?: (r: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {STARS.map(s => (
        <span
          key={s}
          onClick={() => onClick?.(s)}
          style={{
            fontSize: size, cursor: onClick ? 'pointer' : 'default',
            filter: s <= rating ? 'none' : 'grayscale(1) opacity(.3)',
          }}
        >
          ⭐
        </span>
      ))}
    </span>
  )
}

function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--fm)', width: 16, textAlign: 'right' }}>{rating}</span>
      <span style={{ fontSize: 12 }}>⭐</span>
      <div style={{ flex: 1, height: 8, background: 'var(--surf3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: RATING_COLORS[rating], borderRadius: 4, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t3)', width: 28, textAlign: 'right' }}>{count}</span>
    </div>
  )
}

// ══════════════════════════════════════════════════
//  Composant principal
// ══════════════════════════════════════════════════
export function Avis() {
  const { toast } = useToast()
  const { t } = useT()
  const reviews = useAppStore(s => s.reviews)
  const addReview = useAppStore(s => s.addReview)
  const updateReview = useAppStore(s => s.updateReview)
  const deleteReview = useAppStore(s => s.deleteReview)
  const options = useAppStore(s => s.options)
  const updateOptions = useAppStore(s => s.updateOptions)

  // ── State ──
  const [tab, setTab] = useState<'dashboard' | 'list' | 'settings'>('dashboard')
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterSource, setFilterSource] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Form pour ajout manuel
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRating, setFormRating] = useState<1|2|3|4|5>(5)
  const [formComment, setFormComment] = useState('')
  const [formService, setFormService] = useState('')

  // ── Settings state (extended from options) ──
  const reviewsEnabled = (options as any).reviews_enabled ?? true
  const reviewsDelay = (options as any).reviews_delay_hours ?? 2
  const reviewsMode: 'internal' | 'google' | 'both' = (options as any).reviews_mode ?? 'both'
  const reviewsGoogleUrl = (options as any).reviews_google_url ?? ''
  const reviewsAutoReminder = (options as any).reviews_auto_reminder ?? true
  const reviewsReminderSms = (options as any).reviews_reminder_sms ?? false

  // ── KPIs ──
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const ratingCounts = STARS.map(s => reviews.filter(r => r.rating === s).length)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthReviews = reviews.filter(r => new Date(r.createdAt).toISOString().slice(0, 7) === thisMonth)
  const monthAvg = monthReviews.length > 0 ? monthReviews.reduce((s, r) => s + r.rating, 0) / monthReviews.length : 0
  const pendingReplies = reviews.filter(r => !r.reply && r.comment).length
  const flaggedCount = reviews.filter(r => r.flagged).length

  // ── Filtrage ──
  const filtered = useMemo(() => {
    let list = [...reviews]
    if (filterRating) list = list.filter(r => r.rating === filterRating)
    if (filterSource) list = list.filter(r => r.source === filterSource)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.clientName.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        r.clientEmail.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => b.createdAt - a.createdAt)
  }, [reviews, filterRating, filterSource, search])

  // ── Handlers ──
  function handleReply(reviewId: string) {
    if (!replyText.trim()) return
    updateReview(reviewId, { reply: replyText.trim(), repliedAt: Date.now() })
    toast('Réponse enregistrée', 'success')
    setReplyingId(null)
    setReplyText('')
  }

  function handleFlag(reviewId: string, flagged: boolean) {
    updateReview(reviewId, { flagged })
    toast(flagged ? 'Avis signalé' : 'Signalement retiré', 'warning')
  }

  function handleToggleVisible(reviewId: string, visible: boolean) {
    updateReview(reviewId, { visible })
    toast(visible ? 'Avis visible' : 'Avis masqué', 'info')
  }

  function handleAddReview() {
    if (!formName.trim()) return toast('Nom requis', 'error')
    if (!formComment.trim()) return toast('Commentaire requis', 'error')

    const review: Review = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      clientName: formName.trim(),
      clientEmail: formEmail.trim(),
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
      rating: formRating,
      comment: formComment.trim(),
      service: formService || 'Soir',
      source: 'internal',
      visible: true,
      flagged: false,
    }
    addReview(review)
    toast('Avis ajouté', 'success')
    setShowAddModal(false)
    setFormName(''); setFormEmail(''); setFormRating(5); setFormComment(''); setFormService('')
  }

  // ══════════════════════════════════════════════════
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
            ⭐ Avis clients
          </h2>
          <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
            Collecter · Modérer · Répondre · Améliorer
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnSecondary} onClick={() => setShowAddModal(true)}>+ Ajouter un avis</button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['dashboard', 'list', 'settings'] as const).map(t => (
          <button key={t} style={chipS(tab === t)} onClick={() => setTab(t)}>
            {t === 'dashboard' ? '📊 Tableau de bord' : t === 'list' ? '💬 Tous les avis' : '⚙️ Paramètres'}
          </button>
        ))}
      </div>

      {/* ═══════ TAB DASHBOARD ═══════ */}
      {tab === 'dashboard' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div style={kpiS}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Note moyenne</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: RATING_COLORS[Math.round(avgRating)] || 'var(--t3)', fontFamily: 'var(--fm)' }}>
                {avgRating > 0 ? avgRating.toFixed(1) : '—'}
              </div>
              <div style={{ marginTop: 4 }}><Stars rating={Math.round(avgRating)} size={14} /></div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{reviews.length} avis au total</div>
            </div>
            <div style={kpiS}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Ce mois</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>{monthReviews.length}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                moy. {monthAvg > 0 ? monthAvg.toFixed(1) : '—'} ⭐
              </div>
            </div>
            <div style={kpiS}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Sans réponse</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: pendingReplies > 0 ? 'var(--am)' : 'var(--gn)', fontFamily: 'var(--fm)' }}>{pendingReplies}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>à traiter</div>
            </div>
            <div style={kpiS}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Signalés</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: flaggedCount > 0 ? 'var(--rd)' : 'var(--gn)', fontFamily: 'var(--fm)' }}>{flaggedCount}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>à modérer</div>
            </div>
          </div>

          {/* Distribution + Derniers avis */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
            {/* Distribution */}
            <div style={cardS}>
              <div style={sectionTitle}>Distribution des notes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {[5, 4, 3, 2, 1].map(r => (
                  <RatingBar key={r} rating={r} count={ratingCounts[r - 1]} total={reviews.length} />
                ))}
              </div>
              {reviews.length > 0 && (
                <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--surf2)', borderRadius: RADIUS.sm }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 4 }}>Satisfaction</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gn)', fontFamily: 'var(--fm)' }}>
                    {Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>clients satisfaits (4-5 ⭐)</div>
                </div>
              )}
            </div>

            {/* Derniers avis */}
            <div style={cardS}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={sectionTitle}>Derniers avis</span>
                <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11 }} onClick={() => setTab('list')}>Voir tout →</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviews.length === 0 ? (
                  <EmptyState
                    compact
                    icon="⭐"
                    title="Aucun avis pour le moment"
                    description="Les avis seront collectés automatiquement après chaque repas via le QR code ou le mail post-visite."
                  />
                ) : (
                  reviews.slice(0, 5).map(r => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      compact
                      onReply={() => { setReplyingId(r.id); setReplyText(r.reply || ''); setTab('list') }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Google Reviews link */}
          {reviewsGoogleUrl && (
            <div style={{ ...cardS, display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 28 }}>🔍</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Google Reviews</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                  Lien configuré pour rediriger vos clients vers Google après leur visite.
                </div>
                <div style={{ fontSize: 12, fontFamily: 'var(--fm)', color: 'var(--bl)', marginTop: 4, wordBreak: 'break-all' }}>
                  {reviewsGoogleUrl}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════ TAB LIST ═══════ */}
      {tab === 'list' && (
        <>
          {/* Filtres */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={chipS(!filterRating && !filterSource)} onClick={() => { setFilterRating(null); setFilterSource(null) }}>
              Tous ({reviews.length})
            </button>
            {STARS.map(s => (
              <button key={s} style={chipS(filterRating === s)} onClick={() => setFilterRating(filterRating === s ? null : s)}>
                {s} ⭐ ({ratingCounts[s - 1]})
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            {Object.entries(SOURCE_META).map(([key, meta]) => (
              <button key={key} style={chipS(filterSource === key)} onClick={() => setFilterSource(filterSource === key ? null : key)}>
                {meta.icon} {meta.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <input
              placeholder="🔍 Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, maxWidth: 240 }}
            />
          </div>

          {/* Liste des avis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 ? (
              <EmptyState
                compact
                icon={reviews.length === 0 ? '⭐' : '🔍'}
                title={reviews.length === 0 ? 'Aucun avis' : 'Aucun résultat'}
                description={reviews.length === 0 ? 'Les avis apparaîtront ici après chaque repas.' : 'Essaie de changer les filtres ou la recherche.'}
                cta={reviews.length === 0 ? undefined : { label: 'Réinitialiser les filtres', onClick: () => { setFilterRating(null); setFilterSource(null); setSearch('') }, variant: 'secondary' }}
              />
            ) : (
              filtered.map(r => (
                <div key={r.id}>
                  <ReviewCard
                    review={r}
                    onReply={() => { setReplyingId(r.id); setReplyText(r.reply || '') }}
                    onFlag={() => handleFlag(r.id, !r.flagged)}
                    onToggleVisible={() => handleToggleVisible(r.id, !r.visible)}
                    onDelete={() => { deleteReview(r.id); toast('Avis supprimé', 'info') }}
                  />
                  {/* Reply input */}
                  {replyingId === r.id && (
                    <div style={{ marginTop: -1, padding: '12px 14px', background: 'var(--surf2)', borderRadius: `0 0 ${RADIUS.md}px ${RADIUS.md}px`, border: '1px solid var(--border)', borderTop: 'none' }}>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Votre réponse…"
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical', marginBottom: 8 }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button style={btnSecondary} onClick={() => { setReplyingId(null); setReplyText('') }}>{t('action.cancel')}</button>
                        <button style={btnPrimary} onClick={() => handleReply(r.id)}>Envoyer la réponse</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ═══════ TAB SETTINGS ═══════ */}
      {tab === 'settings' && (
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Collecte d'avis ── */}
          <div style={cardS}>
            <div style={sectionTitle}>Collecte d'avis</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              {/* Enable/Disable */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Activer les avis</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>Envoyer automatiquement une demande d'avis après chaque repas</div>
                </div>
                <button
                  onClick={() => updateOptions({ ...options, reviews_enabled: !reviewsEnabled } as any)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none',
                    background: reviewsEnabled ? 'var(--gn)' : 'var(--surf3)',
                    cursor: 'pointer', position: 'relative', transition: 'background .2s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: reviewsEnabled ? 23 : 3,
                    transition: 'left .2s',
                  }} />
                </button>
              </div>

              {/* Delay */}
              <div>
                <span style={labelStyle}>Délai d'envoi après le repas</span>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {[1, 2, 4, 24].map(h => (
                    <button
                      key={h}
                      style={chipS(reviewsDelay === h)}
                      onClick={() => updateOptions({ ...options, reviews_delay_hours: h } as any)}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Mode : interne / Google / les deux ── */}
          <div style={cardS}>
            <div style={sectionTitle}>Mode de collecte</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4, marginBottom: 10 }}>
              Choisissez où vos clients laissent leurs avis. Le mode "Les deux" envoie un email avec deux boutons : un pour votre formulaire interne R3STO et un pour Google.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { key: 'internal', label: '🏪 Interne uniquement', desc: 'Formulaire R3STO' },
                { key: 'google', label: '🔍 Google uniquement', desc: 'Redirige vers Google' },
                { key: 'both', label: '🏪+🔍 Les deux', desc: 'Double CTA' },
              ] as const).map(m => (
                <button key={m.key}
                  onClick={() => updateOptions({ ...options, reviews_mode: m.key } as any)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: RADIUS.sm,
                    border: reviewsMode === m.key ? '2px solid var(--bl)' : '1px solid var(--border)',
                    background: reviewsMode === m.key ? 'var(--bp)' : 'var(--surf2)',
                    cursor: 'pointer', textAlign: 'center',
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: reviewsMode === m.key ? 'var(--bl)' : 'var(--text)' }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{m.desc}</div>
                </button>
              ))}
            </div>

            {/* Google URL — visible si google ou both */}
            {(reviewsMode === 'google' || reviewsMode === 'both') && (
              <div style={{ marginTop: 12 }}>
                <span style={labelStyle}>URL Google Reviews</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={reviewsGoogleUrl}
                    onChange={e => updateOptions({ ...options, reviews_google_url: e.target.value } as any)}
                    placeholder="https://g.page/r/votre-restaurant/review"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {reviewsGoogleUrl && (
                    <a href={reviewsGoogleUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, fontWeight: 700, color: 'var(--bl)', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                      Tester ↗
                    </a>
                  )}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>
                  Google Business Profile → Accueil → Demander des avis → Copier le lien
                </div>
              </div>
            )}

            {/* Preview email */}
            <div style={{
              marginTop: 14, padding: '12px 16px', background: 'var(--surf2)', borderRadius: RADIUS.sm,
              border: '1px dashed var(--border)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Aperçu email post-visite</div>
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                "Merci pour votre visite ! Votre avis compte beaucoup…"
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {(reviewsMode === 'internal' || reviewsMode === 'both') && (
                  <span style={{ padding: '6px 14px', borderRadius: 6, background: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                    ⭐ Laisser un avis
                  </span>
                )}
                {(reviewsMode === 'google' || reviewsMode === 'both') && (
                  <span style={{ padding: '6px 14px', borderRadius: 6, background: '#4285f4', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                    🔍 Avis Google
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Campagne de rappel ── */}
          <div style={cardS}>
            <div style={sectionTitle}>Campagne rappel d'avis</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              {/* Auto reminder 48h */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Rappel automatique (48h)</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                    Si le client n'a pas laissé d'avis, relancer par email 48h après la visite.
                    <br />Pas de relance si l'avis a déjà été donné.
                  </div>
                </div>
                <button
                  onClick={() => updateOptions({ ...options, reviews_auto_reminder: !reviewsAutoReminder } as any)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none',
                    background: reviewsAutoReminder ? 'var(--gn)' : 'var(--surf3)',
                    cursor: 'pointer', position: 'relative', transition: 'background .2s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: reviewsAutoReminder ? 23 : 3,
                    transition: 'left .2s',
                  }} />
                </button>
              </div>

              {/* SMS reminder */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Rappel SMS (7 jours)</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                    Dernier rappel par SMS 7 jours après. Court et direct.
                    <br />Uniquement si aucun avis reçu. Plan Gastro requis.
                  </div>
                </div>
                <button
                  onClick={() => updateOptions({ ...options, reviews_reminder_sms: !reviewsReminderSms } as any)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none',
                    background: reviewsReminderSms ? 'var(--gn)' : 'var(--surf3)',
                    cursor: 'pointer', position: 'relative', transition: 'background .2s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: reviewsReminderSms ? 23 : 3,
                    transition: 'left .2s',
                  }} />
                </button>
              </div>

              {/* Flow visualization */}
              <div style={{
                padding: '12px 16px', background: 'var(--surf2)', borderRadius: RADIUS.sm,
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>Flow automatique</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'var(--gn)', color: '#fff', fontWeight: 700 }}>✅ Repas terminé</span>
                  <span style={{ color: 'var(--t4)' }}>→</span>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#8b5cf6', color: '#fff', fontWeight: 700 }}>📧 Merci + avis ({reviewsDelay}h)</span>
                  {reviewsAutoReminder && <>
                    <span style={{ color: 'var(--t4)' }}>→</span>
                    <span style={{ fontSize: 10, color: 'var(--t3)' }}>pas d'avis ?</span>
                    <span style={{ color: 'var(--t4)' }}>→</span>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#f59e0b', color: '#fff', fontWeight: 700 }}>📧 Rappel (48h)</span>
                  </>}
                  {reviewsReminderSms && <>
                    <span style={{ color: 'var(--t4)' }}>→</span>
                    <span style={{ fontSize: 10, color: 'var(--t3)' }}>toujours rien ?</span>
                    <span style={{ color: 'var(--t4)' }}>→</span>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#3b82f6', color: '#fff', fontWeight: 700 }}>💬 SMS (7j)</span>
                  </>}
                </div>
              </div>
            </div>
          </div>

          {/* ── Site Vitrine ── */}
          <div style={cardS}>
            <div style={sectionTitle}>Affichage sur le Site Vitrine</div>
            <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6, marginTop: 8 }}>
              Les meilleurs avis (4-5 étoiles, visibles, non signalés) sont automatiquement affichés dans la section "Avis clients" de votre site vitrine.
              Vous pouvez contrôler la visibilité de chaque avis depuis l'onglet "Tous les avis".
            </div>
            {reviews.filter(r => r.visible && !r.flagged && r.rating >= 4).length > 0 ? (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gn)', fontWeight: 700 }}>
                ✅ {reviews.filter(r => r.visible && !r.flagged && r.rating >= 4).length} avis éligibles pour le site
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--am)', fontWeight: 700 }}>
                ⚠️ Aucun avis éligible — les premiers avis 4-5⭐ apparaîtront automatiquement
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div style={cardS}>
            <div style={sectionTitle}>Informations</div>
            <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6, marginTop: 8 }}>
              Les avis sont envoyés par email après que le statut de la réservation passe à "Terminé".
              Le client reçoit un lien vers un formulaire simple (note 1-5 + commentaire)
              {reviewsMode !== 'internal' && ' et/ou un lien direct vers votre page Google'}.
              Vous pouvez répondre aux avis depuis l'onglet "Tous les avis" — votre réponse sera visible par le client.
              Les avis signalés sont masqués automatiquement en attendant votre modération.
              Les rappels ne sont jamais envoyés si le client a déjà laissé un avis.
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL AJOUT MANUEL ═══════ */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            ...cardS, width: 420, padding: 24, background: 'var(--surf)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>⭐ Ajouter un avis manuellement</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span style={labelStyle}>Client *</span>
                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Jean Dupont" style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Email</span>
                <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="jean@email.ch" style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Note *</span>
                <div style={{ marginTop: 4 }}><Stars rating={formRating} size={24} onClick={r => setFormRating(r as 1|2|3|4|5)} /></div>
              </div>
              <div>
                <span style={labelStyle}>Service</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {['Midi', 'Soir'].map(s => (
                    <button key={s} style={chipS(formService === s)} onClick={() => setFormService(s)}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <span style={labelStyle}>Commentaire *</span>
                <textarea
                  value={formComment}
                  onChange={e => setFormComment(e.target.value)}
                  placeholder="Excellent repas, service impeccable…"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={{ ...btnSecondary, flex: 1 }} onClick={() => setShowAddModal(false)}>{t('action.cancel')}</button>
              <button style={{ ...btnPrimary, flex: 1 }} onClick={handleAddReview}>{t('action.add')} l'avis</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sous-composant ReviewCard ──
function ReviewCard({ review, compact, onReply, onFlag, onToggleVisible, onDelete }: {
  review: Review
  compact?: boolean
  onReply?: () => void
  onFlag?: () => void
  onToggleVisible?: () => void
  onDelete?: () => void
}) {
  const meta = SOURCE_META[review.source] || SOURCE_META.internal
  return (
    <div style={{
      background: review.flagged ? 'rgba(220,80,80,.06)' : 'var(--surf)',
      border: `1px solid ${review.flagged ? 'rgba(220,80,80,.3)' : 'var(--border)'}`,
      borderRadius: RADIUS.md, padding: compact ? 12 : 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar circle */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: `${RATING_COLORS[review.rating]}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: RATING_COLORS[review.rating],
          }}>
            {review.clientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {review.clientName}
              {review.flagged && <span style={{ fontSize: 11, color: 'var(--rd)', marginLeft: 6 }}>🚩 Signalé</span>}
              {!review.visible && <span style={{ fontSize: 11, color: 'var(--t4)', marginLeft: 6 }}>👁 Masqué</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <Stars rating={review.rating} size={12} />
              <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--fm)' }}>
                {new Date(review.createdAt).toLocaleDateString('fr-CH')}
              </span>
              <span style={{
                padding: '1px 6px', borderRadius: RADIUS.xs,
                background: `${meta.color}18`, color: meta.color,
                fontSize: 9, fontWeight: 700,
              }}>
                {meta.icon} {meta.label}
              </span>
              {review.service && (
                <span style={{ fontSize: 10, color: 'var(--t4)' }}>· {review.service}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!compact && (
          <div style={{ display: 'flex', gap: 4 }}>
            {onReply && (
              <button onClick={onReply} title="Répondre" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>
                💬
              </button>
            )}
            {onFlag && (
              <button onClick={onFlag} title={review.flagged ? 'Retirer le signalement' : 'Signaler'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>
                {review.flagged ? '✅' : '🚩'}
              </button>
            )}
            {onToggleVisible && (
              <button onClick={onToggleVisible} title={review.visible ? 'Masquer' : 'Rendre visible'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>
                {review.visible ? '👁' : '👁‍🗨'}
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} title="Supprimer" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>
                🗑
              </button>
            )}
          </div>
        )}
      </div>

      {/* Comment */}
      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, marginTop: 8, marginLeft: compact ? 0 : 46 }}>
        {review.comment}
      </div>

      {/* Reply */}
      {review.reply && (
        <div style={{
          marginTop: 8, marginLeft: compact ? 0 : 46,
          padding: '8px 12px', background: 'var(--surf2)', borderRadius: RADIUS.sm,
          borderLeft: '3px solid var(--bl)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--bl)', marginBottom: 3 }}>
            Votre réponse · {review.repliedAt ? new Date(review.repliedAt).toLocaleDateString('fr-CH') : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.4 }}>{review.reply}</div>
        </div>
      )}
    </div>
  )
}
