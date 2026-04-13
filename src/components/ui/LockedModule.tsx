import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n/useTranslation'

interface Props {
  title: string
  icon?: string
  description?: string
}

export function LockedModule({ title, icon = '\u{1F512}', description }: Props) {
  const { t } = useT()
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 400, padding: 40, textAlign: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 48, opacity: 0.6 }}>{icon}</div>
      <h2 style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h2>
      {description && (
        <p style={{ color: 'var(--t3)', fontSize: 14, maxWidth: 400, lineHeight: 1.5, margin: 0 }}>
          {description}
        </p>
      )}
      <button
        onClick={() => navigate('/modules')}
        style={{
          marginTop: 8, padding: '10px 24px', background: 'var(--bl)', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {t('nav.modules') || 'Voir les modules'}
      </button>
    </div>
  )
}
