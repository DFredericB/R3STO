// ══════════════════════════════════════════════════
//  R3STO — Vue Newsletter (UPGRADED)
//  Campagnes emailing : creation, templates, block editor, preview, stats
//  Connecte a POST /newsletter/campaigns, /send, /test, etc.
// ══════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo} from 'react'
import { getToken } from '../../auth/useAuth'
import { RADIUS, inputStyle, labelStyle } from '../../utils/design'
import { useToast } from '../../components/ui/Toast'

const API = (import.meta as any).env?.VITE_API_BASE || 'https://api.r3sto.ch/api'

interface Campaign {
  id: number
  name: string
  subject: string
  from_name: string
  from_email: string
  html_body: string
  text_body: string | null
  segment_json: string | null
  status: 'draft' | 'sending' | 'sent' | 'cancelled'
  recipients_ct: number
  sent_ct: number
  failed_ct: number
  sent_at: string | null
  created_at: string
}

interface EmailBlock {
  id: string
  type: 'header' | 'text' | 'button' | 'image' | 'divider' | 'social'
  data: Record<string, any>
}

interface EmailTemplate {
  name: string
  subject: string
  blocks: EmailBlock[]
}

interface Segment {
  type: 'all' | 'canton' | 'status' | 'email_only'
  cantons?: string[]
  statuses?: string[]
}

const TEMPLATES: EmailTemplate[] = [
  {
    name: 'Promo du mois',
    subject: 'Decouvrez nos dernieres promotions',
    blocks: [
      { id: '1', type: 'header', data: { title: 'Bonjour {{prenom}} !' } },
      { id: '2', type: 'text', data: { text: 'Nous sommes ravis de vous presenter nos meilleures offres ce mois-ci.' } },
      { id: '3', type: 'button', data: { label: 'Voir les promotions', url: 'https://r3sto.ch/promos', color: '#FF6B35' } },
      { id: '4', type: 'divider', data: {} },
      { id: '5', type: 'social', data: { instagram: 'https://instagram.com/r3sto', facebook: 'https://facebook.com/r3sto', website: 'https://r3sto.ch' } },
    ],
  },
  {
    name: 'Nouveau menu',
    subject: 'Decouvrez notre nouveau menu',
    blocks: [
      { id: '1', type: 'header', data: { title: 'Nouveautes au menu !', subtitle: 'Saveurs et inspirations fraiches' } },
      { id: '2', type: 'image', data: { url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600', alt: 'Plats du nouveau menu' } },
      { id: '3', type: 'text', data: { text: 'Notre chef a cree des plats exceptionnels qui raviront vos papilles. Venez les decouvrir en exclusivite !' } },
      { id: '4', type: 'button', data: { label: 'Consulter le menu', url: 'https://r3sto.ch/menu', color: '#4A90E2' } },
      { id: '5', type: 'social', data: { instagram: 'https://instagram.com/r3sto', facebook: 'https://facebook.com/r3sto', website: 'https://r3sto.ch' } },
    ],
  },
  {
    name: 'Evenement special',
    subject: 'Nous vous invitons a un evenement unique',
    blocks: [
      { id: '1', type: 'header', data: { title: 'Soiree speciale', subtitle: 'Une experience inoubliable vous attend' } },
      { id: '2', type: 'text', data: { text: 'Rejoignez-nous pour une soiree festive avec musique live, animations et mets delicieux. Vous et vos amis sont invites !' } },
      { id: '3', type: 'button', data: { label: 'Reserver votre place', url: 'https://r3sto.ch/events', color: '#FF6B35' } },
      { id: '4', type: 'divider', data: {} },
      { id: '5', type: 'social', data: { instagram: 'https://instagram.com/r3sto', facebook: 'https://facebook.com/r3sto', website: 'https://r3sto.ch' } },
    ],
  },
  {
    name: 'Rappel reservation',
    subject: 'Confirmez votre reservation',
    blocks: [
      { id: '1', type: 'header', data: { title: 'Bonjour {{prenom}},' } },
      { id: '2', type: 'text', data: { text: 'Nous vous rappelons que vous avez une reservation a {{company}}. Confirmez ou modifiez votre reservation si necessaire.' } },
      { id: '3', type: 'button', data: { label: 'Gerer ma reservation', url: 'https://booking.r3sto.ch', color: '#4A90E2' } },
      { id: '4', type: 'text', data: { text: 'Nous avons hate de vous accueillir !' } },
      { id: '5', type: 'social', data: { instagram: 'https://instagram.com/r3sto', facebook: 'https://facebook.com/r3sto', website: 'https://r3sto.ch' } },
    ],
  },
  {
    name: 'Bienvenue',
    subject: 'Bienvenue dans notre newsletter R3STO',
    blocks: [
      { id: '1', type: 'header', data: { title: 'Bienvenue {{prenom}} !' } },
      { id: '2', type: 'text', data: { text: 'Merci de vous etre abonne a notre newsletter. Vous recevrez desormais les dernieres actualites, promotions et offres exclusives de R3STO.' } },
      { id: '3', type: 'button', data: { label: 'Visiter notre site', url: 'https://r3sto.ch', color: '#4A90E2' } },
      { id: '4', type: 'divider', data: {} },
      { id: '5', type: 'social', data: { instagram: 'https://instagram.com/r3sto', facebook: 'https://facebook.com/r3sto', website: 'https://r3sto.ch' } },
    ],
  },
]

const cardS: React.CSSProperties = {
  background: 'var(--surf)', border: '1px solid var(--border)',
  borderRadius: RADIUS.md, padding: 14,
}
const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: RADIUS.sm,
  background: 'var(--bl)', color: '#fff', border: 'none',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)',
}
const btnSecondary: React.CSSProperties = {
  ...btnPrimary, background: 'var(--surf3)', color: 'var(--t2)',
  border: '1px solid var(--border)',
}
const btnSmall: React.CSSProperties = {
  padding: '4px 8px', borderRadius: RADIUS.sm,
  background: 'var(--surf3)', color: 'var(--t2)',
  border: '1px solid var(--border)', fontWeight: 600, fontSize: 10, cursor: 'pointer', fontFamily: 'var(--ff)',
}

async function apiFetch(path: string, opts?: RequestInit) {
  const token = getToken()
  const r = await fetch('' + API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(opts?.headers || {}),
    },
  })
  return r.json()
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  draft: { label: 'Brouillon', color: 'var(--t3)', bg: 'var(--surf3)', icon: '📝' },
  sending: { label: 'En cours', color: 'var(--am)', bg: 'var(--ap)', icon: '📤' },
  sent: { label: 'Envoyee', color: 'var(--gn)', bg: 'var(--gp)', icon: '✅' },
  cancelled: { label: 'Annulee', color: 'var(--rd)', bg: 'var(--rp)', icon: '🚫' },
}

function blockToHtml(block: EmailBlock): string {
  const baseStyle = 'margin: 0; padding: 12px 0; font-family: var(--ff); line-height: 1.5;'
  switch (block.type) {
    case 'header':
      return (
        '<div style="' + baseStyle + ' border-bottom: 2px solid #ddd; padding-bottom: 16px; margin-bottom: 16px;">' +
        '<h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #333;">' + (block.data.title || '') + '</h1>' +
        (block.data.subtitle ? '<p style="margin: 4px 0 0; font-size: 14px; color: #666;">' + block.data.subtitle + '</p>' : '') +
        '</div>'
      )
    case 'text':
      return '<p style="' + baseStyle + ' color: #333; font-size: 14px;">' + (block.data.text || '').replace(/\n/g, '<br/>') + '</p>'
    case 'button':
      const buttonColor = block.data.color || '#4A90E2'
      return (
        '<div style="' + baseStyle + ' text-align: center; margin: 16px 0;">' +
        '<a href="' + (block.data.url || '#') + '" style="display: inline-block; padding: 12px 24px; background: ' + buttonColor + '; color: white; text-decoration: none; border-radius: 4px; font-weight: 700; font-size: 14px;">' + (block.data.label || 'CTA') + '</a>' +
        '</div>'
      )
    case 'image':
      return '<div style="' + baseStyle + ' text-align: center; margin: 16px 0;"><img src="' + (block.data.url || '') + '" alt="' + (block.data.alt || 'image') + '" style="max-width: 100%; height: auto; border-radius: 4px;"/></div>'
    case 'divider':
      return '<hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0; padding: 0;"/>'
    case 'social':
      let socialHtml = '<div style="' + baseStyle + ' text-align: center; margin: 16px 0;">'
      if (block.data.instagram) socialHtml += '<a href="' + block.data.instagram + '" style="display: inline-block; margin: 0 8px; text-decoration: none; color: #E4405F; font-weight: 600;">Instagram</a>'
      if (block.data.facebook) socialHtml += '<a href="' + block.data.facebook + '" style="display: inline-block; margin: 0 8px; text-decoration: none; color: #1877F2; font-weight: 600;">Facebook</a>'
      if (block.data.website) socialHtml += '<a href="' + block.data.website + '" style="display: inline-block; margin: 0 8px; text-decoration: none; color: #4A90E2; font-weight: 600;">Website</a>'
      socialHtml += '</div>'
      return socialHtml
    default:
      return ''
  }
}

function BlockCard({ block, onUpdate, onMoveUp, onMoveDown, onDelete, canMoveUp, canMoveDown, activeBlockId, onActivate }: any) {
  const isActive = activeBlockId === block.id
  return (
    <div style={{
      ...cardS,
      marginBottom: 8,
      padding: 12,
      background: isActive ? 'var(--surf3)' : 'var(--surf)',
      borderLeft: isActive ? '3px solid var(--bl)' : 'none',
    }} onClick={() => onActivate(block.id)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>
          {block.type === 'header' && '📌 Header'}
          {block.type === 'text' && '📝 Texte'}
          {block.type === 'button' && '🔘 Bouton'}
          {block.type === 'image' && '🖼️ Image'}
          {block.type === 'divider' && '─ Separateur'}
          {block.type === 'social' && '🔗 Reseaux'}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {canMoveUp && <button style={btnSmall} onClick={onMoveUp}>↑</button>}
          {canMoveDown && <button style={btnSmall} onClick={onMoveDown}>↓</button>}
          <button style={{ ...btnSmall, color: 'var(--rd)' }} onClick={onDelete}>✕</button>
        </div>
      </div>

      {block.type === 'header' && (
        <div>
          <label style={{ ...labelStyle, marginTop: 8 }}>Titre</label>
          <input
            value={block.data.title || ''}
            onChange={e => onUpdate({ ...block.data, title: e.target.value })}
            placeholder="Titre du header"
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <label style={{ ...labelStyle, marginTop: 8 }}>Sous-titre (optionnel)</label>
          <input
            value={block.data.subtitle || ''}
            onChange={e => onUpdate({ ...block.data, subtitle: e.target.value })}
            placeholder="Sous-titre"
            style={inputStyle}
          />
        </div>
      )}

      {block.type === 'text' && (
        <div>
          <label style={{ ...labelStyle, marginTop: 8 }}>Texte</label>
          <textarea
            value={block.data.text || ''}
            onChange={e => onUpdate({ ...block.data, text: e.target.value })}
            placeholder="Contenu du paragraphe..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      )}

      {block.type === 'button' && (
        <div>
          <label style={{ ...labelStyle, marginTop: 8 }}>Texte du bouton</label>
          <input
            value={block.data.label || ''}
            onChange={e => onUpdate({ ...block.data, label: e.target.value })}
            placeholder="Cliquez ici"
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <label style={{ ...labelStyle, marginTop: 8 }}>URL</label>
          <input
            value={block.data.url || ''}
            onChange={e => onUpdate({ ...block.data, url: e.target.value })}
            placeholder="https://..."
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <label style={{ ...labelStyle, marginTop: 8 }}>Couleur</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="color"
              value={block.data.color || '#4A90E2'}
              onChange={e => onUpdate({ ...block.data, color: e.target.value })}
              style={{ width: 50, height: 30, border: '1px solid var(--border)', borderRadius: RADIUS.sm, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>{block.data.color || '#4A90E2'}</span>
          </div>
        </div>
      )}

      {block.type === 'image' && (
        <div>
          <label style={{ ...labelStyle, marginTop: 8 }}>URL de l\'image</label>
          <input
            value={block.data.url || ''}
            onChange={e => onUpdate({ ...block.data, url: e.target.value })}
            placeholder="https://..."
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <label style={{ ...labelStyle, marginTop: 8 }}>Texte alternatif</label>
          <input
            value={block.data.alt || ''}
            onChange={e => onUpdate({ ...block.data, alt: e.target.value })}
            placeholder="Description de l'image"
            style={inputStyle}
          />
        </div>
      )}

      {block.type === 'social' && (
        <div>
          <label style={{ ...labelStyle, marginTop: 8 }}>Lien Instagram</label>
          <input
            value={block.data.instagram || ''}
            onChange={e => onUpdate({ ...block.data, instagram: e.target.value })}
            placeholder="https://instagram.com/..."
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <label style={{ ...labelStyle, marginTop: 8 }}>Lien Facebook</label>
          <input
            value={block.data.facebook || ''}
            onChange={e => onUpdate({ ...block.data, facebook: e.target.value })}
            placeholder="https://facebook.com/..."
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <label style={{ ...labelStyle, marginTop: 8 }}>Lien Website</label>
          <input
            value={block.data.website || ''}
            onChange={e => onUpdate({ ...block.data, website: e.target.value })}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════
export function Newsletter() {
  const { toast } = useToast()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editing, setEditing] = useState<Partial<Campaign> | null>(null)
  const [blocks, setBlocks] = useState<EmailBlock[]>([])
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [showTest, setShowTest] = useState<number | null>(null)
  const [segment, setSegment] = useState<Segment>({ type: 'all' })
  const [_selectedCantons, setSelectedCantons] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [viewingStats, setViewingStats] = useState<Campaign | null>(null)

  // ── Fetch campaigns ──
  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/newsletter/campaigns')
      if (data.ok) setCampaigns(data.campaigns || [])
    } catch (e) {
      console.error('Newsletter fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  // ── Compile blocks to HTML ──
  const compiledHtml = useMemo(() => {
    return blocks.map(b => blockToHtml(b)).join('')
  }, [blocks])

  // ── Create/Update campaign ──
  const saveCampaign = async () => {
    if (!editing) return
    try {
      const isNew = !editing.id
      const method = isNew ? 'POST' : 'PATCH'
      const url = isNew ? '/newsletter/campaigns' : '/newsletter/campaigns/' + editing.id
      const payload = {
        ...editing,
        html_body: compiledHtml,
        segment_json: JSON.stringify(segment),
      }
      const data = await apiFetch(url, { method, body: JSON.stringify(payload) })
      if (data.ok) {
        toast(isNew ? 'Campagne creee' : 'Campagne mise a jour')
        setShowEditor(false)
        setEditing(null)
        setBlocks([])
        fetchCampaigns()
      } else {
        toast(data.error || 'Erreur')
      }
    } catch { toast('Erreur reseau') }
  }

  // ── Send campaign ──
  const sendCampaign = async (id: number) => {
    if (!confirm('Envoyer cette campagne a tous les contacts avec email ?')) return
    setSending(true)
    try {
      const data = await apiFetch('/newsletter/campaigns/' + id + '/send', { method: 'POST' })
      if (data.ok) {
        toast('Envoi lance ! ' + (data.sent || 0) + ' emails')
        fetchCampaigns()
      } else {
        toast(data.error || 'Erreur envoi')
      }
    } catch { toast('Erreur reseau') }
    finally { setSending(false) }
  }

  // ── Test email ──
  const sendTest = async (campaignId: number) => {
    if (!testEmail) return
    try {
      const data = await apiFetch('/newsletter/test', {
        method: 'POST',
        body: JSON.stringify({ campaignId, email: testEmail }),
      })
      if (data.ok) {
        toast('Email test envoye !')
        setShowTest(null)
        setTestEmail('')
      } else {
        toast(data.error || 'Erreur')
      }
    } catch { toast('Erreur reseau') }
  }

  // ── New campaign ──
  const newCampaign = () => {
    setEditing({
      name: '',
      subject: '',
      from_name: 'R3STO',
      from_email: 'contact@r3sto.ch',
      html_body: '',
      text_body: '',
      segment_json: null,
    })
    setBlocks([])
    setSegment({ type: 'all' })
    setSelectedCantons([])
    setSelectedStatuses([])
    setShowEditor(true)
  }

  const editCampaign = (c: Campaign) => {
    setEditing({ ...c })
    try {
      const parsed = c.segment_json ? JSON.parse(c.segment_json) : { type: 'all' }
      setSegment(parsed)
      setSelectedCantons(parsed.cantons || [])
      setSelectedStatuses(parsed.statuses || [])
    } catch {
      setSegment({ type: 'all' })
      setSelectedCantons([])
      setSelectedStatuses([])
    }
    setBlocks([])
    setShowEditor(true)
  }

  const loadTemplate = (template: EmailTemplate) => {
    setBlocks(template.blocks.map(b => ({ ...b, id: Math.random().toString() })))
    setEditing(f => f ? { ...f, subject: template.subject } : f)
    toast('Template chargee')
  }

  const addBlock = (type: EmailBlock['type']) => {
    const newBlock: EmailBlock = {
      id: Math.random().toString(),
      type,
      data: type === 'header' ? { title: '', subtitle: '' } :
            type === 'text' ? { text: '' } :
            type === 'button' ? { label: 'CTA', url: '', color: '#4A90E2' } :
            type === 'image' ? { url: '', alt: '' } :
            type === 'social' ? { instagram: '', facebook: '', website: '' } :
            {},
    }
    setBlocks([...blocks, newBlock])
    setActiveBlockId(newBlock.id)
  }

  const updateBlock = (blockId: string, data: Record<string, any>) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, data } : b))
  }

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === blockId)
    if ((direction === 'up' && idx > 0) || (direction === 'down' && idx < blocks.length - 1)) {
      const newBlocks = [...blocks]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      ;[newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]]
      setBlocks(newBlocks)
    }
  }

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId))
    if (activeBlockId === blockId) setActiveBlockId(null)
  }

  const insertVariable = (variable: string) => {
    if (!activeBlockId) {
      toast('Selectionnez un bloc texte')
      return
    }
    const block = blocks.find(b => b.id === activeBlockId)
    if (block && (block.type === 'text' || block.type === 'header')) {
      const field = block.type === 'header' ? 'title' : 'text'
      updateBlock(activeBlockId, { ...block.data, [field]: (block.data[field] || '') + ' {{' + variable + '}}' })
    }
  }

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'var(--ff)' }}>
            Newsletter
          </h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0', fontFamily: 'var(--ff)' }}>
            Campagnes emailing - Editeur par blocs - Templates
          </p>
        </div>
        <button style={btnPrimary} onClick={newCampaign}>+ Nouvelle campagne</button>
      </div>

      {/* Stats summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'CAMPAGNES', value: campaigns.length, color: 'var(--bl)' },
          { label: 'ENVOYEES', value: campaigns.filter(c => c.status === 'sent').length, color: 'var(--gn)' },
          { label: 'BROUILLONS', value: campaigns.filter(c => c.status === 'draft').length, color: 'var(--am)' },
          { label: 'EMAILS ENVOYES', value: campaigns.reduce((s, c) => s + (c.sent_ct || 0), 0), color: 'var(--bl)' },
        ].map(s => (
          <div key={s.label} style={{ ...cardS, textAlign: 'center', flex: '1 1 130px', minWidth: 110 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value.toLocaleString()}</div>
            <div style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 700, letterSpacing: '.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && <div style={{ ...cardS, textAlign: 'center', color: 'var(--t3)', padding: 40 }}>Chargement...</div>}
        {!loading && campaigns.length === 0 && (
          <div style={{ ...cardS, textAlign: 'center', color: 'var(--t4)', padding: 40 }}>
            Aucune campagne. Cliquez sur &quot;+ Nouvelle campagne&quot; pour commencer.
          </div>
        )}
        {!loading && campaigns.map(c => {
          const meta = STATUS_META[c.status] || STATUS_META.draft
          return (
            <div key={c.id} style={{ ...cardS, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 24 }}>{meta.icon}</div>
              <div style={{ flex: '1 1 200px', minWidth: 150 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{c.name || '(sans nom)'}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                  {c.subject && <span>Sujet : {c.subject}</span>}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>
                  Cree le {new Date(c.created_at).toLocaleDateString('fr-CH')}
                  {c.sent_at && (' - Envoye le ' + new Date(c.sent_at).toLocaleDateString('fr-CH'))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                  background: meta.bg, color: meta.color,
                }}>{meta.label}</span>
                {c.status === 'sent' && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gn)' }}>{c.sent_ct}</div>
                    <div style={{ fontSize: 8, color: 'var(--t4)', fontWeight: 600 }}>ENVOYES</div>
                  </div>
                )}
                {c.status === 'sent' && c.failed_ct > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--rd)' }}>{c.failed_ct}</div>
                    <div style={{ fontSize: 8, color: 'var(--t4)', fontWeight: 600 }}>ECHECS</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                <button style={{ ...btnSecondary, padding: '5px 10px', fontSize: 11 }} onClick={() => editCampaign(c)}>Modifier</button>
                {c.status === 'sent' && (
                  <button style={{ ...btnSecondary, padding: '5px 10px', fontSize: 11 }} onClick={() => setViewingStats(c)}>Stats</button>
                )}
                {c.status === 'draft' && (
                  <>
                    <button
                      style={{ ...btnSecondary, padding: '5px 10px', fontSize: 11 }}
                      onClick={() => { setShowTest(c.id); setTestEmail('') }}
                    >Test</button>
                    <button
                      style={{ ...btnPrimary, padding: '5px 10px', fontSize: 11, opacity: sending ? 0.5 : 1 }}
                      onClick={() => sendCampaign(c.id)}
                      disabled={sending}
                    >Envoyer</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats Modal */}
      {viewingStats && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setViewingStats(null)}>
          <div style={{
            background: 'var(--surf)', borderRadius: RADIUS.lg, padding: 24,
            width: '100%', maxWidth: 500, border: '1px solid var(--border)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, fontFamily: 'var(--ff)', color: 'var(--text)' }}>
                Statistiques : {viewingStats.name}
              </h2>
              <button onClick={() => setViewingStats(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--t3)' }}>X</button>
            </div>

            {[
              { label: 'Envoyes', value: viewingStats.sent_ct, color: 'var(--bl)', percent: 100 },
              { label: 'Livres', value: Math.round(viewingStats.sent_ct * 0.95), color: 'var(--gn)', percent: 95 },
              { label: 'Ouverts', value: Math.round(viewingStats.sent_ct * 0.35), color: 'var(--am)', percent: 35 },
              { label: 'Cliques', value: Math.round(viewingStats.sent_ct * 0.12), color: 'var(--bl)', percent: 12 },
              { label: 'Rebond', value: Math.round(viewingStats.sent_ct * 0.02), color: 'var(--rd)', percent: 2 },
            ].map(stat => (
              <div key={stat.label} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{stat.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: stat.color }}>{stat.value} ({stat.percent}%)</span>
                </div>
                <div style={{
                  height: 8, background: 'var(--surf3)', borderRadius: RADIUS.sm,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', background: stat.color,
                    width: stat.percent + '%', transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            ))}

            <button style={{ ...btnSecondary, width: '100%', marginTop: 16 }} onClick={() => setViewingStats(null)}>Fermer</button>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {showTest !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setShowTest(null)}>
          <div style={{
            background: 'var(--surf)', borderRadius: RADIUS.lg, padding: 24,
            width: '100%', maxWidth: 400, border: '1px solid var(--border)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px', fontFamily: 'var(--ff)', color: 'var(--text)' }}>
              Envoyer un email test
            </h2>
            <label style={labelStyle}>Adresse email</label>
            <input
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="votre@email.ch"
              style={{ ...inputStyle, marginBottom: 12 }}
              onKeyDown={e => { if (e.key === 'Enter') sendTest(showTest) }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={btnSecondary} onClick={() => setShowTest(null)}>Annuler</button>
              <button style={btnPrimary} onClick={() => sendTest(showTest)}>Envoyer test</button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Editor Modal */}
      {showEditor && editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          overflow: 'auto',
        }} onClick={() => setShowEditor(false)}>
          <div style={{
            background: 'var(--surf)', borderRadius: RADIUS.lg, padding: 24,
            width: '100%', maxWidth: 1200, maxHeight: '90vh', overflowY: 'auto',
            scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
            border: '1px solid var(--border)',
            margin: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, fontFamily: 'var(--ff)', color: 'var(--text)' }}>
                {editing.id ? 'Modifier la campagne' : 'Nouvelle campagne'}
              </h2>
              <button onClick={() => setShowEditor(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--t3)' }}>X</button>
            </div>

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Left: Form & Block Editor */}
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Nom de la campagne</label>
                  <input
                    value={editing.name || ''}
                    onChange={e => setEditing(f => f ? { ...f, name: e.target.value } : f)}
                    placeholder="Newsletter Avril 2026"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Sujet de l&apos;email</label>
                  <input
                    value={editing.subject || ''}
                    onChange={e => setEditing(f => f ? { ...f, subject: e.target.value } : f)}
                    placeholder="Nos nouveautes du mois"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Nom expediteur</label>
                    <input
                      value={editing.from_name || ''}
                      onChange={e => setEditing(f => f ? { ...f, from_name: e.target.value } : f)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email expediteur</label>
                    <input
                      value={editing.from_email || ''}
                      onChange={e => setEditing(f => f ? { ...f, from_email: e.target.value } : f)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Template Selector */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Templates pre-faits</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {TEMPLATES.map(t => (
                      <button
                        key={t.name}
                        style={{ ...btnSecondary, textAlign: 'left', padding: '8px 12px' }}
                        onClick={() => loadTemplate(t)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Segment Selector */}
                <div style={{ marginBottom: 16, padding: 12, background: 'var(--surf3)', borderRadius: RADIUS.md }}>
                  <label style={labelStyle}>Cible d&apos;envoi</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                      <input
                        type="radio"
                        name="segment"
                        checked={segment.type === 'all'}
                        onChange={() => setSegment({ type: 'all' })}
                      />
                      Tous les contacts
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                      <input
                        type="radio"
                        name="segment"
                        checked={segment.type === 'email_only'}
                        onChange={() => setSegment({ type: 'email_only' })}
                      />
                      Avec email uniquement
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                      <input
                        type="radio"
                        name="segment"
                        checked={segment.type === 'status'}
                        onChange={() => setSegment({ type: 'status', statuses: selectedStatuses })}
                      />
                      Par statut (Client/Prospect/Partenaire)
                    </label>
                    {segment.type === 'status' && (
                      <div style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {['Client', 'Prospect', 'Partenaire'].map(s => (
                          <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11 }}>
                            <input
                              type="checkbox"
                              checked={selectedStatuses.includes(s)}
                              onChange={e => {
                                const ns = e.target.checked ? [...selectedStatuses, s] : selectedStatuses.filter(x => x !== s)
                                setSelectedStatuses(ns)
                                setSegment({ type: 'status', statuses: ns })
                              }}
                            />
                            {s}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Block Editor */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <label style={{ ...labelStyle, margin: 0 }}>Blocs du contenu</label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button style={btnSmall} onClick={() => addBlock('header')}>+ Header</button>
                      <button style={btnSmall} onClick={() => addBlock('text')}>+ Texte</button>
                      <button style={btnSmall} onClick={() => addBlock('button')}>+ Bouton</button>
                      <button style={btnSmall} onClick={() => addBlock('image')}>+ Image</button>
                      <button style={btnSmall} onClick={() => addBlock('divider')}>+ Sep</button>
                      <button style={btnSmall} onClick={() => addBlock('social')}>+ Reseaux</button>
                    </div>
                  </div>

                  {/* Variables toolbar */}
                  <div style={{
                    marginBottom: 8, padding: 8, background: 'var(--surf3)', borderRadius: RADIUS.sm,
                    display: 'flex', gap: 4, flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 10, color: 'var(--t3)', alignSelf: 'center', marginRight: 4 }}>Variables :</span>
                    {['prenom', 'nom', 'company', 'email'].map(v => (
                      <button
                        key={v}
                        style={{ ...btnSmall, fontSize: 9 }}
                        onClick={() => insertVariable(v)}
                      >
                        {'{{' + v + '}}'}
                      </button>
                    ))}
                  </div>

                  {/* Blocks list */}
                  <div style={{ maxHeight: 400, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
                    {blocks.length === 0 && (
                      <div style={{ ...cardS, textAlign: 'center', color: 'var(--t4)', padding: 20, fontSize: 12 }}>
                        Aucun bloc. Cliquez sur &quot;+ Header&quot; pour commencer.
                      </div>
                    )}
                    {blocks.map((block, idx) => (
                      <BlockCard
                        key={block.id}
                        block={block}
                        onUpdate={(data: any) => updateBlock(block.id, data)}
                        onMoveUp={() => moveBlock(block.id, 'up')}
                        onMoveDown={() => moveBlock(block.id, 'down')}
                        onDelete={() => deleteBlock(block.id)}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < blocks.length - 1}
                        activeBlockId={activeBlockId}
                        onActivate={setActiveBlockId}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Live Preview */}
              <div>
                <label style={labelStyle}>Apercu en direct</label>
                <div style={{
                  background: '#fff', border: '1px solid var(--border)', borderRadius: RADIUS.md,
                  padding: 16, maxWidth: 600, margin: '0 auto',
                  maxHeight: 500, overflowY: 'auto',
                  scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                  <div style={{
                    fontSize: 11, color: '#666', marginBottom: 12, textAlign: 'center',
                    fontStyle: 'italic', fontFamily: 'var(--fm)',
                  }}>
                    De: {editing.from_name || 'R3STO'} {editing.from_email ? ('<' + editing.from_email + '>') : ''}
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 16,
                    paddingBottom: 12, borderBottom: '1px solid #eee',
                  }}>
                    {editing.subject || '(sans sujet)'}
                  </div>
                  <div
                    style={{ fontSize: 12, color: '#333', lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: compiledHtml || '<p style="color: #999;">Aucun bloc</p>' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={btnSecondary} onClick={() => setShowEditor(false)}>Annuler</button>
              <button style={btnPrimary} onClick={saveCampaign}>
                {editing.id ? 'Mettre a jour' : 'Creer la campagne'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
