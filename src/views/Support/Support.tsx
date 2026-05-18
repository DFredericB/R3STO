import { useState, useRef, useEffect } from 'react'
import { useT } from '../../i18n/useTranslation'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import { RADIUS, GAP, labelStyle, inputStyle, sectionTitle } from '../../utils/design'

// ══════════════════════════════════════════════════
//  R3STO — Support
//  Assistant IA · Vidéos tuto · FAQ · Tickets
// ══════════════════════════════════════════════════

interface Video {
  id: string
  titleKey: string
  dur: string
  module: string
  tags: string[]
  thumb: string
}

interface FAQ {
  qKey: string
  aKey: string
  module: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ── Vidéos tutoriels ──
const VIDEOS: Video[] = [
  { id: 'v1', titleKey: 'support.vid.setup',       dur: '4:32', module: 'salles',       tags: ['setup', 'salles', 'services'],  thumb: '🏗️' },
  { id: 'v2', titleKey: 'support.vid.resas',        dur: '3:18', module: 'reservations', tags: ['réservation', 'book'],          thumb: '📖' },
  { id: 'v3', titleKey: 'support.vid.placement',    dur: '2:45', module: 'reservations', tags: ['ia', 'placement', 'table'],     thumb: '🤖' },
  { id: 'v4', titleKey: 'support.vid.widget',       dur: '5:10', module: 'widget',       tags: ['widget', 'intégration'],        thumb: '🔌' },
  { id: 'v5', titleKey: 'support.vid.waitlist',     dur: '3:02', module: 'waitlist',      tags: ['waitlist', 'attente'],          thumb: '⏳' },
  { id: 'v6', titleKey: 'support.vid.terrasse',     dur: '4:15', module: 'salles',       tags: ['terrasse', 'rapatriement'],     thumb: '☀️' },
  { id: 'v7', titleKey: 'support.vid.clients',      dur: '3:40', module: 'clients',      tags: ['crm', 'fiche', 'client'],       thumb: '👤' },
  { id: 'v8', titleKey: 'support.vid.floorplan',    dur: '6:22', module: 'floorplan',    tags: ['plan', 'éditeur', 'combo'],     thumb: '🗺️' },
  { id: 'v9', titleKey: 'support.vid.stats',        dur: '2:58', module: 'dashboard',    tags: ['tableau', 'stats', 'kpi'],      thumb: '📊' },
  { id: 'v10', titleKey: 'support.vid.multisite',   dur: '4:05', module: 'multisite',    tags: ['multi', 'sites', 'gastro'],     thumb: '🏢' },
]

// ── FAQ ──
const FAQS: FAQ[] = [
  { qKey: 'support.faq.editResa.q',     aKey: 'support.faq.editResa.a',     module: 'reservations' },
  { qKey: 'support.faq.iaRelaxed.q',    aKey: 'support.faq.iaRelaxed.a',    module: 'reservations' },
  { qKey: 'support.faq.addSalle.q',     aKey: 'support.faq.addSalle.a',     module: 'salles' },
  { qKey: 'support.faq.widgetBug.q',    aKey: 'support.faq.widgetBug.a',    module: 'widget' },
  { qKey: 'support.faq.combo.q',        aKey: 'support.faq.combo.a',        module: 'tables' },
  { qKey: 'support.faq.noshow.q',       aKey: 'support.faq.noshow.a',       module: 'clients' },
  { qKey: 'support.faq.fermeture.q',    aKey: 'support.faq.fermeture.a',    module: 'salles' },
  { qKey: 'support.faq.export.q',       aKey: 'support.faq.export.a',       module: 'dashboard' },
]

// ── Quick questions pour le chat ──
const QUICK_Q_KEYS = [
  'support.quick.createResa',
  'support.quick.iaNotWorking',
  'support.quick.configWidget',
  'support.quick.addTable',
  'support.quick.manageNoshows',
]

type SupportTab = 'chat' | 'videos' | 'faq' | 'ticket'

const API = (import.meta as any).env?.VITE_API_BASE || 'https://api.r3sto.com'

export function Support() {
  const { t } = useT()
  const { toast } = useToast()
  const plan = useAppStore(s => s.resto.plan)
  const [tab, setTab] = useState<SupportTab>('chat')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [faqSearch, setFaqSearch] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Formulaire ticket contrôlé ─────────────────────────────
  const [ticketType, setTicketType] = useState('tech')
  const [ticketPrio, setTicketPrio] = useState('normal')
  const [ticketModule, setTicketModule] = useState('Dashboard')
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketDesc, setTicketDesc] = useState('')
  const [ticketSending, setTicketSending] = useState(false)

  const submitTicket = async () => {
    if (!ticketSubject.trim() || !ticketDesc.trim()) {
      toast(t('support.ticket.missing') || 'Sujet et description requis', 'error')
      return
    }
    setTicketSending(true)
    try {
      const token = localStorage.getItem('r3sto-token') || sessionStorage.getItem('r3sto-token') || ''
      const r = await fetch(`${API}/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: ticketType, priority: ticketPrio, module: ticketModule,
          subject: ticketSubject, description: ticketDesc,
          context: { url: window.location.href, userAgent: navigator.userAgent },
        }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      toast(t('support.ticket.sent'), 'success')
      setTicketSubject(''); setTicketDesc('')
    } catch (err) {
      console.error('[Support] ticket submit failed:', err)
      toast('Envoi impossible — votre ticket a été enregistré localement, nous vous recontacterons', 'warning')
      // Buffer local pour ne pas perdre la demande
      try {
        const buf = JSON.parse(localStorage.getItem('r3sto_pending_tickets') || '[]')
        buf.push({
          ts: Date.now(), type: ticketType, priority: ticketPrio, module: ticketModule,
          subject: ticketSubject, description: ticketDesc,
        })
        localStorage.setItem('r3sto_pending_tickets', JSON.stringify(buf))
      } catch {}
      setTicketSubject(''); setTicketDesc('')
    } finally {
      setTicketSending(false)
    }
  }

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory, chatLoading])

  const handleChatSend = (preset?: string) => {
    const msg = preset || inputRef.current?.value || ''
    if (!msg.trim()) return
    if (inputRef.current) inputRef.current.value = ''

    setChatHistory(prev => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)

    // Placeholder AI response — à remplacer par un vrai appel API
    setTimeout(() => {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: t('support.chat.placeholder'),
      }])
      setChatLoading(false)
    }, 800)
  }

  const filteredFaq = faqSearch
    ? FAQS.filter(f => {
        const q = t(f.qKey).toLowerCase()
        const a = t(f.aKey).toLowerCase()
        const s = faqSearch.toLowerCase()
        return q.includes(s) || a.includes(s)
      })
    : FAQS

  const tabs: { id: SupportTab; icon: string; labelKey: string }[] = [
    { id: 'chat',   icon: '💬', labelKey: 'support.tab.chat' },
    { id: 'videos', icon: '🎥', labelKey: 'support.tab.videos' },
    { id: 'faq',    icon: '📚', labelKey: 'support.tab.faq' },
    { id: 'ticket', icon: '🎫', labelKey: 'support.tab.ticket' },
  ]

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Header */}
      <div style={{ paddingBottom: 14, marginBottom: 10 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span>{t('support.title')}</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--t2)' }}>{t('support.subtitle')}</span>
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ padding: '5px 0', display: 'flex', gap: GAP.xs, alignItems: 'center', borderBottom: '1px solid var(--border)', marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            style={{
              fontSize: 11,
              padding: '6px 14px',
              minHeight: 44,
              borderRadius: RADIUS.sm,
              border: 'none',
              background: tab === tb.id ? 'var(--bl)' : 'var(--surf2)',
              color: tab === tb.id ? 'white' : 'var(--text)',
              cursor: 'pointer',
              fontWeight: 700,
              fontFamily: 'var(--ff)',
            }}
          >
            {tb.icon} {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* ═══ CHAT ═══ */}
        {tab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              padding: '8px 12px', borderRadius: 6, marginBottom: 8,
              background: 'rgba(230,130,50,.08)', border: '1px solid rgba(230,130,50,.3)',
              fontSize: 11, color: 'var(--t2)',
            }}>
              ⚠ Assistant IA en démo — les réponses sont génériques tant que le provider n'est pas branché. Pour une vraie question, ouvrez un ticket.
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8, marginBottom: 10 }}>
              {chatHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🤖</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{t('support.chat.title')}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 18, lineHeight: 1.5 }}>{t('support.chat.intro')}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: GAP.sm, justifyContent: 'center' }}>
                    {QUICK_Q_KEYS.map(k => (
                      <button
                        key={k}
                        onClick={() => handleChatSend(t(k))}
                        style={{
                          background: 'var(--surf2)',
                          border: '1px solid var(--border)',
                          borderRadius: RADIUS.pill,
                          padding: '8px 14px',
                          minHeight: 44,
                          fontSize: 11,
                          cursor: 'pointer',
                          color: 'var(--t2)',
                          whiteSpace: 'nowrap',
                          fontFamily: 'var(--ff)',
                        }}
                      >
                        {t(k)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatHistory.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 12, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      background: m.role === 'user' ? 'var(--bl)' : 'rgba(68,128,216,.15)',
                    }}>
                      {m.role === 'user' ? <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>👤</span> : '🤖'}
                    </div>
                    <div style={{
                      maxWidth: '78%',
                      padding: '9px 12px',
                      borderRadius: m.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                      background: m.role === 'user' ? 'var(--bl)' : 'var(--surf2)',
                      border: `1px solid ${m.role === 'user' ? 'var(--bl)' : 'var(--border)'}`,
                    }}>
                      <div style={{ fontSize: 11, lineHeight: 1.55, color: m.role === 'user' ? '#fff' : 'var(--text)' }}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(68,128,216,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
                  <div style={{ padding: '10px 14px', background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '4px 12px 12px 12px' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bl)', animation: `pulse 1s ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: GAP.md, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <input
                ref={inputRef}
                placeholder={t('support.chat.inputPlaceholder')}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                style={{ ...inputStyle, flex: 1, minHeight: 44 }}
              />
              <button
                onClick={() => handleChatSend()}
                style={{
                  padding: '8px 16px', minHeight: 44,
                  borderRadius: RADIUS.sm, border: 'none',
                  background: 'var(--bl)', color: 'white',
                  fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                  fontFamily: 'var(--ff)',
                }}
              >
                {t('support.chat.send')} →
              </button>
              {chatHistory.length > 0 && (
                <button
                  onClick={() => setChatHistory([])}
                  title={t('support.chat.clear')}
                  style={{
                    fontSize: 11, padding: '8px 12px', minHeight: 44,
                    borderRadius: RADIUS.sm,
                    border: '1px solid var(--border)',
                    background: 'var(--surf2)', color: 'var(--text)',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══ VIDEOS ═══ */}
        {tab === 'videos' && (
          <div style={{ paddingRight: 8, overflowY: 'auto' }}>
            <div style={{ ...sectionTitle, color: 'var(--bl)', marginBottom: GAP.lg }}>
              {t('support.vid.recommended')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: GAP.lg }}>
              {VIDEOS.map(v => (
                <div
                  key={v.id}
                  onClick={() => toast('▶ ' + t(v.titleKey), 'success')}
                  style={{
                    background: 'var(--surf2)',
                    border: '1.5px solid var(--border)',
                    borderRadius: RADIUS.lg,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: '.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--bl)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
                >
                  <div style={{ height: 80, background: 'linear-gradient(135deg,rgba(68,128,216,.2),rgba(68,128,216,.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, position: 'relative' }}>
                    {v.thumb}
                    <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 11, fontFamily: 'var(--fm)', fontWeight: 700, background: 'rgba(0,0,0,.5)', color: '#fff', padding: '1px 6px', borderRadius: RADIUS.xs }}>
                      {v.dur}
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', lineHeight: 1.35 }}>
                      {t(v.titleKey)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ FAQ ═══ */}
        {tab === 'faq' && (
          <div style={{ paddingRight: 8, overflowY: 'auto' }}>
            <div style={{ marginBottom: GAP.lg }}>
              <input
                placeholder={t('support.faq.search')}
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                style={{ ...inputStyle, minHeight: 44 }}
              />
            </div>
            <div>
              {filteredFaq.length ? (
                filteredFaq.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--surf2)',
                      border: '1px solid var(--border)',
                      borderRadius: RADIUS.md,
                      marginBottom: GAP.sm,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      style={{
                        padding: '12px 14px', minHeight: 44,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 13, flexShrink: 0 }}>❓</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
                        {t(f.qKey)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--t3)', transform: expandedFaq === i ? 'rotate(90deg)' : 'none', transition: '.15s' }}>›</span>
                    </div>
                    {expandedFaq === i && (
                      <div style={{ padding: '0 14px 12px', fontSize: 11, color: 'var(--t2)', lineHeight: 1.6, borderTop: '1px solid var(--border)' }}>
                        <div style={{ paddingTop: 10 }}>{t(f.aKey)}</div>
                        <button
                          onClick={() => { setTab('chat'); setExpandedFaq(null) }}
                          style={{
                            marginTop: 8, background: 'transparent', border: 'none',
                            fontSize: 11, color: 'var(--bl)', cursor: 'pointer', padding: 0,
                            fontFamily: 'var(--ff)',
                          }}
                        >
                          💬 {t('support.faq.askAssistant')} →
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 11, color: 'var(--t3)', padding: '12px 0' }}>
                  {t('support.faq.noResult')}{' '}
                  <button
                    onClick={() => setTab('chat')}
                    style={{ background: 'none', border: 'none', color: 'var(--bl)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--ff)' }}
                  >
                    {t('support.faq.askAssistant')} →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TICKET ═══ */}
        {tab === 'ticket' && (
          <div style={{ paddingRight: 8, overflowY: 'auto' }}>
            {/* Formulaire */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: RADIUS.md, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🎫 {t('support.ticket.new')}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 14 }}>{t('support.ticket.autoContext')}</div>

              <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: GAP.md }}>
                <div>
                  <label style={labelStyle}>{t('support.ticket.type')}</label>
                  <select value={ticketType} onChange={e => setTicketType(e.target.value)} style={{ ...inputStyle, minHeight: 44 }}>
                    <option value="tech">{t('support.ticket.typeTech')}</option>
                    <option value="usage">{t('support.ticket.typeUsage')}</option>
                    <option value="change">{t('support.ticket.typeChange')}</option>
                    <option value="billing">{t('support.ticket.typeBilling')}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t('support.ticket.priority')}</label>
                  <select value={ticketPrio} onChange={e => setTicketPrio(e.target.value)} style={{ ...inputStyle, minHeight: 44 }}>
                    <option value="normal">{t('support.ticket.prioNormal')}</option>
                    <option value="urgent">{t('support.ticket.prioUrgent')}</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{t('support.ticket.module')}</label>
                <select value={ticketModule} onChange={e => setTicketModule(e.target.value)} style={{ ...inputStyle, minHeight: 44 }}>
                  <option>Dashboard</option>
                  <option>Book / Journal</option>
                  <option>Grille</option>
                  <option>Plan de salle</option>
                  <option>Salles & Services</option>
                  <option>Tables & Combos</option>
                  <option>Clients / CRM</option>
                  <option>Widget</option>
                  <option>Fidélité</option>
                  <option>Bons cadeaux</option>
                  <option>{t('support.ticket.other')}</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{t('support.ticket.subject')} <span style={{ color: 'var(--rd)' }}>*</span></label>
                <input
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  placeholder={t('support.ticket.subjectPlaceholder')}
                  style={{ ...inputStyle, minHeight: 44 }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{t('support.ticket.desc')} <span style={{ color: 'var(--rd)' }}>*</span></label>
                <textarea
                  value={ticketDesc}
                  onChange={e => setTicketDesc(e.target.value)}
                  rows={4}
                  placeholder={t('support.ticket.descPlaceholder')}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>

              <div style={{ background: 'rgba(68,128,216,.06)', border: '1px solid rgba(68,128,216,.2)', borderRadius: RADIUS.md, padding: '9px 12px', marginBottom: 12, fontSize: 11, color: 'var(--t3)' }}>
                ℹ️ {t('support.ticket.contextInfo')}
              </div>

              {/* SLA info */}
              <div style={{ background: 'rgba(60,200,112,.06)', border: '1px solid rgba(60,200,112,.2)', borderRadius: RADIUS.md, padding: '9px 12px', marginBottom: 12, fontSize: 11, color: 'var(--t2)', display: 'flex', gap: GAP.md, flexWrap: 'wrap' }}>
                <span>⏱ {t('support.ticket.sla.' + plan)}</span>
              </div>

              <div style={{ display: 'flex', gap: GAP.md }}>
                <button
                  onClick={() => setTab('chat')}
                  style={{
                    flex: 1, padding: '8px 12px', minHeight: 44,
                    borderRadius: RADIUS.sm,
                    border: '1px solid var(--border)',
                    background: 'var(--surf2)', color: 'var(--text)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'var(--ff)',
                  }}
                >
                  💬 {t('support.ticket.tryChat')}
                </button>
                <button
                  onClick={submitTicket}
                  disabled={ticketSending}
                  style={{
                    flex: 1, padding: '8px 12px', minHeight: 44,
                    borderRadius: RADIUS.sm, border: 'none',
                    background: ticketSending ? 'var(--surf3)' : 'var(--bl)',
                    color: 'white',
                    fontSize: 11, fontWeight: 700,
                    cursor: ticketSending ? 'wait' : 'pointer',
                    fontFamily: 'var(--ff)',
                    opacity: ticketSending ? 0.6 : 1,
                  }}
                >
                  {ticketSending ? '…' : `${t('support.ticket.submit')} ✓`}
                </button>
              </div>
            </div>

            {/* Tickets existants */}
            <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: RADIUS.md, padding: 14, marginTop: GAP.lg }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📋 {t('support.ticket.myTickets')}</div>
              <div style={{
                padding: '10px 12px', borderRadius: RADIUS.sm,
                background: 'var(--gn)20', border: '1px solid var(--gn)',
                color: 'var(--gn)', fontSize: 11, fontWeight: 700,
              }}>
                {t('support.ticket.noTickets')} ✅
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
