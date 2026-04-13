// ══════════════════════════════════════════════════
//  R3STO — Admin Tickets (Propriétaire / Gérant)
//  Vue de gestion des tickets : liste, filtre, réponse,
//  changement de statut, assignation, KPIs
//  Mobile-friendly : responsive flex/grid
// ══════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import { RADIUS, GAP, FONT, inputStyle, filterChip } from '../../utils/design'
import type { Ticket, TicketMessage, TicketStatus } from '../../types'

// ── Status config ─────────────────────────────────
const STATUS_CONF: Record<TicketStatus, { label: string; color: string; bg: string; icon: string }> = {
  open:       { label: 'Ouvert',  color: 'var(--am)', bg: 'rgba(232,165,48,.12)', icon: '🟡' },
  inprogress: { label: 'En cours', color: 'var(--bl)', bg: 'rgba(68,128,216,.12)', icon: '🔵' },
  resolved:   { label: 'Résolu',  color: 'var(--gn)', bg: 'rgba(60,200,112,.12)', icon: '🟢' },
  closed:     { label: 'Fermé',   color: 'var(--t3)', bg: 'var(--surf3)',          icon: '⚫' },
}

const TYPE_LABELS: Record<string, string> = {
  tech: 'Technique', usage: 'Utilisation', feature: 'Feature', billing: 'Facturation',
}

// ── Shared styles ─────────────────────────────────
const cardS: React.CSSProperties = {
  background: 'var(--surf)', border: '1px solid var(--border)',
  borderRadius: RADIUS.md, padding: 16,
}
const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: RADIUS.sm,
  background: 'var(--bl)', color: '#fff', border: 'none',
  fontWeight: 700, fontSize: FONT.sm, cursor: 'pointer', fontFamily: 'var(--ff)',
}
const btnSecondary: React.CSSProperties = {
  padding: '6px 12px', borderRadius: RADIUS.sm,
  background: 'var(--surf3)', color: 'var(--text)', border: '1px solid var(--border)',
  fontWeight: 600, fontSize: FONT.sm, cursor: 'pointer', fontFamily: 'var(--ff)',
}

// ══════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════

export function AdminTickets() {
  const { toast } = useToast()
  const tickets = [] as any[]
  const updateTicket = (_id: any, _u: any) => {}
  const addTicketMessage = (_id: any, _m: any) => {}
  const deleteTicket = (_id: any) => {}
  const restoName = useAppStore(s => s.resto.name)

  // Filters
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all')
  const [filterPrio, setFilterPrio] = useState<'all' | 'normal' | 'urgent'>('all')
  const [search, setSearch] = useState('')

  // Selected ticket
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')

  // ── Filtered tickets ──
  const filtered = useMemo(() => {
    let result = [...tickets]
    if (filterStatus !== 'all') result = result.filter(t => t.status === filterStatus)
    if (filterPrio !== 'all') result = result.filter(t => t.priority === filterPrio)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.subject.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.module.toLowerCase().includes(q)
      )
    }
    // Sort: urgent first, then by updatedAt desc
    result.sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1
      return b.updatedAt - a.updatedAt
    })
    return result
  }, [tickets, filterStatus, filterPrio, search])

  const active = useMemo(() => tickets.find(t => t.id === selectedId) || null, [tickets, selectedId])

  // ── KPIs ──
  const kpiOpen = tickets.filter(t => t.status === 'open').length
  const kpiInProgress = tickets.filter(t => t.status === 'inprogress').length
  const kpiResolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
  const kpiUrgent = tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed' && t.status !== 'resolved').length
  const avgRating = (() => {
    const rated = tickets.filter(t => t.rating)
    if (rated.length === 0) return '–'
    return (rated.reduce((s, t) => s + (t.rating || 0), 0) / rated.length).toFixed(1)
  })()

  // ── Reply as admin ──
  function handleAdminReply() {
    if (!active || !replyInput.trim()) return
    const msg: TicketMessage = {
      id: `m-${Date.now()}`,
      role: 'admin',
      content: replyInput.trim(),
      ts: Date.now(),
      by: 'Support R3STO',
    }
    addTicketMessage(active.id, msg)
    // Auto-move to inprogress if open
    if (active.status === 'open') updateTicket(active.id, { status: 'inprogress' })
    setReplyInput('')
    toast('Réponse envoyée', 'success')
  }

  // ── Change status ──
  function changeStatus(id: string, status: TicketStatus) {
    const patch: Partial<Ticket> = { status }
    if (status === 'resolved') patch.resolvedAt = Date.now()
    updateTicket(id, patch)
    toast(`Ticket → ${STATUS_CONF[status].label}`, 'success')
  }

  // ══════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hh))',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: GAP.md }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0 }}>🎫 Tickets</h2>
            <p style={{ fontSize: FONT.sm, color: 'var(--t2)', margin: '4px 0 0 0' }}>
              {restoName || 'R3STO'} · Gestion des demandes client
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: GAP.md, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Ouverts', value: kpiOpen, color: 'var(--am)' },
            { label: 'En cours', value: kpiInProgress, color: 'var(--bl)' },
            { label: 'Résolus', value: kpiResolved, color: 'var(--gn)' },
            { label: 'Urgents', value: kpiUrgent, color: 'var(--rd)' },
            { label: 'Note moy.', value: avgRating, color: 'var(--am)' },
          ].map(k => (
            <div key={k.label} style={{
              ...cardS, padding: '10px 14px', flex: '1 1 100px', minWidth: 100,
              borderLeft: `3px solid ${k.color}`,
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: FONT.xs, color: 'var(--t3)', fontWeight: 600 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: GAP.sm, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
          <input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: 180, padding: '6px 10px', fontSize: FONT.sm }}
          />
          {(['all', 'open', 'inprogress', 'resolved', 'closed'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              ...filterChip(filterStatus === s), fontSize: FONT.xs, padding: '4px 10px',
            }}>
              {s === 'all' ? 'Tous' : STATUS_CONF[s].icon + ' ' + STATUS_CONF[s].label}
            </button>
          ))}
          <button onClick={() => setFilterPrio(filterPrio === 'urgent' ? 'all' : 'urgent')} style={{
            ...filterChip(filterPrio === 'urgent'), fontSize: FONT.xs, padding: '4px 10px',
            ...(filterPrio === 'urgent' ? { background: 'rgba(220,80,80,.12)', color: 'var(--rd)', borderColor: 'var(--rd)' } : {}),
          }}>
            🔴 Urgent
          </button>
        </div>
      </div>

      {/* ── Content: list + detail split ── */}
      <div style={{
        flex: 1, display: 'flex', overflow: 'hidden',
      }}>
        {/* LEFT: ticket list */}
        <div style={{
          width: active ? '35%' : '100%', minWidth: active ? 260 : undefined,
          borderRight: active ? '1px solid var(--border)' : 'none',
          overflowY: 'auto', padding: '10px 12px',
          scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
          transition: 'width .2s',
          display: active && window.innerWidth < 700 ? 'none' : 'block',
        }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--t3)', fontSize: FONT.md }}>
              {tickets.length === 0 ? 'Aucun ticket' : 'Aucun résultat pour ce filtre'}
            </div>
          )}
          {filtered.map(t => {
            const sc = STATUS_CONF[t.status]
            const isActive = t.id === selectedId
            return (
              <div
                key={t.id}
                onClick={() => { setSelectedId(t.id); setReplyInput('') }}
                style={{
                  padding: '10px 12px', marginBottom: 6,
                  borderRadius: RADIUS.sm, cursor: 'pointer',
                  background: isActive ? 'var(--surf3)' : 'transparent',
                  borderLeft: `3px solid ${t.priority === 'urgent' ? 'var(--rd)' : sc.color}`,
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surf2)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--bl)' }}>{t.id}</span>
                  <span style={{ padding: '1px 6px', borderRadius: RADIUS.pill, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.label}</span>
                  {t.priority === 'urgent' && <span style={{ fontSize: 10, color: 'var(--rd)', fontWeight: 700 }}>🔴</span>}
                </div>
                <div style={{ fontSize: FONT.sm, fontWeight: 700, color: 'var(--text)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.subject}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>
                  {new Date(t.updatedAt).toLocaleString('fr-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {t.messages.length} msg · {TYPE_LABELS[t.type] || t.type}
                </div>
              </div>
            )
          })}
        </div>

        {/* RIGHT: ticket detail */}
        {active && (
          <div style={{
            flex: 1, minWidth: 0, overflowY: 'auto', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: GAP.lg,
            scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
          }}>
            {/* Mobile back */}
            {window.innerWidth < 700 && (
              <button onClick={() => setSelectedId(null)} style={{ ...btnSecondary, alignSelf: 'flex-start', fontSize: FONT.xs, padding: '5px 10px' }}>← Retour</button>
            )}

            {/* Ticket header */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--bl)', fontSize: FONT.md }}>{active.id}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: RADIUS.pill, fontSize: FONT.xs, fontWeight: 700,
                  background: STATUS_CONF[active.status].bg, color: STATUS_CONF[active.status].color,
                }}>{STATUS_CONF[active.status].label}</span>
                {active.priority === 'urgent' && <span style={{ padding: '2px 8px', borderRadius: RADIUS.pill, fontSize: FONT.xs, fontWeight: 700, background: 'rgba(220,80,80,.12)', color: 'var(--rd)' }}>Urgent</span>}
                <span style={{ padding: '2px 8px', borderRadius: RADIUS.pill, fontSize: FONT.xs, fontWeight: 600, background: 'var(--surf3)', color: 'var(--t3)' }}>{TYPE_LABELS[active.type] || active.type}</span>
                <span style={{ padding: '2px 8px', borderRadius: RADIUS.pill, fontSize: FONT.xs, fontWeight: 600, background: 'var(--surf3)', color: 'var(--t3)' }}>{active.module}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>{active.subject}</div>
              <div style={{ fontSize: FONT.xs, color: 'var(--t3)', marginTop: 3 }}>
                Créé {new Date(active.createdAt).toLocaleString('fr-CH')} · Plan {active.plan} · {active.messages.length} message{active.messages.length > 1 ? 's' : ''}
              </div>
            </div>

            {/* Actions bar */}
            <div style={{ display: 'flex', gap: GAP.sm, flexWrap: 'wrap' }}>
              {active.status === 'open' && (
                <button onClick={() => changeStatus(active.id, 'inprogress')} style={{ ...btnSecondary, borderColor: 'var(--bl)', color: 'var(--bl)' }}>
                  🔵 Prendre en charge
                </button>
              )}
              {(active.status === 'open' || active.status === 'inprogress') && (
                <button onClick={() => changeStatus(active.id, 'resolved')} style={{ ...btnSecondary, borderColor: 'var(--gn)', color: 'var(--gn)' }}>
                  ✅ Marquer résolu
                </button>
              )}
              {active.status === 'resolved' && (
                <button onClick={() => changeStatus(active.id, 'closed')} style={{ ...btnSecondary, borderColor: 'var(--t3)', color: 'var(--t3)' }}>
                  Fermer
                </button>
              )}
              {active.status !== 'closed' && active.status !== 'open' && (
                <button onClick={() => changeStatus(active.id, 'open')} style={{ ...btnSecondary, borderColor: 'var(--am)', color: 'var(--am)' }}>
                  Ré-ouvrir
                </button>
              )}
              <button onClick={() => {
                if (confirm(`Supprimer le ticket ${active.id} ?`)) {
                  deleteTicket(active.id)
                  setSelectedId(null)
                  toast('Ticket supprimé', 'success')
                }
              }} style={{ ...btnSecondary, borderColor: 'var(--rd)', color: 'var(--rd)', marginLeft: 'auto' }}>
                Supprimer
              </button>
            </div>

            {/* Conversation */}
            <div style={{ ...cardS, padding: 0, overflow: 'hidden', flex: 1, minHeight: 200 }}>
              <div style={{ maxHeight: 400, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
                {active.messages.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', gap: 8,
                    flexDirection: m.role === 'client' ? 'row' : 'row-reverse',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                      background: m.role === 'admin' ? 'var(--bl)' : 'rgba(232,165,48,.15)',
                    }}>
                      {m.role === 'admin' ? <span style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>A</span> : '👤'}
                    </div>
                    <div style={{
                      maxWidth: '80%', padding: '7px 11px',
                      borderRadius: m.role === 'admin' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                      background: m.role === 'admin' ? 'var(--bl)' : 'var(--surf2)',
                      border: `1px solid ${m.role === 'admin' ? 'var(--bl)' : 'var(--border)'}`,
                    }}>
                      {m.by && <div style={{ fontSize: 10, fontWeight: 700, color: m.role === 'admin' ? 'rgba(255,255,255,.7)' : 'var(--bl)', marginBottom: 2 }}>{m.by}</div>}
                      <div style={{ fontSize: FONT.sm, lineHeight: 1.5, color: m.role === 'admin' ? '#fff' : 'var(--text)', whiteSpace: 'pre-line' }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize: 10, color: m.role === 'admin' ? 'rgba(255,255,255,.45)' : 'var(--t4)', marginTop: 2 }}>
                        {new Date(m.ts).toLocaleString('fr-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin reply bar */}
              {active.status !== 'closed' && (
                <div style={{ display: 'flex', gap: GAP.sm, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                  <input
                    value={replyInput}
                    onChange={e => setReplyInput(e.target.value)}
                    placeholder="Répondre au client…"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdminReply() } }}
                    style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: FONT.sm }}
                  />
                  <button onClick={handleAdminReply} style={btnPrimary}>Envoyer</button>
                </div>
              )}
            </div>

            {/* Context / meta */}
            <div style={{ ...cardS, padding: '10px 14px', background: 'rgba(68,128,216,.04)', borderLeft: '3px solid var(--bl)' }}>
              <div style={{ fontSize: FONT.xs, fontWeight: 700, color: 'var(--bl)', marginBottom: 4 }}>Contexte technique</div>
              <div style={{ fontSize: 10, color: 'var(--t4)', lineHeight: 1.6, fontFamily: 'var(--fm)' }}>
                Plan : {active.plan}<br />
                Module : {active.module}<br />
                UA : {active.userAgent ? active.userAgent.slice(0, 80) + '…' : '–'}<br />
                {active.rating ? `Note client : ${'⭐'.repeat(active.rating)}` : ''}
                {active.resolvedAt ? `\nRésolu le ${new Date(active.resolvedAt).toLocaleString('fr-CH')}` : ''}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
