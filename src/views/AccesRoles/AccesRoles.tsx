import { useState } from 'react'
import { useToast } from '../../components/ui/Toast'
import { api } from '../../api/apiService'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { RADIUS, GAP, FONT } from '../../utils/design'
import type { User, UserRole, PermissionModule, PermissionLevel } from '../../types'
import { DEFAULT_ROLE_PERMISSIONS, getDefaultModuleAccess } from '../../types'

const roleColors: Record<UserRole, string> = Object.fromEntries(
  Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([k, v]) => [k, v.color])
) as Record<UserRole, string>

const roleLabels: Record<UserRole, string> = Object.fromEntries(
  Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([k, v]) => [k, v.label])
) as Record<UserRole, string>

const roleIcons: Record<UserRole, string> = Object.fromEntries(
  Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([k, v]) => [k, v.icon])
) as Record<UserRole, string>

const roleDescriptions: Record<UserRole, string> = Object.fromEntries(
  Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([k, v]) => [k, v.description])
) as Record<UserRole, string>

// Module groupings matching sidebar structure
const MODULE_GROUPS: Record<string, PermissionModule[]> = {
  'Réservations': ['resas', 'plan', 'grille', 'agenda', 'waitlist', 'groupes'],
  'Clients': ['clients', 'crm', 'marketing', 'blacklist', 'avis', 'fidelite'],
  'Canaux': ['widget', 'menu'],
  'R3STO Order': ['commandes', 'kds', 'caisse', 'prepaiement', 'cadeaux'],
  'R3STO Delivery': ['delivery'],
  'Config': ['profil', 'salles', 'tables', 'fermetures', 'options'],
  'Admin': ['acces_roles', 'multisite', 'audit', 'alertes', 'historique', 'support', 'finance', 'equipes', 'plateforme', 'newsletter', 'marketplace', 'site_vitrine', 'qrcode', 'modules', 'dashboard'],
}

interface LoginLogItem {
  userId: string
  userName: string
  time: string
  ip: string
}

export function AccesRoles() {
  const { toast } = useToast()
  const { t } = useT()
  const storeUsers = useAppStore(s => s.users)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'support' as UserRole,
    department: ''
  })
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingPermUserId, setEditingPermUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showLoginHistory, setShowLoginHistory] = useState(false)
  const isDemo = useAppStore(s => s.isDemo)

  // Confirm dialog state (remplace window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    danger?: boolean
    onConfirm: () => void
  } | null>(null)

  const activeUserCount = storeUsers.filter(u => u.active).length

  // Login history : démo statique en isDemo, sinon lastLogin par utilisateur
  const loginHistory: LoginLogItem[] = isDemo ? [
    { userId: '1', userName: 'Pierre Martin', time: '2026-04-13 14:32', ip: '192.168.1.5' },
    { userId: '2', userName: 'Sophie Bernard', time: '2026-04-13 13:15', ip: '192.168.1.8' },
    { userId: '3', userName: 'Jean Dupont', time: '2026-04-13 12:45', ip: '192.168.1.3' },
    { userId: '1', userName: 'Pierre Martin', time: '2026-04-12 19:22', ip: '192.168.1.5' },
  ] : storeUsers
    .filter(u => u.lastLogin)
    .sort((a, b) => (b.lastLogin || '').localeCompare(a.lastLogin || ''))
    .slice(0, 20)
    .map(u => ({ userId: u.id, userName: u.n, time: u.lastLogin || '', ip: '—' }))

  const filteredUsers = storeUsers.filter(u =>
    u.n.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Avatar initials
  function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('')
  }

  // Get avatar color based on role
  function getAvatarColor(role: UserRole): string {
    return roleColors[role] || 'var(--t3)'
  }

  function submitInvite() {
    if (!inviteForm.email.trim()) {
      toast('Email requis', 'error')
      return
    }
    const newUser: User = {
      id: `user_${Date.now()}`,
      n: inviteForm.name || inviteForm.email.split('@')[0],
      email: inviteForm.email,
      role: inviteForm.role,
      active: true,
      department: inviteForm.department || undefined,
    }
    useAppStore.setState(s => ({
      users: [...s.users, newUser]
    }))
    setInviteForm({ name: '', email: '', role: 'support', department: '' })
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

  function updateUserPermissions(userId: string, permissions: Partial<Record<PermissionModule, PermissionLevel>>) {
    useAppStore.setState(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, permissions } : u)
    }))
    setEditingPermUserId(null)
    toast('Permissions mises à jour', 'success')
  }

  function toggleUserActive(userId: string) {
    const user = storeUsers.find(u => u.id === userId)
    if (!user) return
    setConfirmDialog({
      title: user.active ? 'Révoquer l\'accès ?' : 'Réactiver l\'utilisateur ?',
      message: user.active
        ? `L'utilisateur ${user.n} ne pourra plus se connecter.`
        : `L'utilisateur ${user.n} pourra à nouveau se connecter.`,
      danger: user.active,
      onConfirm: () => {
        useAppStore.setState(s => ({
          users: s.users.map(u => u.id === userId ? { ...u, active: !u.active } : u)
        }))
        toast(user.active ? 'Accès révoqué' : 'Utilisateur réactivé', 'success')
        setConfirmDialog(null)
      },
    })
  }

  function deleteUser(userId: string) {
    const user = storeUsers.find(u => u.id === userId)
    setConfirmDialog({
      title: 'Supprimer cet utilisateur ?',
      message: user ? `Cette action est irréversible. ${user.n} sera définitivement supprimé.` : 'Cette action est irréversible.',
      danger: true,
      onConfirm: () => {
        useAppStore.setState(s => ({
          users: s.users.filter(u => u.id !== userId)
        }))
        toast('Utilisateur supprimé', 'success')
        setConfirmDialog(null)
      },
    })
  }

  return (
    <div style={{
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      overflow: 'auto',
      height: 'calc(100vh - var(--hh))'
    }}>
      {/* ══════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ══════════════════════════════════════════ */}
      <div>
        <h2 style={{
          fontSize: 24,
          fontWeight: 900,
          color: 'var(--text)',
          margin: 0,
          marginBottom: 8
        }}>
          Accès & Rôles
        </h2>
        <p style={{
          fontSize: 12,
          color: 'var(--t2)',
          margin: 0,
          marginBottom: 16
        }}>
          Gestion complète des utilisateurs, rôles et permissions par module
        </p>

        {/* Stats Bar */}
        <div style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16
        }}>
          <div style={{
            background: 'var(--surf2)',
            border: '1px solid var(--border)',
            borderRadius: RADIUS.md,
            padding: `${GAP.md}px ${GAP.lg}px`,
            flex: '0 1 auto',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
              Utilisateurs actifs
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
              {activeUserCount}
            </div>
          </div>

          <div style={{
            background: 'var(--surf2)',
            border: '1px solid var(--border)',
            borderRadius: RADIUS.md,
            padding: `${GAP.md}px ${GAP.lg}px`,
            flex: '0 1 auto',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
              Total
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
              {storeUsers.length}
            </div>
          </div>

          <div style={{
            background: 'var(--surf2)',
            border: '1px solid var(--border)',
            borderRadius: RADIUS.md,
            padding: `${GAP.md}px ${GAP.lg}px`,
            flex: '0 1 auto',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
              Rôles
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
              {Object.keys(DEFAULT_ROLE_PERMISSIONS).length}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: GAP.md, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowInvite(!showInvite)}
            style={{
              padding: `${GAP.md}px ${GAP.lg}px`,
              borderRadius: RADIUS.md,
              border: 'none',
              background: showInvite ? 'var(--gn)' : 'var(--bl)',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all .15s ease',
            }}
          >
            + Inviter un membre
          </button>
          <button
            onClick={() => setShowLoginHistory(!showLoginHistory)}
            style={{
              padding: `${GAP.md}px ${GAP.lg}px`,
              borderRadius: RADIUS.md,
              border: '1px solid var(--border)',
              background: showLoginHistory ? 'var(--bl)20' : 'var(--surf2)',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all .15s ease',
            }}
          >
            Historique connexions
          </button>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                padding: `${GAP.md}px ${GAP.lg}px`,
                borderRadius: RADIUS.md,
                border: '1px solid var(--border)',
                background: 'var(--surf2)',
                color: 'var(--t3)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Effacer filtre
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* LOGIN HISTORY SECTION */}
      {/* ══════════════════════════════════════════ */}
      {showLoginHistory && (
        <div style={{
          background: 'var(--surf2)',
          border: '1.5px solid var(--bl)',
          borderRadius: RADIUS.lg,
          padding: GAP.xl
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 900,
            color: 'var(--text)',
            marginBottom: GAP.lg
          }}>
            Historique des connexions récentes
          </div>
          <div style={{ overflow: 'auto', maxHeight: 200 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{
                    textAlign: 'left',
                    padding: `${GAP.md}px ${GAP.lg}px`,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em'
                  }}>
                    Utilisateur
                  </th>
                  <th style={{
                    textAlign: 'left',
                    padding: `${GAP.md}px ${GAP.lg}px`,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em'
                  }}>
                    Heure
                  </th>
                  <th style={{
                    textAlign: 'left',
                    padding: `${GAP.md}px ${GAP.lg}px`,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em'
                  }}>
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: `${GAP.md}px ${GAP.lg}px` }}>{log.userName}</td>
                    <td style={{
                      padding: `${GAP.md}px ${GAP.lg}px`,
                      fontFamily: FONT.mono,
                      color: 'var(--t3)',
                      fontSize: 10
                    }}>
                      {log.time}
                    </td>
                    <td style={{
                      padding: `${GAP.md}px ${GAP.lg}px`,
                      fontFamily: FONT.mono,
                      color: 'var(--t3)',
                      fontSize: 10
                    }}>
                      {log.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* INVITE MODAL */}
      {/* ══════════════════════════════════════════ */}
      {showInvite && (
        <div style={{
          background: 'var(--surf2)',
          border: '1.5px solid var(--bl)',
          borderRadius: RADIUS.lg,
          padding: GAP.xl
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 900,
            color: 'var(--text)',
            marginBottom: GAP.lg
          }}>
            Inviter un nouveau membre
          </div>
          <div style={{
            display: 'flex',
            gap: GAP.lg,
            alignItems: 'flex-end',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--t3)',
                textTransform: 'uppercase',
                letterSpacing: '.05em',
                display: 'block',
                marginBottom: GAP.sm
              }}>
                Nom
              </label>
              <input
                value={inviteForm.name}
                onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t('acces.inviteNamePlaceholder')}
                style={{
                  width: '100%',
                  padding: `${GAP.md}px ${GAP.lg}px`,
                  fontSize: 12,
                  borderRadius: RADIUS.sm,
                  border: '1px solid var(--border)',
                  background: 'var(--surf)',
                  color: 'var(--text)',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--ff)',
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--t3)',
                textTransform: 'uppercase',
                letterSpacing: '.05em',
                display: 'block',
                marginBottom: GAP.sm
              }}>
                Email *
              </label>
              <input
                value={inviteForm.email}
                onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                placeholder={t('acces.inviteEmailPlaceholder')}
                type="email"
                style={{
                  width: '100%',
                  padding: `${GAP.md}px ${GAP.lg}px`,
                  fontSize: 12,
                  borderRadius: RADIUS.sm,
                  border: '1px solid var(--border)',
                  background: 'var(--surf)',
                  color: 'var(--text)',
                  fontFamily: FONT.mono,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 0 }}>
              <label style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--t3)',
                textTransform: 'uppercase',
                letterSpacing: '.05em',
                display: 'block',
                marginBottom: GAP.sm
              }}>
                Rôle
              </label>
              <select
                value={inviteForm.role}
                onChange={e => setInviteForm(f => ({ ...f, role: e.target.value as UserRole }))}
                style={{
                  padding: `${GAP.md}px ${GAP.lg}px`,
                  fontSize: 12,
                  borderRadius: RADIUS.sm,
                  border: '1px solid var(--border)',
                  background: 'var(--surf)',
                  color: 'var(--text)',
                  fontFamily: 'var(--ff)',
                  cursor: 'pointer',
                }}
              >
                {Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, perm]) => (
                  <option key={role} value={role}>
                    {perm.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 0 }}>
              <label style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--t3)',
                textTransform: 'uppercase',
                letterSpacing: '.05em',
                display: 'block',
                marginBottom: GAP.sm
              }}>
                Département
              </label>
              <input
                value={inviteForm.department}
                onChange={e => setInviteForm(f => ({ ...f, department: e.target.value }))}
                placeholder="ex: Cuisine"
                style={{
                  padding: `${GAP.md}px ${GAP.lg}px`,
                  fontSize: 12,
                  borderRadius: RADIUS.sm,
                  border: '1px solid var(--border)',
                  background: 'var(--surf)',
                  color: 'var(--text)',
                  fontFamily: 'var(--ff)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={submitInvite}
              disabled={!inviteForm.email.trim()}
              style={{
                padding: `${GAP.md}px ${GAP.lg}px`,
                borderRadius: RADIUS.md,
                border: 'none',
                fontWeight: 700,
                fontSize: 12,
                cursor: inviteForm.email.trim() ? 'pointer' : 'not-allowed',
                background: inviteForm.email.trim() ? 'var(--gn)' : 'var(--border)',
                color: inviteForm.email.trim() ? 'white' : 'var(--t4)',
                transition: 'all .15s ease',
              }}
            >
              Envoyer invitation
            </button>
            <button
              onClick={() => setShowInvite(false)}
              style={{
                padding: `${GAP.md}px ${GAP.lg}px`,
                borderRadius: RADIUS.md,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--t3)',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* SEARCH BAR */}
      {/* ══════════════════════════════════════════ */}
      {storeUsers.length > 0 && (
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          style={{
            width: '100%',
            padding: `${GAP.lg}px ${GAP.lg}px`,
            fontSize: 12,
            borderRadius: RADIUS.md,
            border: '1px solid var(--border)',
            background: 'var(--surf)',
            color: 'var(--text)',
            boxSizing: 'border-box',
            fontFamily: 'var(--ff)',
          }}
        />
      )}

      {/* ══════════════════════════════════════════ */}
      {/* TEAM MEMBERS TABLE */}
      {/* ══════════════════════════════════════════ */}
      {filteredUsers.length > 0 ? (
        <div style={{ background: 'var(--surf2)', borderRadius: RADIUS.lg, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ overflow: 'auto', maxHeight: 400 }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
              minWidth: 800
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surf3)' }}>
                  <th style={{
                    textAlign: 'left',
                    padding: GAP.lg,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em'
                  }}>
                    Utilisateur
                  </th>
                  <th style={{
                    textAlign: 'left',
                    padding: GAP.lg,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em'
                  }}>
                    Rôle
                  </th>
                  <th style={{
                    textAlign: 'left',
                    padding: GAP.lg,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em'
                  }}>
                    Département
                  </th>
                  <th style={{
                    textAlign: 'left',
                    padding: GAP.lg,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em'
                  }}>
                    Statut
                  </th>
                  <th style={{
                    textAlign: 'left',
                    padding: GAP.lg,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em'
                  }}>
                    Dernière connexion
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: GAP.lg,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      opacity: u.active ? 1 : 0.5,
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    {/* User info with avatar */}
                    <td style={{ padding: GAP.lg }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: GAP.lg }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: getAvatarColor(u.role) + '20',
                          border: `2px solid ${getAvatarColor(u.role)}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: getAvatarColor(u.role),
                          flexShrink: 0
                        }}>
                          {getInitials(u.n)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--text)',
                            marginBottom: 2
                          }}>
                            {u.n}
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: 'var(--t3)',
                            fontFamily: FONT.mono,
                            wordBreak: 'break-all'
                          }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td style={{ padding: GAP.lg }}>
                      {editingUserId === u.id ? (
                        <select
                          value={u.role}
                          onChange={e => updateUserRole(u.id, e.target.value as UserRole)}
                          onBlur={() => setEditingUserId(null)}
                          autoFocus
                          style={{
                            padding: `${GAP.sm}px ${GAP.md}px`,
                            fontSize: 11,
                            borderRadius: RADIUS.sm,
                            border: `1.5px solid var(--bl)`,
                            background: 'var(--surf)',
                            color: 'var(--text)',
                            fontFamily: 'var(--ff)',
                            cursor: 'pointer',
                          }}
                        >
                          {Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, perm]) => (
                            <option key={role} value={role}>
                              {perm.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          onClick={() => setEditingUserId(u.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: GAP.sm,
                            padding: `${GAP.sm}px ${GAP.md}px`,
                            borderRadius: RADIUS.sm,
                            background: getAvatarColor(u.role) + '15',
                            color: getAvatarColor(u.role),
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all .15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = getAvatarColor(u.role) + '25'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = getAvatarColor(u.role) + '15'
                          }}
                        >
                          <span>{roleIcons[u.role]}</span>
                          {roleLabels[u.role]}
                        </span>
                      )}
                    </td>

                    {/* Department */}
                    <td style={{
                      padding: GAP.lg,
                      color: 'var(--t3)',
                      fontSize: 11
                    }}>
                      {u.department || '—'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: GAP.lg }}>
                      <span style={{
                        display: 'inline-block',
                        padding: `${GAP.sm}px ${GAP.md}px`,
                        borderRadius: RADIUS.sm,
                        background: u.active ? 'var(--gn)15' : 'var(--t3)15',
                        color: u.active ? 'var(--gn)' : 'var(--t3)',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '.05em'
                      }}>
                        {u.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>

                    {/* Last login */}
                    <td style={{
                      padding: GAP.lg,
                      color: 'var(--t3)',
                      fontSize: 10,
                      fontFamily: FONT.mono
                    }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fr-FR') : '—'}
                    </td>

                    {/* Actions */}
                    <td style={{
                      padding: GAP.lg,
                      textAlign: 'center'
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: GAP.sm,
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                      }}>
                        <button
                          onClick={() => setEditingPermUserId(u.id)}
                          title={t('acces.editPermissions')}
                          style={{
                            padding: `${GAP.sm}px ${GAP.md}px`,
                            fontSize: 10,
                            borderRadius: RADIUS.sm,
                            border: '1px solid var(--border)',
                            background: 'var(--surf)',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            transition: 'all .15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bl)15'
                            e.currentTarget.style.borderColor = 'var(--bl)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--surf)'
                            e.currentTarget.style.borderColor = 'var(--border)'
                          }}
                        >
                          🔐 Perms
                        </button>
                        <button
                          onClick={() => toggleUserActive(u.id)}
                          title={u.active ? 'Révoquer' : 'Réactiver'}
                          style={{
                            padding: `${GAP.sm}px ${GAP.md}px`,
                            fontSize: 10,
                            borderRadius: RADIUS.sm,
                            border: `1px solid ${u.active ? 'var(--rd)' : 'var(--gn)'}`,
                            background: u.active ? 'var(--rd)15' : 'var(--gn)15',
                            color: u.active ? 'var(--rd)' : 'var(--gn)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            transition: 'all .15s ease',
                          }}
                        >
                          {u.active ? '🔒' : '✓'}
                        </button>
                        <button
                          onClick={() => deleteUser(u.id)}
                          title="Supprimer"
                          style={{
                            padding: `${GAP.sm}px ${GAP.md}px`,
                            fontSize: 10,
                            borderRadius: RADIUS.sm,
                            border: '1px solid var(--rd)',
                            background: 'transparent',
                            color: 'var(--rd)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            transition: 'all .15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--rd)15'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
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
        </div>
      ) : (
        <div style={{
          padding: GAP.xxl,
          textAlign: 'center',
          color: 'var(--t3)',
          background: 'var(--surf2)',
          borderRadius: RADIUS.lg,
          border: '1px solid var(--border)'
        }}>
          {searchQuery ? 'Aucun utilisateur trouvé avec ces critères' : 'Aucun utilisateur pour le moment'}
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* PERMISSION MATRIX MODAL */}
      {/* ══════════════════════════════════════════ */}
      {editingPermUserId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: GAP.lg,
        }}>
          <PermissionMatrixModal
            user={storeUsers.find(u => u.id === editingPermUserId)!}
            onClose={() => setEditingPermUserId(null)}
            onSave={(permissions) => {
              updateUserPermissions(editingPermUserId, permissions)
            }}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ROLE CARDS GRID */}
      {/* ══════════════════════════════════════════ */}
      <div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--t3)',
          textTransform: 'uppercase',
          letterSpacing: '.07em',
          marginBottom: GAP.lg
        }}>
          Rôles disponibles
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: GAP.lg,
        }}>
          {Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([roleKey, rolePerm]) => (
            <div
              key={roleKey}
              style={{
                background: 'var(--surf2)',
                border: '1px solid var(--border)',
                borderRadius: RADIUS.lg,
                padding: GAP.lg,
                transition: 'all .15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = roleColors[roleKey as UserRole]
                e.currentTarget.style.background = roleColors[roleKey as UserRole] + '08'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--surf2)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: GAP.md,
                marginBottom: GAP.lg
              }}>
                <div style={{
                  fontSize: 24,
                }}>
                  {rolePerm.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: 'var(--text)',
                  }}>
                    {rolePerm.label}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: roleColors[roleKey as UserRole],
                    fontWeight: 700,
                  }}>
                    {Object.values(getDefaultModuleAccess(roleKey as UserRole)).filter(l => l !== 'none').length} modules
                  </div>
                </div>
              </div>
              <p style={{
                fontSize: 11,
                color: 'var(--t3)',
                margin: 0,
                lineHeight: 1.4,
              }}>
                {rolePerm.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm dialog (remplace window.confirm) */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => setConfirmDialog(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surf)', borderRadius: 12, padding: 24,
              maxWidth: 440, width: '100%', border: '1px solid var(--border)',
              boxShadow: '0 10px 40px rgba(0,0,0,.4)',
            }}
          >
            <h3 id="confirm-title" style={{
              margin: 0, marginBottom: 8, fontSize: 16, fontWeight: 800,
              color: confirmDialog.danger ? 'var(--rd)' : 'var(--text)',
            }}>
              {confirmDialog.title}
            </h3>
            <p style={{ margin: 0, marginBottom: 20, fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{
                  padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'var(--surf2)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                autoFocus
                style={{
                  padding: '8px 16px', borderRadius: 6, border: 'none',
                  background: confirmDialog.danger ? 'var(--rd)' : 'var(--bl)',
                  color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {confirmDialog.danger ? 'Confirmer' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// PERMISSION MATRIX MODAL
// ══════════════════════════════════════════════════════

interface PermissionMatrixModalProps {
  user: User
  onClose: () => void
  onSave: (permissions: Partial<Record<PermissionModule, PermissionLevel>>) => void
}

function PermissionMatrixModal({ user, onClose, onSave }: PermissionMatrixModalProps) {
  const defaults = getDefaultModuleAccess(user.role)
  const [permissions, setPermissions] = useState<Partial<Record<PermissionModule, PermissionLevel>>>(
    user.permissions || defaults
  )

  const levels: PermissionLevel[] = ['none', 'read', 'write', 'admin']

  function handleChange(module: PermissionModule, level: PermissionLevel) {
    setPermissions(prev => ({
      ...prev,
      [module]: level
    }))
  }

  function resetToDefaults() {
    setPermissions(defaults)
  }

  return (
    <div style={{
      background: 'var(--surf)',
      borderRadius: RADIUS.lg,
      width: '100%',
      maxWidth: 900,
      maxHeight: '90vh',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: GAP.xl,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 900,
            color: 'var(--text)',
            marginBottom: GAP.sm,
          }}>
            Permissions de {user.n}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--t3)',
          }}>
            Rôle: {roleLabels[user.role]}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--t3)',
            fontSize: 20,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: GAP.xl,
        overflow: 'auto',
      }}>
        {Object.entries(MODULE_GROUPS).map(([groupName, modules]) => (
          <div key={groupName} style={{ marginBottom: GAP.xxl }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--t2)',
              textTransform: 'uppercase',
              letterSpacing: '.05em',
              marginBottom: GAP.lg,
              paddingBottom: GAP.md,
              borderBottom: '1px solid var(--border)',
            }}>
              {groupName}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: GAP.lg,
            }}>
              {modules.map(module => (
                <div key={module}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: GAP.md,
                    textTransform: 'capitalize',
                  }}>
                    {module}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: GAP.sm,
                    flexWrap: 'wrap',
                  }}>
                    {levels.map(level => {
                      const isActive = (permissions[module] || defaults[module]) === level
                      const levelColors: Record<PermissionLevel, string> = {
                        'none': 'var(--t4)',
                        'read': 'var(--bl)',
                        'write': 'var(--am)',
                        'admin': 'var(--rd)',
                      }
                      return (
                        <button
                          key={level}
                          onClick={() => handleChange(module, level)}
                          style={{
                            padding: `${GAP.sm}px ${GAP.md}px`,
                            borderRadius: RADIUS.sm,
                            border: `1.5px solid ${levelColors[level]}`,
                            background: isActive ? levelColors[level] + '20' : 'transparent',
                            color: levelColors[level],
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all .15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = levelColors[level] + '10'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = 'transparent'
                            }
                          }}
                        >
                          {level === 'none' ? '✕' : level === 'read' ? '👁️' : level === 'write' ? '✏️' : '🔑'}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: GAP.xl,
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: GAP.lg,
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={resetToDefaults}
          style={{
            padding: `${GAP.md}px ${GAP.lg}px`,
            borderRadius: RADIUS.md,
            border: '1px solid var(--border)',
            background: 'var(--surf2)',
            color: 'var(--text)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Rétablir par défaut
        </button>
        <button
          onClick={onClose}
          style={{
            padding: `${GAP.md}px ${GAP.lg}px`,
            borderRadius: RADIUS.md,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--t3)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Annuler
        </button>
        <button
          onClick={() => onSave(permissions)}
          style={{
            padding: `${GAP.md}px ${GAP.lg}px`,
            borderRadius: RADIUS.md,
            border: 'none',
            background: 'var(--gn)',
            color: 'white',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all .15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}
