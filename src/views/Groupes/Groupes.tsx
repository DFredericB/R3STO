// ══════════════════════════════════════════════════
//  R3STO — Vue Demandes Groupes
//  Données persistées dans le store Zustand
// ══════════════════════════════════════════════════

import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import { iaPlacement } from '../../utils/placementRules'
import { sectionTitle} from '../../utils/design'

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

export function Groupes() {
  const { toast } = useToast()

  // ── Store ──
  const options = useAppStore(s => s.options)
  const updateOptions = useAppStore(s => s.updateOptions)
  const tables = useAppStore(s => s.tables)
  const combos = useAppStore(s => s.combos)
  const resas = useAppStore(s => s.resas)
  const services = useAppStore(s => s.services)
  const activeDate = useAppStore(s => s.activeDate)
  const addResa = useAppStore(s => s.addResa)
  const activeServices = services.filter(s => s.active)

  // Group requests stored in options.groupRequests
  const groupRequests: any[] = (options as any).groupRequests || []
  const addGroupRequest = (r: any) => {
    updateOptions({ groupRequests: [...groupRequests, r] } as any)
  }
  const updateGroupRequest = (id: any, u: any) => {
    updateOptions({ groupRequests: groupRequests.map((g: any) => g.id === id ? { ...g, ...u } : g) } as any)
  }

  const [showSettings, setShowSettings] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Group settings stored in options.groupSettings
  const storedGrpSettings = (options as any).groupSettings || null
  const [grpSettings, setGrpSettings] = useState({
    seuil_widget: storedGrpSettings?.seuil_widget ?? 8,
    validation_obligatoire: storedGrpSettings?.validation_obligatoire ?? true,
    delai_reponse_h: storedGrpSettings?.delai_reponse_h ?? 48,
    redirect_widget: storedGrpSettings?.redirect_widget ?? true,
    msg_redirect: storedGrpSettings?.msg_redirect ?? 'Pour les groupes de {seuil}+ personnes, merci de remplir notre formulaire dédié.',
    prepaiement_groupe: storedGrpSettings?.prepaiement_groupe ?? true,
    acompte_pct: storedGrpSettings?.acompte_pct ?? 30,
    notification_email: storedGrpSettings?.notification_email ?? true,
    notification_sms: storedGrpSettings?.notification_sms ?? false,
  })

  // Form state
  const [fN, setFN] = useState('')
  const [fC, setFC] = useState(8)
  const [fSvc, setFSvc] = useState('soir')
  const [fT, setFT] = useState('19h00')
  const [fDate, setFDate] = useState(toISO(new Date()))
  const [fTel, setFTel] = useState('')
  const [fNote, setFNote] = useState('')
  const [fMode, setFMode] = useState<'auto' | 'manuel'>('manuel')

  const pending = groupRequests.filter(g => g.status === 'pending')
  const treated = groupRequests.filter(g => g.status !== 'pending')

  const getSuggestion = (covers: number, svc: string) => {
    const suggested = iaPlacement(covers, activeDate, svc, tables, combos, resas)
    if (!suggested) return null
    const combo = combos.find(c => c.label === suggested)
    const table = tables.find(t => t.n === suggested)
    return { label: suggested, cap: combo?.cap ?? table?.capMax ?? 0, combo: suggested.includes('+') }
  }

  const handleAction = (id: string, status: 'accepted' | 'refused') => {
    const g = groupRequests.find(x => x.id === id)
    if (!g) return
    updateGroupRequest(id, { status })
    if (status === 'accepted') {
      const sugg = getSuggestion(g.c, g.svc)
      const tbl = sugg?.label || 'À assigner'
      addResa({
        id: `r${Date.now()}`, n: g.n, nom: g.n.split(' ')[0] || '', prenom: g.n.split(' ').slice(1).join(' ') || '',
        c: g.c, tbl, t: g.t, svc: g.svc, s: 'reserved', statut: 0, mode: 'ia',
        tel: g.tel || '', email: g.email || '', canal: 'telephone', prisPar: '',
        note: g.note ? `${g.note} [Groupe]` : '[Groupe]',
        date: g.date, createdAt: Date.now(), src: 'groupe', bebe: 0, pmr: 0, allergie: false,
      })
      toast(`✓ ${g.n} (${g.c}p) accepté → ${tbl}`, 'success')
    } else {
      toast(`✕ ${g.n} refusé — client à notifier`, 'info')
    }
  }

  const toggleMode = (id: string) => {
    const g = groupRequests.find(x => x.id === id)
    if (g) updateGroupRequest(id, { mode: g.mode === 'auto' ? 'manuel' : 'auto' })
  }

  const handleAdd = () => {
    if (!fN.trim()) { toast('Nom requis', 'error'); return }
    addGroupRequest({
      id: `g${Date.now()}`, n: fN.trim(), c: fC, t: fT, svc: fSvc, date: fDate,
      tel: fTel || undefined, note: fNote || undefined, mode: fMode, status: 'pending', createdAt: Date.now(),
    })
    setShowForm(false)
    setFN(''); setFC(8); setFT('19h00'); setFTel(''); setFNote('')
    toast(`Demande groupe ${fN.trim()} ajoutée`, 'success')
  }

  const fmtDateShort = (iso: string) => {
    const d = new Date(iso + 'T12:00:00')
    const dn = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
    return `${dn[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`
  }

  const inputStyle: React.CSSProperties = {
    padding: '6px 9px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--surf)', color: 'var(--text)', fontSize: 12,
    fontFamily: 'var(--ff)', outline: 'none', width: '100%',
  }

  return (
    <div style={{ padding: '14px 18px', overflowY: 'auto', height: 'calc(100vh - var(--hh))' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>Demandes groupes</div>
          {pending.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 5,
              background: 'rgba(220,80,80,.15)', color: 'var(--rd)',
            }}>
              {pending.length} en attente
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowSettings(!showSettings)} style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--ff)', fontWeight: 700,
            border: `1px solid ${showSettings ? 'var(--bl)' : 'var(--border)'}`,
            background: showSettings ? 'var(--bp)' : 'var(--surf3)', color: showSettings ? 'var(--bl)' : 'var(--t2)',
          }}>
            ⚙️ Paramètres
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowForm(!showForm)} style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', fontFamily: 'var(--ff)',
            background: showForm ? 'var(--rd)' : 'var(--bl)', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
            {showForm ? '✕ Fermer' : '➕ Nouvelle demande'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--t4)', lineHeight: 1.5, display: 'flex', alignItems: 'center' }}>
            Seuil widget : {grpSettings.seuil_widget}+ personnes · Acompte : {grpSettings.prepaiement_groupe ? `${grpSettings.acompte_pct}%` : 'non'} · Délai : {grpSettings.delai_reponse_h}h
          </div>
        </div>
      </div>

      {/* ── Settings ── */}
      {showSettings && (
        <div style={{ background: 'var(--surf2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}>⚙️ Configuration groupes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 12, background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--bl)', marginBottom: 8 }}>🌐 Redirection widget</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)', marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={grpSettings.redirect_widget}
                  onChange={e => setGrpSettings(s => ({ ...s, redirect_widget: e.target.checked }))} style={{ accentColor: 'var(--bl)' }} />
                Rediriger vers formulaire quand ≥ seuil
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>Seuil :</span>
                <input type="number" min={2} max={50} value={grpSettings.seuil_widget}
                  onChange={e => setGrpSettings(s => ({ ...s, seuil_widget: +e.target.value }))}
                  style={{ width: 50, padding: '3px 6px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontFamily: 'var(--fm)' }} />
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>pers.</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--t4)', fontStyle: 'italic' }}>
                "{grpSettings.msg_redirect.replace('{seuil}', String(grpSettings.seuil_widget))}"
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--am)', marginBottom: 8 }}>✅ Validation</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)', marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={grpSettings.validation_obligatoire}
                  onChange={e => setGrpSettings(s => ({ ...s, validation_obligatoire: e.target.checked }))} style={{ accentColor: 'var(--bl)' }} />
                Validation manuelle obligatoire
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>Délai réponse :</span>
                <select value={grpSettings.delai_reponse_h} onChange={e => setGrpSettings(s => ({ ...s, delai_reponse_h: +e.target.value }))}
                  style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)' }}>
                  {[12, 24, 48, 72].map(h => <option key={h} value={h}>{h}h</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gn)', marginBottom: 8 }}>💳 Prépaiement</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)', marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={grpSettings.prepaiement_groupe}
                  onChange={e => setGrpSettings(s => ({ ...s, prepaiement_groupe: e.target.checked }))} style={{ accentColor: 'var(--bl)' }} />
                Exiger un acompte
              </label>
              {grpSettings.prepaiement_groupe && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>Acompte :</span>
                  <input type="number" min={10} max={100} value={grpSettings.acompte_pct}
                    onChange={e => setGrpSettings(s => ({ ...s, acompte_pct: +e.target.value }))}
                    style={{ width: 50, padding: '3px 6px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontFamily: 'var(--fm)' }} />
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>%</span>
                </div>
              )}
            </div>
            <div style={{ padding: 12, background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>🔔 Notifications</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)', marginBottom: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={grpSettings.notification_email}
                  onChange={e => setGrpSettings(s => ({ ...s, notification_email: e.target.checked }))} style={{ accentColor: 'var(--bl)' }} />
                Email au restaurant
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={grpSettings.notification_sms}
                  onChange={e => setGrpSettings(s => ({ ...s, notification_sms: e.target.checked }))} style={{ accentColor: 'var(--bl)' }} />
                SMS au gérant
              </label>
            </div>
          </div>
          <button onClick={() => { updateOptions({ groupSettings: grpSettings } as any); toast('Paramètres sauvegardés', 'success'); setShowSettings(false) }}
            style={{ marginTop: 12, padding: '7px 16px', borderRadius: 6, border: 'none', background: 'var(--bl)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)' }}>
            💾 Sauvegarder
          </button>
        </div>
      )}

      {/* ── Formulaire ajout ── */}
      {showForm && (
        <div style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 10, background: 'rgba(68,128,216,.05)', border: '1px solid rgba(68,128,216,.2)' }}>
          <div style={{ ...sectionTitle, marginBottom: 10 }}>Nouvelle demande groupe</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 1fr 90px 120px 90px', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 2 }}>Nom *</label>
              <input value={fN} onChange={e => setFN(e.target.value)} placeholder="Nom" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 2 }}>Couverts</label>
              <input type="number" min={2} max={50} value={fC} onChange={e => setFC(+e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 2 }}>Service</label>
              <select value={fSvc} onChange={e => setFSvc(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {activeServices.map(svc => <option key={svc.id} value={svc.name.toLowerCase()}>{svc.icon} {svc.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 2 }}>Heure</label>
              <input value={fT} onChange={e => setFT(e.target.value)} placeholder="19h00" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 2 }}>Date</label>
              <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 2 }}>Mode</label>
              <select value={fMode} onChange={e => setFMode(e.target.value as 'auto' | 'manuel')} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="manuel">✋ Manuel</option>
                <option value="auto">⚡ Auto</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 2 }}>Téléphone</label>
              <input value={fTel} onChange={e => setFTel(e.target.value)} placeholder="+41 79..." style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 2 }}>Note</label>
              <input value={fNote} onChange={e => setFNote(e.target.value)} placeholder="Allergies, occasion..." style={inputStyle} />
            </div>
            <button onClick={handleAdd} style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--gn)', color: '#fff',
              fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--ff)', whiteSpace: 'nowrap',
            }}>
              ✓ Ajouter
            </button>
          </div>
        </div>
      )}

      {/* ── En attente ── */}
      {pending.length > 0 ? (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--rd)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--fm)', marginBottom: 8 }}>
            ⏳ En attente ({pending.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pending.map(g => {
              const sugg = getSuggestion(g.c, g.svc)
              const svcObj = activeServices.find(s => s.name.toLowerCase() === g.svc)
              return (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--surf)', border: '1.5px solid rgba(220,80,80,.25)', borderRadius: 10, padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--fm)', color: 'var(--bl)', minWidth: 36, textAlign: 'center' }}>
                    {g.c}p
                  </div>
                  <div style={{ minWidth: 120 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{g.n}</div>
                    {g.tel && <div style={{ fontSize: 10, color: 'var(--t4)' }}>{g.tel}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 180 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: svcObj?.color ? `${svcObj.color}22` : 'var(--surf3)', color: svcObj?.color || 'var(--t3)',
                    }}>
                      {svcObj?.icon} {g.svc}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t2)' }}>{g.t}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>{fmtDateShort(g.date)}</span>
                  </div>
                  {g.note ? (
                    <div style={{ fontSize: 10, color: 'var(--t3)', fontStyle: 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📝 {g.note}
                    </div>
                  ) : <div style={{ flex: 1 }} />}
                  <div style={{ minWidth: 100, textAlign: 'center' }}>
                    {sugg ? (
                      <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 5, background: 'rgba(60,200,112,.1)', color: 'var(--gn)', fontWeight: 700 }}>
                        🤖 {sugg.label} ({sugg.cap}p)
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--rd)' }}>⚠️ Pas de table</span>
                    )}
                  </div>
                  <button onClick={() => toggleMode(g.id)} title={g.mode === 'auto' ? 'Mode auto — passer en manuel' : 'Mode manuel — passer en auto'}
                    style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--ff)',
                      border: '1px solid var(--border)',
                      background: g.mode === 'auto' ? 'rgba(60,200,112,.12)' : 'var(--surf3)',
                      color: g.mode === 'auto' ? 'var(--gn)' : 'var(--t3)',
                    }}>
                    {g.mode === 'auto' ? '⚡ Auto' : '✋ Manuel'}
                  </button>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => handleAction(g.id, 'accepted')} style={{
                      fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none',
                      background: 'var(--gn)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
                    }}>
                      ✓ Accepter
                    </button>
                    <button onClick={() => handleAction(g.id, 'refused')} style={{
                      fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none',
                      background: 'var(--rd)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
                    }}>
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--gn)', marginBottom: 14 }}>
          <div style={{ fontSize: 18, marginBottom: 6 }}>✅</div>
          <div style={{ fontSize: 13, color: 'var(--t3)' }}>Aucune demande en attente</div>
        </div>
      )}

      {/* ── Traitées ── */}
      {treated.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--fm)', marginBottom: 8 }}>
            Traitées ({treated.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {treated.map(g => {
              const svcObj = activeServices.find(s => s.name.toLowerCase() === g.svc)
              return (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px',
                  opacity: 0.7,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'var(--fm)', color: 'var(--t3)', minWidth: 36, textAlign: 'center' }}>
                    {g.c}p
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', minWidth: 100 }}>{g.n}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: svcObj?.color ? `${svcObj.color}22` : 'var(--surf3)', color: svcObj?.color || 'var(--t3)',
                  }}>
                    {svcObj?.icon} {g.svc}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>{g.t} · {fmtDateShort(g.date)}</span>
                  {g.note && <span style={{ fontSize: 10, color: 'var(--t4)', fontStyle: 'italic' }}>📝 {g.note}</span>}
                  <div style={{ flex: 1 }} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                    background: g.status === 'accepted' ? 'rgba(60,200,112,.15)' : 'rgba(128,128,128,.15)',
                    color: g.status === 'accepted' ? 'var(--gn)' : 'var(--t3)',
                  }}>
                    {g.status === 'accepted' ? '✓ Accepté' : '✕ Refusé'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
