import { useState } from 'react'
import { useToast } from '../../components/ui/Toast'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import type { User, UserRole } from '../../types'

const roleColors: Record<UserRole, string> = {
  'proprietaire': 'var(--bp)',
  'manager': 'var(--gn)',
  'serveur': 'var(--am)',
}

const roleLabels: Record<UserRole, string> = {
  'proprietaire': 'Propriétaire',
  'manager': 'Gérant',
  'serveur': 'Serveur',
}

export function AccesRoles() {
  const { toast } = useToast()
  const { t } = useT()
  const storeUsers = useAppStore(s => s.users)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'serveur' as UserRole })
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingPinUserId, setEditingPinUserId] = useState<string | null>(null)
  const [pinInput, setPinInput] = useState<Record<string, string>>({})
  const [showLoginHistory, setShowLoginHistory] = useState(false)

  const activeUserCount = storeUsers.filter(u => u.active).length

  // Demo login history data (structured)
  const loginHistory = [
    { userId: '1', userName: 'Pierre Martin', time: '2026-03-29 14:32', ip: '192.168.1.5' },
    { userId: '2', userName: 'Sophie Bernard', time: '2026-03-29 13:15', ip: '192.168.1.8' },
    { userId: '3', userName: 'Jean Dupont', time: '2026-03-29 12:45', ip: '192.168.1.3' },
    { userId: '1', userName: 'Pierre Martin', time: '2026-03-28 19:22', ip: '192.168.1.5' },
  ]

  // Filter users by search
  const filteredUsers = storeUsers.filter(u =>
    u.n.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function submitInvite() {
    if (!inviteForm.email.trim()) return
    const newUser: User = {
      id: `user_${Date.now()}`,
      n: inviteForm.name || inviteForm.email.split('@')[0],
      email: inviteForm.email,
      role: inviteForm.role,
      active: true,
    }
    useAppStore.setState(s => ({
      users: [...s.users, newUser]
    }))
    setInviteForm({ name: '', email: '', role: 'serveur' })
    setShowInvite(false)
    toast('Invitation envoyée par email', 'success')
  }

  function updateUserRole(userId: string, newRole: UserRole) {
    useAppStore.setState(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, role: newRole } : u)
    }))
    setEditingUserId(null)
    toast('Rôle modifié', 'success')
  }

  function revokeUser(userId: string) {
    const confirmed = window.confirm('Êtes-vous sûr de vouloir révoquer l\'accès à cet utilisateur ?')
    if (!confirmed) return
    useAppStore.setState(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, active: false } : u)
    }))
    toast('Accès révoqué', 'success')
  }

  function reactivateUser(userId: string) {
    useAppStore.setState(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, active: true } : u)
    }))
    toast('Utilisateur réactivé', 'success')
  }

  function deleteUser(userId: string) {
    const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')
    if (!confirmed) return
    useAppStore.setState(s => ({
      users: s.users.filter(u => u.id !== userId)
    }))
    toast('Utilisateur supprimé', 'success')
  }

  function updatePin(userId: string, newPin: string) {
    if (newPin && !/^\d{4}$/.test(newPin)) {
      toast('Le PIN doit être 4 chiffres', 'error')
      return
    }
    useAppStore.setState(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, pin: newPin || undefined } : u)
    }))
    setEditingPinUserId(null)
    setPinInput(prev => ({ ...prev, [userId]: '' }))
    toast('PIN mis à jour', 'success')
  }

  const permMatrix = [
    { role: 'proprietaire', view: '✓', edit: '✓', delete: '✓', billing: '✓', staff: '✓' },
    { role: 'manager', view: '✓', edit: '✓', delete: '✓', billing: '✗', staff: '✓' },
    { role: 'serveur', view: '✓', edit: '✓', delete: '✗', billing: '✗', staff: '✗' },
  ] as const

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Accès & Rôles</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
          {activeUserCount} membres actifs · {storeUsers.length} total · 3 rôles disponibles
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
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
            onClick={() => setShowLoginHistory(!showLoginHistory)}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: showLoginHistory ? 'var(--bl)20' : 'var(--surf2)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📋 Historique connexions
          </button>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                padding: '8px 12px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--surf2)',
                color: 'var(--t3)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Effacer filtre
            </button>
          )}
        </div>
      </div>

      {/* Login History */}
      {showLoginHistory && (
        <div style={{ background: 'var(--surf2)', border: '1.5px solid var(--bl)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', marginBottom: 12 }}>📋 Historique des connexions récentes</div>
          <div style={{ overflow: 'auto', maxHeight: 200 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--t2)' }}>Utilisateur</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--t2)' }}>Heure</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--t2)' }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: 0.8 }}>
                    <td style={{ padding: '8px 12px' }}>{log.userName}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--fm)', color: 'var(--t3)' }}>{log.time}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--fm)', color: 'var(--t3)' }}>{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value as UserRole }))}
                style={{ padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surf)', color: 'var(--text)' }}>
                <option value="manager">Gérant</option>
                <option value="serveur">Serveur</option>
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
              {t('action.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {storeUsers.length > 0 && (
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 13,
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surf)',
              color: 'var(--text)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Team Members Table */}
      {filteredUsers.length > 0 ? (
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Nom</th>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Email</th>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Rôle</th>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>PIN</th>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Statut</th>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ opacity: u.active ? 1 : 0.5, borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12 }}>
                    <strong>{u.n}</strong>
                  </td>
                  <td style={{ padding: 12, fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: 12 }}>
                    {editingUserId === u.id ? (
                      <select
                        value={u.role}
                        onChange={e => updateUserRole(u.id, e.target.value as UserRole)}
                        style={{
                          padding: '4px 6px',
                          fontSize: 11,
                          borderRadius: 3,
                          border: '1px solid var(--bl)',
                          background: 'var(--surf)',
                          color: 'var(--text)',
                        }}
                      >
                        <option value="serveur">Serveur</option>
                        <option value="manager">Gérant</option>
                        <option value="proprietaire">Propriétaire</option>
                      </select>
                    ) : (
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: 3,
                        background: (roleColors[u.role] || 'var(--t3)') + '20',
                        color: roleColors[u.role] || 'var(--t3)',
                        fontSize: 11,
                        fontWeight: 700,
                      }}>
                        {roleLabels[u.role]}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 12 }}>
                    {u.role === 'serveur' ? (
                      editingPinUserId === u.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input
                            type="password"
                            maxLength={4}
                            value={pinInput[u.id] || u.pin || ''}
                            onChange={e => setPinInput(prev => ({ ...prev, [u.id]: e.target.value }))}
                            placeholder="0000"
                            style={{
                              width: 50,
                              padding: '4px 6px',
                              fontSize: 11,
                              borderRadius: 3,
                              border: '1px solid var(--bl)',
                              background: 'var(--surf)',
                              color: 'var(--text)',
                              fontFamily: 'monospace',
                            }}
                          />
                          <button
                            onClick={() => updatePin(u.id, pinInput[u.id] || '')}
                            style={{
                              padding: '4px 8px',
                              fontSize: 10,
                              borderRadius: 3,
                              border: 'none',
                              background: 'var(--gn)',
                              color: 'white',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            OK
                          </button>
                          <button
                            onClick={() => setEditingPinUserId(null)}
                            style={{
                              padding: '4px 8px',
                              fontSize: 10,
                              borderRadius: 3,
                              border: '1px solid var(--border)',
                              background: 'transparent',
                              color: 'var(--t3)',
                              cursor: 'pointer',
                            }}
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPinUserId(u.id)
                            setPinInput(prev => ({ ...prev, [u.id]: u.pin || '' }))
                          }}
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
                            borderRadius: 3,
                            border: '1px solid var(--border)',
                            background: u.pin ? 'var(--gn)20' : 'var(--rd)20',
                            color: u.pin ? 'var(--gn)' : 'var(--rd)',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          {u.pin ? '●●●●' : 'Ajouter PIN'}
                        </button>
                      )
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--t4)' }}>—</span>
                    )}
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
                      {u.active ? t('state.active') : t('state.inactive')}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {!editingUserId && (
                        <button
                          onClick={() => setEditingUserId(u.id)}
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
                          ✏️ Rôle
                        </button>
                      )}
                      {u.active ? (
                        <button
                          onClick={() => revokeUser(u.id)}
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
                          🔒 Révoquer
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateUser(u.id)}
                          style={{
                            fontSize: 11,
                            padding: '3px 7px',
                            borderRadius: 3,
                            border: '1px solid var(--gn)',
                            background: 'var(--gn)20',
                            color: 'var(--gn)',
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Réactiver
                        </button>
                      )}
                      <button
                        onClick={() => deleteUser(u.id)}
                        style={{
                          fontSize: 11,
                          padding: '3px 7px',
                          borderRadius: 3,
                          border: '1px solid var(--rd)',
                          background: 'transparent',
                          color: 'var(--rd)',
                          cursor: 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)' }}>
          {searchQuery ? 'Aucun utilisateur trouvé avec ces critères' : 'Aucun utilisateur pour le moment'}
        </div>
      )}

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
                      {roleLabels[p.role]}
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
