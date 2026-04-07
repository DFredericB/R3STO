import { useNavigate, useLocation } from 'react-router-dom'

const ITEMS = [
  { path: '/dashboard',    icon: '📊', label: 'Dashboard' },
  { path: '/reservations', icon: '📖', label: 'Journal' },
  { path: '/grille',       icon: '🪑', label: 'Grille' },
  { path: '/plan',         icon: '📐', label: 'Plan' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <nav className="bottom-nav" style={{
      display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'var(--bn)', background: 'var(--surf)',
      borderTop: '1px solid var(--border)', zIndex: 100,
    }}>
      {ITEMS.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <button key={item.path} onClick={() => navigate(item.path)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2,
            background: 'none', border: 'none', cursor: 'pointer',
            color: isActive ? 'var(--bl)' : 'var(--t3)',
            fontFamily: 'var(--ff)',
          }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)' }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
