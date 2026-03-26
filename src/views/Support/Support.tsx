import { useState } from 'react'
import { useToast } from '../../components/ui/Toast'

interface Video {
  id: string
  title: string
  dur: string
  module: string
  tags: string[]
  thumb: string
}

interface FAQ {
  q: string
  a: string
  module: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const SUPPORT_VIDEOS: Video[] = [
  { id: 'v1', title: 'Première configuration — salles, tables, services', dur: '4:32', module: 'salles', tags: ['setup', 'salles', 'services', 'démarrage'], thumb: '🏗️' },
  { id: 'v2', title: 'Créer et gérer vos réservations', dur: '3:18', module: 'reservations', tags: ['réservation', 'book', 'créer', 'modifier'], thumb: '📖' },
  { id: 'v3', title: 'Comprendre le placement IA', dur: '2:45', module: 'reservations', tags: ['ia', 'placement', 'table', 'algo'], thumb: '🤖' },
  { id: 'v4', title: 'Configurer le widget de réservation en ligne', dur: '5:10', module: 'widget', tags: ['widget', 'site web', 'intégration', 'code'], thumb: '🔌' },
  { id: 'v5', title: 'Gérer la liste d\'attente intelligemment', dur: '3:02', module: 'waitlist', tags: ['waitlist', 'attente', 'placer', 'optimisation'], thumb: '⏳' },
  { id: 'v6', title: 'Règles de flux et rapatriement terrasse', dur: '4:15', module: 'salles', tags: ['flux', 'terrasse', 'rapatriement', 'météo'], thumb: '↩' },
]

const SUPPORT_FAQ: FAQ[] = [
  { q: 'Comment modifier une réservation existante ?', a: 'Dans le Book, cliquez sur la ligne de la réservation pour ouvrir le panneau de modification. Vous pouvez changer l\'heure, la table, le nombre de couverts ou la date directement.', module: 'reservations' },
  { q: 'Pourquoi le placement IA suggère une table trop grande ?', a: 'L\'IA entre en mode "relaxed" quand aucune table adaptée n\'est disponible. Elle vous l\'indique avec un badge orange. Dans ce cas, envisagez la liste d\'attente plutôt que de forcer le placement.', module: 'reservations' },
  { q: 'Comment ajouter une salle à ma configuration ?', a: 'Allez dans Salles & Services → onglet Salles → bouton ➕ Salle. Choisissez le type (intérieure, extérieure, bar, privatisable), la couleur et le comportement par défaut.', module: 'salles' },
  { q: 'Le widget ne s\'affiche pas sur mon site. Que faire ?', a: 'Vérifiez que le script est bien chargé avant le div#r3sto-widget. Assurez-vous que data-resto correspond bien à votre identifiant R3STO. Désactivez temporairement votre bloqueur de pub pour tester.', module: 'widget' },
  { q: 'Comment créer un combo de tables ?', a: 'Dans Tables & Combos, activez le mode Combo (bouton en haut à droite), sélectionnez les tables à combiner, puis cliquez sur "Créer le combo". La capacité est calculée automatiquement +2 places d\'embout.', module: 'tables' },
]

export function Support() {
  const { toast } = useToast()
  const [supportTab, setSupportTab] = useState<'chat' | 'videos' | 'faq' | 'ticket'>('chat')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [faqSearch, setFaqSearch] = useState('')
  const [expandedFaqIdx, setExpandedFaqIdx] = useState<number | null>(null)

  const handleChatSend = (preset?: string) => {
    const input = document.getElementById('support-input') as HTMLInputElement
    const msg = preset || input?.value || ''
    if (!msg.trim()) return

    setChatHistory([...chatHistory, { role: 'user', content: msg }])
    if (input) input.value = ''
    setChatLoading(true)

    setTimeout(() => {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: 'Je vous aide volontiers ! Vous pouvez aussi explorer nos vidéos tutoriels ou la FAQ pour plus de détails.',
      }])
      setChatLoading(false)
    }, 800)
  }

  const filteredFaq = faqSearch
    ? SUPPORT_FAQ.filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()))
    : SUPPORT_FAQ

  const tabLabels: Record<string, string> = {
    chat: '💬 Assistant IA',
    videos: '🎥 Vidéos',
    faq: '📚 FAQ',
    ticket: '🎫 Ticket',
  }

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Header */}
      <div style={{ paddingBottom: 14, marginBottom: 10 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span>Support</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--t2)' }}>Assistant IA · Vidéos · FAQ · Tickets</span>
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ padding: '5px 0', display: 'flex', gap: 4, alignItems: 'center', borderBottom: '1px solid var(--border)', marginBottom: 14, flexWrap: 'wrap' }}>
        {(['chat', 'videos', 'faq', 'ticket'] as const).map(t => (
          <button
            key={t}
            onClick={() => setSupportTab(t)}
            style={{
              fontSize: 11,
              padding: '3px 11px',
              borderRadius: 4,
              border: 'none',
              background: supportTab === t ? 'var(--bl)' : 'var(--surf2)',
              color: supportTab === t ? 'white' : 'var(--text)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {supportTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8, marginBottom: 10 }}>
              {chatHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🤖</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Assistant R3STO</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 18, lineHeight: 1.5 }}>Je connais toute la plateforme.<br />Posez-moi n'importe quelle question.</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                    {['Comment créer une réservation ?', 'Placement IA ne fonctionne pas', 'Configurer mon widget', 'Ajouter une table ou salle', 'Gérer les no-shows'].map(q => (
                      <button
                        key={q}
                        onClick={() => handleChatSend(q)}
                        style={{
                          background: 'var(--surf2)',
                          border: '1px solid var(--border)',
                          borderRadius: 20,
                          padding: '5px 12px',
                          fontSize: 11,
                          cursor: 'pointer',
                          color: 'var(--t2)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatHistory.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 12, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      background: m.role === 'user' ? 'var(--bl)' : 'rgba(68,128,216,.15)',
                    }}>
                      {m.role === 'user' ? <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>LG</span> : '🤖'}
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
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(68,128,216,.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                  }}>
                    🤖
                  </div>
                  <div style={{ padding: '10px 14px', background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '4px 12px 12px 12px' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--bl)',
                          animation: `pulse 1s ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <input
                id="support-input"
                placeholder="Posez votre question…"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'var(--surf2)',
                  color: 'var(--text)',
                  fontSize: 12,
                }}
              />
              <button
                onClick={() => handleChatSend()}
                style={{
                  padding: '6px 14px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'var(--bl)',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Envoyer →
              </button>
              {chatHistory.length > 0 && (
                <button
                  onClick={() => setChatHistory([])}
                  title="Effacer la conversation"
                  style={{
                    fontSize: 11,
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    background: 'var(--surf2)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {supportTab === 'videos' && (
          <div style={{ paddingRight: 8, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--bl)', textTransform: 'uppercase', letterSpacing: '.09em', fontFamily: 'var(--fm)', marginBottom: 10 }}>
              📍 Recommandées pour votre vue actuelle
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {SUPPORT_VIDEOS.map(v => (
                <div
                  key={v.id}
                  onClick={() => toast('▶ ' + v.title, 'success')}
                  style={{
                    background: 'var(--surf2)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 11,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: '.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--bl)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
                >
                  <div style={{ height: 80, background: 'linear-gradient(135deg,rgba(68,128,216,.2),rgba(68,128,216,.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, position: 'relative' }}>
                    {v.thumb}
                    <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 11, fontFamily: 'var(--fm)', fontWeight: 700, background: 'rgba(0,0,0,.5)', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>
                      {v.dur}
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', lineHeight: 1.35 }}>
                      {v.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {supportTab === 'faq' && (
          <div style={{ paddingRight: 8, overflowY: 'auto' }}>
            <div style={{ marginBottom: 12 }}>
              <input
                placeholder="🔍 Rechercher dans la FAQ…"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'var(--surf2)',
                  color: 'var(--text)',
                  fontSize: 12,
                }}
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
                      borderRadius: 9,
                      marginBottom: 6,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      onClick={() => setExpandedFaqIdx(expandedFaqIdx === i ? null : i)}
                      style={{
                        padding: '11px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 13, flexShrink: 0 }}>❓</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
                        {f.q}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--t3)' }}>›</span>
                    </div>
                    {expandedFaqIdx === i && (
                      <div style={{ padding: '0 14px 12px', fontSize: 11, color: 'var(--t2)', lineHeight: 1.6, borderTop: '1px solid var(--border)' }}>
                        <br />
                        {f.a}
                        <br />
                        <button
                          onClick={() => { setSupportTab('chat'); setExpandedFaqIdx(null) }}
                          style={{
                            marginTop: 8,
                            background: 'transparent',
                            border: 'none',
                            fontSize: 11,
                            color: 'var(--bl)',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          💬 Approfondir avec l'assistant →
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 11, color: 'var(--t3)', padding: '12px 0' }}>
                  Aucun résultat —{' '}
                  <button
                    onClick={() => setSupportTab('chat')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--bl)',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    demandez à l'assistant →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {supportTab === 'ticket' && (
          <div style={{ paddingRight: 8, overflowY: 'auto' }}>
            <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🎫 Nouveau ticket</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 14 }}>L'IA a analysé votre contexte pour pré-remplir le formulaire</div>

              <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Type</label>
                  <select style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontSize: 11 }}>
                    <option>Problème technique</option>
                    <option>Question d'utilisation</option>
                    <option>Demande de modification</option>
                    <option>Facturation</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Priorité</label>
                  <select style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontSize: 11 }}>
                    <option>Normale</option>
                    <option>Urgente</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Module concerné</label>
                <select style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontSize: 11 }}>
                  <option>Dashboard</option>
                  <option>Book</option>
                  <option>Grille</option>
                  <option>Plan de salle</option>
                  <option>Salles & Services</option>
                  <option>Tables & Combos</option>
                  <option>Autre</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Sujet</label>
                <input placeholder="Décrivez brièvement votre demande…" style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontSize: 11 }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Description</label>
                <textarea rows={4} placeholder="Comportement observé vs. attendu…" style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontSize: 11, resize: 'vertical' }} />
              </div>

              <div style={{ background: 'rgba(68,128,216,.06)', border: '1px solid rgba(68,128,216,.2)', borderRadius: 8, padding: '9px 12px', marginBottom: 12, fontSize: 11, color: 'var(--t3)' }}>
                ℹ️ Contexte joint automatiquement : vue active · 100 réservations · 42 tables · 3 services actifs
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSupportTab('chat')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    background: 'var(--surf2)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  💬 Essayer l'assistant IA d'abord
                </button>
                <button
                  onClick={() => toast('Ticket envoyé — réponse sous 4h en semaine', 'success')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: 'none',
                    background: 'var(--bl)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Envoyer le ticket ✓
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📋 Mes tickets</div>
              <div style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: 'var(--gn)20',
                border: '1px solid var(--gn)',
                color: 'var(--gn)',
                fontSize: 11,
                fontWeight: 700,
              }}>
                Aucun ticket ouvert — tout va bien ✅
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
