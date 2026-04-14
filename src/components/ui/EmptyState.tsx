/**
 * EmptyState — message universel quand une liste est vide.
 *
 * Utilisé dans Resas, Clients, Dashboard, Waitlist, Blacklist, etc.
 * Icône + titre + description + CTA optionnelle.
 */
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  cta?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  secondary?: {
    label: string
    onClick: () => void
  }
  /** Compact mode = moins de padding (pour modals) */
  compact?: boolean
}

export function EmptyState({ icon, title, description, cta, secondary, compact }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: compact ? '32px 20px' : '64px 24px',
      gap: 12,
      color: 'var(--t3)',
      minHeight: compact ? 200 : 280,
    }}>
      {icon && (
        <div style={{
          fontSize: compact ? 36 : 48,
          opacity: 0.6,
          marginBottom: 4,
          lineHeight: 1,
        }}>
          {icon}
        </div>
      )}
      <div style={{
        fontSize: compact ? 15 : 17,
        fontWeight: 700,
        color: 'var(--text)',
      }}>
        {title}
      </div>
      {description && (
        <div style={{
          fontSize: 13,
          color: 'var(--t3)',
          maxWidth: 420,
          lineHeight: 1.5,
        }}>
          {description}
        </div>
      )}
      {(cta || secondary) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
          {cta && (
            <button
              onClick={cta.onClick}
              style={{
                background: cta.variant === 'secondary' ? 'var(--surf3)' : 'var(--bl)',
                color: cta.variant === 'secondary' ? 'var(--text)' : '#fff',
                border: cta.variant === 'secondary' ? '1px solid var(--border)' : 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {cta.label}
            </button>
          )}
          {secondary && (
            <button
              onClick={secondary.onClick}
              style={{
                background: 'transparent',
                color: 'var(--t2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
