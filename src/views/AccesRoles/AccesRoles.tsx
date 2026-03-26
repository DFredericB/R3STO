import { useState } from 'react'
import { useToast } from '../../components/ui/Toast'

interface TeamMember {
  n: string
  email: string
  role: 'Propriétaire' | 'Gérant' | 'Serveur' | 'Lecture seule' | 'R3STO Admin'
  lastLogin: string
  active: boolean
}

const roleColors: Record<string, string> = {
  'Propriétaire': 'var(--bp)',
  'Gérant': 'var(--gn)',
  'Serveur': 'var(--am)',
  'Lecture seule': 'var(--t3)',
  'R3STO Admin': 'var(--pu)',
}

const ACCES_USERS: TeamMember[] = [
  { n: 'Pierre Martin', email: 'pierre@resto.com', role: 'Propriétaire', lastLogin: '2024-12-25', active: true },
  { n: 'Sophie Bernard', email: 'sophie@resto.com', role: 'Gérant', lastLogin: '2024-12-24', active: true },
  { n: 'Jean Dupont', email: 'jean@resto.com', role: 'Serveur', lastLogin: '2024-12-23', active: true },
  { n: 'Marie Lefevre', email: 'marie@resto.com', role: 'Lecture seule', lastLogin: '2024-12-22', active: false },
]

export function AccesRoles() {
  const { toast } = useToast()
  const [users, setUsers] = useState<TeamMember[]>(ACCES_USERS)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Serveur' as TeamMember['role'] })
  const activeUserCount = users.filter(u => u.active).length

  function submitInvite() {
    if (!inviteForm.email.trim()) return
    setUsers(prev => [...prev, {
      n: inviteForm.name || inviteForm.email.split('@')[0],
      email: inviteForm.email,
      role: inviteForm.role,
      lastLogin: '—',
      active: true,
    }])
    setInviteForm({ name: '', email: '', role: 'Serveur' })
    setShowInvite(false)
    toast('Invitation envoyée par email', 'success')
  }

  const permMatrix = [
    { role: 'Propriétaire', view: '✓', edit: '✓', delete: '✓', billing: '✓', staff: '✓' },
    { role: 'Gérant', view: '✓', edit: '✓', delete: '✓', billing: '✗', staff: '✓' },
    { role: 'Serveur', view: '✓', edit: '✓', delete: '✗', billing: '✗', staff: '✗' },
    { role: 'Lecture seule', view: '✓', edit: '✗', delete: '✗', billing: '✗', staff: '✗' },
  ]

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Accès & Rôles</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
          {activeUserCount} membres actifs · 4 rôles disponibles
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            onClick={() => setShowInvite(!showInvite)}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: 'none',
              background: showInvite ? 'var(--gn)' : 'var(--bl)',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📧 Inviter un membre
          </button>
          <button
            onClick={() => toast('Historique des connexions', 'success')}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--surf2)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📋 Historique
          </button>
        </div>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div style={{ background: 'var(--surf2)', border: '1.5px solid var(--bl)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', marginBottom: 12 }}>📧 Inviter un membre</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 3 }}>Nom</label>
              <input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Prénom Nom"
                style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surf)', color: 'var(--text)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 3 }}>Email *</label>
              <input value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@restaurant.ch" type="email"
                style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surf)', color: 'var(--text)', fontFamily: 'var(--fm)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 3 }}>Rôle</label>
              <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value as TeamMember['role'] }))}
                style={{ padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surf)', color: 'var(--text)' }}>
                <option value="Gérant">Gérant</option>
                <option value="Serveur">Serveur</option>
                <option value="Lecture seule">Lecture seule</option>
              </select>
            </div>
            <button onClick={submitInvite} disabled={!inviteForm.email.trim()}
              style={{
                padding: '7px 16px', borderRadius: 6, border: 'none', fontWeight: 700, fontSize: 12, cursor: inviteForm.email.trim() ? 'pointer' : 'not-allowed',
                background: inviteForm.email.trim() ? 'var(--bl)' : 'var(--border)',
                color: inviteForm.email.trim() ? 'white' : 'var(--t4)',
              }}>
              Envoyer l'invitation
            </button>
            <button onClick={() => setShowInvite(false)}
              style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--t3)', fontSize: 12, cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Team Members Table */}
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Nom</th>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Email</th>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Rôle</th>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Dernière connexion</th>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Statut</th>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i} style={{ opacity: u.active ? 1 : 0.5, borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 12 }}>
                  <strong>{u.n}</strong>
                </td>
                <td style={{ padding: 12, fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>
                  {u.email}
                </td>
                <td style={{ padding: 12 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: 3,
                    background: (roleColors[u.role] || 'var(--t3)') + '20',
                    color: roleColors[u.role] || 'var(--t3)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: 12, fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>
                  {u.lastLogin}
                </td>
                <td style={{ padding: 12 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: 3,
                    background: u.active ? 'var(--gn)20' : 'var(--t3)20',
                    color: u.active ? 'var(--gn)' : 'var(--t3)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {u.active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => toast('Modifier le rôle', 'success')}
                      style={{
                        fontSize: 11,
                        padding: '3px 7px',
                        borderRadius: 3,
                        border: '1px solid var(--border)',
                        background: 'var(--surf2)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                      }}
                    >
                      ✏️
                    </button>
                    {u.active && (
                      <button
                        onClick={() => toast('Accès révoqué', 'success')}
                        style={{
                          fontSize: 11,
                          padding: '3px 7px',
                          borderRadius: 3,
                          border: '1px solid var(--rd)',
                          background: 'var(--rd)20',
                          color: 'var(--rd)',
                          cursor: 'pointer',
                        }}
                      >
                        🔒
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permissions Matrix */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
          Matrice des permissions
        </div>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 440 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Rôle</th>
                <th style={{ textAlign: 'center', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Voir</th>
                <th style={{ textAlign: 'center', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Modifier</th>
                <th style={{ textAlign: 'center', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Supprimer</th>
                <th style={{ textAlign: 'center', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Facturation</th>
                <th style={{ textAlign: 'center', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Équipe</th>
              </tr>
            </thead>
            <tbody>
              {permMatrix.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: 3,
                      background: (roleColors[p.role] || 'var(--t3)') + '20',
                      color: roleColors[p.role] || 'var(--t3)',
                      fontSize: 11,
                      fontWeight: 700,
                    }}>
                      {p.role}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: 12, fontSize: 13, color: p.view === '✓' ? 'var(--gn)' : 'var(--rd)' }}>
                    {p.view}
                  </td>
                  <td style={{ textAlign: 'center', padding: 12, fontSize: 13, color: p.edit === '✓' ? 'var(--gn)' : 'var(--rd)' }}>
                    {p.edit}
                  </td>
                  <td style={{ textAlign: 'center', padding: 12, fontSize: 13, color: p.delete === '✓' ? 'var(--gn)' : 'var(--rd)' }}>
                    {p.delete}
                  </td>
                  <td style={{ textAlign: 'center', padding: 12, fontSize: 13, color: p.billing === '✓' ? 'var(--gn)' : 'var(--rd)' }}>
                    {p.billing}
                  </td>
                  <td style={{ textAlign: 'center', padding: 12, fontSize: 13, color: p.staff === '✓' ? 'var(--gn)' : 'var(--rd)' }}>
                    {p.staff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
