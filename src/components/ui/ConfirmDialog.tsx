// ══════════════════════════════════════════════════
//  R3STO — Dialog de confirmation
//  Double validation avant actions destructives
// ══════════════════════════════════════════════════

import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel, onConfirm])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        ref={ref}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surf2)', borderRadius: 12,
          border: '1px solid var(--border)',
          boxShadow: '0 20px 50px var(--shadow)',
          padding: '20px 24px', minWidth: 320, maxWidth: 440,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--surf3)',
              color: 'var(--t2)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--ff)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px', borderRadius: 7,
              border: 'none',
              background: danger ? 'var(--rd)' : 'var(--bl)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--ff)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hook for easy usage ──────────────────────────
import { useState, useCallback } from 'react'

interface ConfirmState {
  open: boolean
  title: string
  message: string
  danger: boolean
  confirmLabel: string
  resolve: ((v: boolean) => void) | null
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false, title: '', message: '', danger: false, confirmLabel: 'Confirmer', resolve: null,
  })

  const confirm = useCallback((opts: { title: string; message: string; danger?: boolean; confirmLabel?: string }): Promise<boolean> => {
    return new Promise(resolve => {
      setState({
        open: true,
        title: opts.title,
        message: opts.message,
        danger: opts.danger ?? false,
        confirmLabel: opts.confirmLabel ?? 'Confirmer',
        resolve,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState(s => ({ ...s, open: false, resolve: null }))
  }, [state.resolve])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState(s => ({ ...s, open: false, resolve: null }))
  }, [state.resolve])

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      danger={state.danger}
      confirmLabel={state.confirmLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return { confirm, dialog }
}
