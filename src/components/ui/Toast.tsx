import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastOptions {
  duration?: number
  action?: ToastAction
}

interface ToastItem {
  id: number
  msg: string
  type: ToastType
  action?: ToastAction
  duration: number
  isExiting?: boolean
}

interface ToastCtx {
  toast: (msg: string, type?: ToastType, options?: ToastOptions) => void
}

const Ctx = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(Ctx)

// Design system colors mapped to toast types
const COLOR_MAP: Record<ToastType, string> = {
  success: 'var(--gn, #3cc870)',
  error: 'var(--rd, #dc5050)',
  warning: 'var(--am, #e8a530)',
  info: 'var(--bl, #4480d8)',
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
}

function Toast({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: (id: number) => void
}) {
  const [progress, setProgress] = useState(100)
  const [timeLeft, setTimeLeft] = useState(item.duration)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Dismiss timer
    dismissTimeoutRef.current = setTimeout(() => {
      onDismiss(item.id)
    }, item.duration)

    // Progress bar ticker
    const tickInterval = Math.max(16, Math.floor(item.duration / 60))
    let elapsed = 0

    intervalRef.current = setInterval(() => {
      elapsed += tickInterval
      const newProgress = Math.max(0, 100 - (elapsed / item.duration) * 100)
      const newTimeLeft = Math.max(0, item.duration - elapsed)
      setProgress(newProgress)
      setTimeLeft(newTimeLeft)

      if (elapsed >= item.duration) {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }, tickInterval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current)
    }
  }, [item.duration, item.id, onDismiss])

  const handleDismiss = () => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    onDismiss(item.id)
  }

  const handleAction = () => {
    if (item.action?.onClick) {
      item.action.onClick()
    }
    handleDismiss()
  }

  return (
    <div
      style={{
        animation: item.isExiting
          ? 'toastSlideOut 0.3s ease-in forwards'
          : 'toastSlideIn 0.3s ease-out forwards',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          background: 'var(--surf, #0d1829)',
          border: `1px solid var(--border, rgba(232, 237, 245, 0.1))`,
          borderLeft: `3px solid ${COLOR_MAP[item.type]}`,
          color: 'var(--text, #e8edf5)',
          padding: '12px 16px',
          borderRadius: 'var(--rd, 8px)',
          fontSize: 13,
          fontWeight: 500,
          maxWidth: 360,
          minWidth: 280,
          boxShadow: 'var(--shadow, 0 4px 12px rgba(0,0,0,0.3))',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          fontFamily: 'var(--ff, "DM Sans", sans-serif)',
          overflow: 'hidden',
        }}
      >
        {/* Icon */}
        <span
          style={{
            color: COLOR_MAP[item.type],
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {ICONS[item.type]}
        </span>

        {/* Content container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 0,
          }}
        >
          {/* Message */}
          <div
            style={{
              wordBreak: 'break-word',
              lineHeight: 1.4,
            }}
          >
            {item.msg}
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: 2,
              background: 'rgba(232, 237, 245, 0.1)',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: COLOR_MAP[item.type],
                width: `${progress}%`,
                transition: 'width 0.1s linear',
              }}
            />
          </div>

          {/* Action button if present */}
          {item.action && (
            <button
              onClick={handleAction}
              style={{
                background: 'transparent',
                border: `1px solid ${COLOR_MAP[item.type]}`,
                color: COLOR_MAP[item.type],
                padding: '6px 12px',
                borderRadius: 'calc(var(--rd, 8px) / 2)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'var(--ff, "DM Sans", sans-serif)',
                alignSelf: 'flex-start',
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLOR_MAP[item.type]
                e.currentTarget.style.color = '#0d1829'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = COLOR_MAP[item.type]
              }}
            >
              {item.action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text, #e8edf5)',
            fontSize: 18,
            fontWeight: 700,
            cursor: 'pointer',
            padding: '4px 8px',
            flexShrink: 0,
            opacity: 0.6,
            transition: 'opacity 0.15s ease',
            fontFamily: 'var(--ff, "DM Sans", sans-serif)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6'
          }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const toast = useCallback(
    (msg: string, type: ToastType = 'info', options?: ToastOptions) => {
      const id = nextId.current++
      const duration = options?.duration ?? DEFAULT_DURATIONS[type]
      const newToast: ToastItem = {
        id,
        msg,
        type,
        action: options?.action,
        duration,
      }
      setItems((prev) => [...prev.slice(-4), newToast])
    },
    []
  )

  const handleDismiss = useCallback((id: number) => {
    setItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    )
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {items.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            pointerEvents: 'none',
          }}
        >
          {items.map((t) => (
            <Toast key={t.id} item={t} onDismiss={handleDismiss} />
          ))}
        </div>
      )}
      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes toastSlideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `}</style>
    </Ctx.Provider>
  )
}
