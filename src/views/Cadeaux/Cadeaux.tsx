// ══════════════════════════════════════════════════
//  R3STO — Bons Cadeaux
//  Gestion des bons cadeaux : création, suivi, utilisation
//  Vente en ligne (Stripe) + création manuelle (admin)
// ══════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import { useT } from '../../i18n/useTranslation'
import { RADIUS, labelStyle, inputStyle, sectionTitle } from '../../utils/design'
import type { GiftCard, GiftCardStatus } from '../../types'

// ── Constantes ─────────────────────────────────────
const PRESET_AMOUNTS = [50, 100, 150, 200]
const CURRENCY = 'CHF'

const STATUS_META: Record<GiftCardStatus, { label: string; icon: string; color: string; bg: string }> = {
  active:    { label: 'Actif',     icon: '✅', color: 'var(--gn)', bg: 'rgba(60,200,112,.12)' },
  partial:   { label: 'Partiel',   icon: '🔶', color: 'var(--am)', bg: 'rgba(232,165,48,.12)' },
  used:      { label: 'Utilisé',   icon: '🏁', color: 'var(--t3)', bg: 'var(--surf3)' },
  expired:   { label: 'Expiré',    icon: '⏰', color: 'var(--t4)', bg: 'var(--surf3)' },
  cancelled: { label: 'Annulé',    icon: '🚫', color: 'var(--rd)', bg: 'rgba(220,80,80,.12)' },
}

// ── Helpers ────────────────────────────────────────
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `GC-${seg()}-${seg()}`
}

function expiryDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

// ── Styles ─────────────────────────────────────────
const cardS: React.CSSProperties = {
  background: 'var(--surf)', border: '1px solid var(--border)',
  borderRadius: RADIUS.md, padding: 14,
}

const kpiS: React.CSSProperties = {
  ...cardS, textAlign: 'center',
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

const chipS = (on: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: RADIUS.pill,
  background: on ? 'var(--bp)' : 'var(--surf3)',
  border: `1.5px solid ${on ? 'var(--bl)' : 'var(--border)'}`,
  color: on ? 'var(--bl)' : 'var(--t2)',
  fontWeight: 700, fontSize: 12, cursor: 'pointer',
  fontFamily: 'var(--ff)',
})

// ── Composant principal ────────────────────────────
export function Cadeaux() {
  const { toast } = useToast()
  const { t } = useT()
  const giftCards = useAppStore(s => s.giftCards)
  const addGiftCard = useAppStore(s => s.addGiftCard)
  const updateGiftCard = useAppStore(s => s.updateGiftCard)
  const useGiftCardAction = useAppStore(s => s.useGiftCard)
  const resto = useAppStore(s => s.resto)

  // ── State ──
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list')
  const [filter, setFilter] = useState<'all' | GiftCardStatus>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // ── Formulaire création ──
  const [formAmount, setFormAmount] = useState<number>(100)
  const [formCustom, setFormCustom] = useState(false)
  const [formBuyerName, setFormBuyerName] = useState('')
  const [formBuyerEmail, setFormBuyerEmail] = useState('')
  const [formBuyerTel, setFormBuyerTel] = useState('')
  const [formRecipientName, setFormRecipientName] = useState('')
  const [formRecipientEmail, setFormRecipientEmail] = useState('')
  const [formMessage, setFormMessage] = useState('')

  // ── Utilisation modale ──
  const [showUseModal, setShowUseModal] = useState(false)
  const [useAmount, setUseAmount] = useState(0)

  // ── KPIs ──
  const totalSold = giftCards.reduce((s, g) => s + g.amount, 0)
  const totalActive = giftCards.filter(g => g.status === 'active' || g.status === 'partial').reduce((s, g) => s + g.balance, 0)
  const totalUsed = giftCards.filter(g => g.status === 'used' || g.status === 'partial').reduce((s, g) => s + (g.amount - g.balance), 0)
  const countActive = giftCards.filter(g => g.status === 'active' || g.status === 'partial').length

  // ── Filtrage ──
  const filtered = useMemo(() => {
    let list = [...giftCards]
    if (filter !== 'all') list = list.filter(g => g.status === filter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(g =>
        g.code.toLowerCase().includes(q) ||
        g.buyerName.toLowerCase().includes(q) ||
        g.recipientName.toLowerCase().includes(q) ||
        g.recipientEmail.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => b.createdAt - a.createdAt)
  }, [giftCards, filter, search])

  const selected = selectedId ? giftCards.find(g => g.id === selectedId) : null

  // ── Handlers ──
  function handleCreate() {
    if (!formBuyerName.trim()) return toast('Nom de l\'acheteur requis', 'error')
    if (formAmount < 10) return toast('Montant minimum 10 CHF', 'error')

    const gc: GiftCard = {
      id: `gc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      code: generateCode(),
      amount: formAmount,
      balance: formAmount,
      currency: CURRENCY,
      status: 'active',
      buyerName: formBuyerName.trim(),
      buyerEmail: formBuyerEmail.trim(),
      buyerTel: formBuyerTel.trim(),
      recipientName: formRecipientName.trim() || formBuyerName.trim(),
      recipientEmail: formRecipientEmail.trim(),
      message: formMessage.trim(),
      createdAt: Date.now(),
      expiresAt: expiryDate(),
      source: 'admin',
    }

    addGiftCard(gc)
    toast(`Bon cadeau ${gc.code} créé — ${CURRENCY} ${gc.amount}`, 'success')
    resetForm()
    setView('list')
  }

  function handleUse() {
    if (!selected || useAmount <= 0) return
    if (useAmount > selected.balance) return toast('Montant supérieur au solde', 'error')
    useGiftCardAction(selected.id, useAmount)
    toast(`${CURRENCY} ${useAmount} débité du bon ${selected.code}`, 'success')
    setShowUseModal(false)
    setUseAmount(0)
  }

  function handlePrint(gc: GiftCard) {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Bon Cadeau ${gc.code}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; width: 210mm; height: 297mm; display: flex; align-items: center; justify-content: center; background: #f8f9fa; }
.card { width: 180mm; padding: 40px; border-radius: 24px; background: linear-gradient(135deg, #4480d8 0%, #9060e0 100%); color: #fff; position: relative; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.15); }
.card::before { content: '🎁'; position: absolute; right: -40px; top: -40px; font-size: 200px; opacity: .08; }
.card::after { content: ''; position: absolute; bottom: -60px; left: -60px; width: 200px; height: 200px; border-radius: 50%; background: rgba(255,255,255,.06); }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
.brand { font-size: 28px; font-weight: 900; letter-spacing: -.02em; }
.subtitle { font-size: 11px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; opacity: .65; margin-top: 4px; }
.badge { background: rgba(255,255,255,.15); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.amount { font-size: 72px; font-weight: 900; font-family: 'DM Mono', monospace; margin: 20px 0 10px; line-height: 1; }
.currency { font-size: 32px; font-weight: 700; opacity: .7; }
.code { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 700; letter-spacing: .12em; background: rgba(255,255,255,.12); display: inline-block; padding: 10px 20px; border-radius: 10px; margin: 16px 0; }
.divider { height: 1px; background: rgba(255,255,255,.15); margin: 24px 0; }
.info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.info-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; opacity: .55; margin-bottom: 3px; }
.info-value { font-size: 14px; font-weight: 600; }
.message { margin-top: 20px; padding: 16px 20px; background: rgba(255,255,255,.1); border-radius: 12px; border-left: 3px solid rgba(255,255,255,.4); }
.message-text { font-style: italic; font-size: 14px; line-height: 1.5; opacity: .9; }
.footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; opacity: .5; font-size: 10px; }
.conditions { max-width: 300px; line-height: 1.5; }
@media print { body { background: #fff; } .card { box-shadow: none; } }
</style></head><body>
<div class="card">
  <div class="header">
    <div>
      <div class="brand">${resto.name || 'Restaurant'}</div>
      <div class="subtitle">Bon cadeau</div>
    </div>
    <div class="badge">🎁 Gift Card</div>
  </div>
  <div class="amount"><span class="currency">${CURRENCY}</span> ${gc.amount}</div>
  <div class="code">${gc.code}</div>
  <div class="divider"></div>
  <div class="info">
    ${gc.recipientName ? `<div><div class="info-label">Pour</div><div class="info-value">${gc.recipientName}</div></div>` : ''}
    ${gc.buyerName ? `<div><div class="info-label">De la part de</div><div class="info-value">${gc.buyerName}</div></div>` : ''}
    <div><div class="info-label">Valable jusqu'au</div><div class="info-value">${gc.expiresAt}</div></div>
    <div><div class="info-label">Créé le</div><div class="info-value">${new Date(gc.createdAt).toLocaleDateString('fr-CH')}</div></div>
  </div>
  ${gc.message ? `<div class="message"><div class="message-text">« ${gc.message} »</div></div>` : ''}
  <div class="footer">
    <div class="conditions">Ce bon est valable dans notre établissement, sur présentation du code. Non remboursable, non cumulable avec d'autres offres. Valable 1 an à partir de la date d'émission.</div>
    <div>${resto.web || ''}<br>${resto.tel || ''}</div>
  </div>
</div>
</body></html>`

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      setTimeout(() => w.print(), 500)
    }
  }

  function handleCancel(gc: GiftCard) {
    updateGiftCard(gc.id, { status: 'cancelled' })
    toast(`Bon ${gc.code} annulé`, 'warning')
  }

  function resetForm() {
    setFormAmount(100)
    setFormCustom(false)
    setFormBuyerName('')
    setFormBuyerEmail('')
    setFormBuyerTel('')
    setFormRecipientName('')
    setFormRecipientEmail('')
    setFormMessage('')
  }

  // ══════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
            🎁 Bons cadeaux
          </h2>
          <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
            Créer · Vendre en ligne · Suivre l'utilisation
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {view !== 'list' && (
            <button style={btnSecondary} onClick={() => { setView('list'); setSelectedId(null) }}>
              ← Retour
            </button>
          )}
          <button style={btnPrimary} onClick={() => { resetForm(); setView('create') }}>
            + Nouveau bon
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div style={kpiS}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Total vendu</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gn)', fontFamily: 'var(--fm)' }}>{CURRENCY} {totalSold}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{giftCards.length} bons émis</div>
        </div>
        <div style={kpiS}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Solde en circulation</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--am)', fontFamily: 'var(--fm)' }}>{CURRENCY} {totalActive}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{countActive} bons actifs</div>
        </div>
        <div style={kpiS}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Montant utilisé</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>{CURRENCY} {totalUsed}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>consommé</div>
        </div>
        <div style={kpiS}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Taux d'utilisation</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--pu)', fontFamily: 'var(--fm)' }}>
            {totalSold > 0 ? Math.round(totalUsed / totalSold * 100) : 0}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>des montants vendus</div>
        </div>
      </div>

      {/* ═══════════════ VUE LISTE ═══════════════ */}
      {view === 'list' && (
        <>
          {/* Filtres */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={chipS(filter === 'all')} onClick={() => setFilter('all')}>Tous ({giftCards.length})</button>
            {(['active', 'partial', 'used', 'expired', 'cancelled'] as GiftCardStatus[]).map(s => (
              <button key={s} style={chipS(filter === s)} onClick={() => setFilter(s)}>
                {STATUS_META[s].icon} {STATUS_META[s].label} ({giftCards.filter(g => g.status === s).length})
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <input
              placeholder="🔍 Rechercher code, nom, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, maxWidth: 260 }}
            />
          </div>

          {/* Table */}
          <div style={{ ...cardS, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--ff)' }}>
              <thead>
                <tr style={{ background: 'var(--surf2)', borderBottom: '1px solid var(--border)' }}>
                  {['Code', 'Montant', 'Solde', 'Acheteur', 'Destinataire', 'Statut', 'Créé le', 'Expire', 'Source', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>
                      {giftCards.length === 0 ? 'Aucun bon cadeau — cliquez sur "+ Nouveau bon" pour commencer' : 'Aucun résultat pour ce filtre'}
                    </td>
                  </tr>
                )}
                {filtered.map(gc => {
                  const meta = STATUS_META[gc.status]
                  const isExpired = gc.status === 'active' && gc.expiresAt < new Date().toISOString().slice(0, 10)
                  return (
                    <tr
                      key={gc.id}
                      onClick={() => { setSelectedId(gc.id); setView('detail') }}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surf2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--bl)', letterSpacing: '.04em' }}>{gc.code}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--fm)', fontWeight: 700 }}>{CURRENCY} {gc.amount}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--fm)', fontWeight: 700, color: gc.balance > 0 ? 'var(--gn)' : 'var(--t4)' }}>{CURRENCY} {gc.balance}</td>
                      <td style={{ padding: '10px 12px' }}>{gc.buyerName}</td>
                      <td style={{ padding: '10px 12px', color: gc.recipientName ? 'var(--text)' : 'var(--t4)' }}>{gc.recipientName || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: RADIUS.pill,
                          background: isExpired ? STATUS_META.expired.bg : meta.bg,
                          color: isExpired ? STATUS_META.expired.color : meta.color,
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {isExpired ? STATUS_META.expired.icon : meta.icon} {isExpired ? 'Expiré' : meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{new Date(gc.createdAt).toLocaleDateString('fr-CH')}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{gc.expiresAt}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: RADIUS.xs,
                          background: gc.source === 'online' ? 'rgba(144,96,224,.12)' : 'var(--surf3)',
                          color: gc.source === 'online' ? 'var(--pu)' : 'var(--t3)',
                          fontSize: 10, fontWeight: 700,
                        }}>
                          {gc.source === 'online' ? '🌐 En ligne' : '🏪 Admin'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedId(gc.id); setView('detail') }}
                          style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11 }}
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Lien vente en ligne */}
          <div style={{ ...cardS, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28 }}>🌐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Vente en ligne</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                Partagez ce lien pour que vos clients achètent des bons cadeaux directement en ligne (paiement Stripe).
              </div>
              <div style={{ fontSize: 12, fontFamily: 'var(--fm)', color: 'var(--bl)', marginTop: 6, wordBreak: 'break-all' }}>
                https://booking.r3sto.ch/{resto.name ? resto.name.toLowerCase().replace(/\s+/g, '-') : 'restaurant'}/gift
              </div>
            </div>
            <button
              style={btnSecondary}
              onClick={() => {
                const url = `https://booking.r3sto.ch/${resto.name ? resto.name.toLowerCase().replace(/\s+/g, '-') : 'restaurant'}/gift`
                navigator.clipboard?.writeText(url)
                toast('Lien copié !', 'success')
              }}
            >
              📋 Copier le lien
            </button>
          </div>
        </>
      )}

      {/* ═══════════════ VUE CRÉATION ═══════════════ */}
      {view === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
          {/* Colonne gauche : montant */}
          <div style={cardS}>
            <div style={sectionTitle}>Montant du bon</div>

            {/* Montants prédéfinis */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12 }}>
              {PRESET_AMOUNTS.map(a => (
                <button
                  key={a}
                  onClick={() => { setFormAmount(a); setFormCustom(false) }}
                  style={{
                    padding: 16, borderRadius: RADIUS.md,
                    border: `2px solid ${!formCustom && formAmount === a ? 'var(--bl)' : 'var(--border)'}`,
                    background: !formCustom && formAmount === a ? 'var(--bp)' : 'var(--surf)',
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--fm)', color: !formCustom && formAmount === a ? 'var(--bl)' : 'var(--text)' }}>
                    {CURRENCY} {a}
                  </div>
                </button>
              ))}
            </div>

            {/* Montant libre */}
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setFormCustom(true)}
                style={{
                  ...chipS(formCustom), width: '100%', marginBottom: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                ✏️ Montant libre
              </button>
              {formCustom && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{CURRENCY}</span>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    value={formAmount}
                    onChange={e => setFormAmount(Number(e.target.value))}
                    style={{ ...inputStyle, fontSize: 18, fontWeight: 900, fontFamily: 'var(--fm)', textAlign: 'center' }}
                  />
                </div>
              )}
            </div>

            {/* Aperçu du bon */}
            <div style={{
              marginTop: 20, padding: 20, borderRadius: RADIUS.lg,
              background: 'linear-gradient(135deg, var(--bl), var(--pu))',
              color: '#fff', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 80, opacity: 0.1 }}>🎁</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.7 }}>BON CADEAU</div>
              <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'var(--fm)', margin: '6px 0' }}>{CURRENCY} {formAmount}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{resto.name || 'Votre restaurant'}</div>
              {formRecipientName && <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Pour : {formRecipientName}</div>}
              {formMessage && <div style={{ fontSize: 11, fontStyle: 'italic', marginTop: 4, opacity: 0.8 }}>« {formMessage} »</div>}
              <div style={{ fontSize: 10, fontFamily: 'var(--fm)', marginTop: 10, opacity: 0.6 }}>Code : XXXX-XXXX</div>
            </div>
          </div>

          {/* Colonne droite : infos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={cardS}>
              <div style={sectionTitle}>Acheteur</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <div>
                  <span style={labelStyle}>Nom *</span>
                  <input value={formBuyerName} onChange={e => setFormBuyerName(e.target.value)} placeholder="Jean Dupont" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>Email</span>
                  <input type="email" value={formBuyerEmail} onChange={e => setFormBuyerEmail(e.target.value)} placeholder="jean@email.ch" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>Téléphone</span>
                  <input value={formBuyerTel} onChange={e => setFormBuyerTel(e.target.value)} placeholder="+41 79 123 45 67" style={inputStyle} />
                </div>
              </div>
            </div>

            <div style={cardS}>
              <div style={sectionTitle}>Destinataire</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <div>
                  <span style={labelStyle}>Nom</span>
                  <input value={formRecipientName} onChange={e => setFormRecipientName(e.target.value)} placeholder="Marie Martin (optionnel)" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>Email (envoi du bon)</span>
                  <input type="email" value={formRecipientEmail} onChange={e => setFormRecipientEmail(e.target.value)} placeholder="marie@email.ch" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>Message personnalisé</span>
                  <textarea
                    value={formMessage}
                    onChange={e => setFormMessage(e.target.value)}
                    placeholder="Joyeux anniversaire ! Profite bien de ce repas…"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>

            <button style={{ ...btnPrimary, width: '100%', padding: '14px 20px', fontSize: 15 }} onClick={handleCreate}>
              🎁 Créer le bon — {CURRENCY} {formAmount}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ VUE DÉTAIL ═══════════════ */}
      {view === 'detail' && selected && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
          {/* Carte visuelle du bon */}
          <div>
            <div style={{
              padding: 24, borderRadius: RADIUS.lg,
              background: selected.status === 'cancelled' ? 'var(--surf2)'
                : selected.status === 'used' ? 'var(--surf2)'
                : 'linear-gradient(135deg, var(--bl), var(--pu))',
              color: selected.status === 'cancelled' || selected.status === 'used' ? 'var(--t3)' : '#fff',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 80, opacity: 0.1 }}>🎁</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.7 }}>BON CADEAU</div>
              <div style={{ fontSize: 42, fontWeight: 900, fontFamily: 'var(--fm)', margin: '6px 0' }}>
                {CURRENCY} {selected.balance}
                {selected.balance < selected.amount && (
                  <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.6 }}> / {selected.amount}</span>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--fm)', letterSpacing: '.08em', marginTop: 4 }}>{selected.code}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>{resto.name || 'Restaurant'}</div>
              {selected.recipientName && <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>Pour : {selected.recipientName}</div>}
              {selected.message && <div style={{ fontSize: 11, fontStyle: 'italic', marginTop: 4, opacity: 0.8 }}>« {selected.message} »</div>}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <span style={{
                  padding: '4px 10px', borderRadius: RADIUS.pill,
                  background: 'rgba(255,255,255,.15)',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {STATUS_META[selected.status].icon} {STATUS_META[selected.status].label}
                </span>
                <span style={{
                  padding: '4px 10px', borderRadius: RADIUS.pill,
                  background: 'rgba(255,255,255,.15)',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {selected.source === 'online' ? '🌐 En ligne' : '🏪 Admin'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {(selected.status === 'active' || selected.status === 'partial') && (
                <button
                  style={{ ...btnPrimary, flex: 1 }}
                  onClick={() => { setUseAmount(selected.balance); setShowUseModal(true) }}
                >
                  💰 Utiliser
                </button>
              )}
              <button style={{ ...btnSecondary, flex: 1 }} onClick={() => handlePrint(selected)}>
                🖨 Imprimer A4
              </button>
              {selected.status === 'active' && (
                <button style={{ ...btnSecondary, flex: 1 }} onClick={() => {
                  navigator.clipboard?.writeText(selected.code)
                  toast('Code copié !', 'success')
                }}>
                  📋 Copier code
                </button>
              )}
              {(selected.status === 'active' || selected.status === 'partial') && (
                <button style={btnDanger} onClick={() => handleCancel(selected)}>
                  {t('action.cancel')}
                </button>
              )}
            </div>

            {/* Barre de progression */}
            {selected.amount > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>
                  <span>Utilisé : {CURRENCY} {selected.amount - selected.balance}</span>
                  <span>Restant : {CURRENCY} {selected.balance}</span>
                </div>
                <div style={{ height: 8, background: 'var(--surf3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${((selected.amount - selected.balance) / selected.amount) * 100}%`,
                    background: 'var(--gn)',
                    borderRadius: 4,
                    transition: 'width .3s ease',
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Infos détaillées */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={cardS}>
              <div style={sectionTitle}>Acheteur</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <Row label="Nom" value={selected.buyerName} />
                <Row label="Email" value={selected.buyerEmail || '—'} />
                <Row label="Téléphone" value={selected.buyerTel || '—'} />
              </div>
            </div>

            <div style={cardS}>
              <div style={sectionTitle}>Destinataire</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <Row label="Nom" value={selected.recipientName || '—'} />
                <Row label="Email" value={selected.recipientEmail || '—'} />
                {selected.message && <Row label="Message" value={`« ${selected.message} »`} />}
              </div>
            </div>

            <div style={cardS}>
              <div style={sectionTitle}>Détails</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <Row label="Code" value={selected.code} mono />
                <Row label="Montant initial" value={`${CURRENCY} ${selected.amount}`} />
                <Row label="Solde restant" value={`${CURRENCY} ${selected.balance}`} />
                <Row label="Créé le" value={new Date(selected.createdAt).toLocaleDateString('fr-CH')} />
                <Row label="Expire le" value={selected.expiresAt} />
                {selected.usedAt && <Row label="Dernière utilisation" value={selected.usedAt} />}
                {selected.stripePaymentId && <Row label="Stripe" value={selected.stripePaymentId} mono />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL UTILISATION ═══════════════ */}
      {showUseModal && selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowUseModal(false)}>
          <div style={{
            ...cardS, width: 380, padding: 24,
            background: 'var(--surf)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>💰 Utiliser le bon</div>
            <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 16 }}>
              Bon <strong>{selected.code}</strong> — Solde : {CURRENCY} {selected.balance}
            </div>

            <span style={labelStyle}>Montant à débiter</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700 }}>{CURRENCY}</span>
              <input
                type="number"
                min={1}
                max={selected.balance}
                value={useAmount}
                onChange={e => setUseAmount(Number(e.target.value))}
                style={{ ...inputStyle, fontSize: 18, fontWeight: 900, fontFamily: 'var(--fm)', textAlign: 'center' }}
              />
            </div>

            {/* Quick amounts */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {[Math.min(50, selected.balance), Math.min(100, selected.balance), selected.balance].filter((v, i, a) => a.indexOf(v) === i).map(a => (
                <button key={a} style={chipS(useAmount === a)} onClick={() => setUseAmount(a)}>
                  {CURRENCY} {a}{a === selected.balance ? ' (tout)' : ''}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...btnSecondary, flex: 1 }} onClick={() => setShowUseModal(false)}>{t('action.cancel')}</button>
              <button style={{ ...btnPrimary, flex: 1 }} onClick={handleUse}>{t('action.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sous-composant ligne info ──
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: mono ? 'var(--fm)' : 'var(--ff)', color: 'var(--text)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}
