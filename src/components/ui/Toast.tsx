import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface ToastItem { id: string; message: string; type?: 'success'|'error'|'warning'|'info' }
interface ToastCtx { toast: (msg: string, type?: ToastItem['type']) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Date.now().toString()
    setToasts((p) => [...p, { id, message, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000)
  }, [])

  const bg = (type?: string) => ({ success:'rgba(60,200,112,.15)', error:'rgba(220,80,80,.15)', warning:'rgba(232,165,48,.15)' }[type||''] || 'var(--surf4)')
  const bd = (type?: string) => ({ success:'rgba(60,200,112,.3)', error:'rgba(220,80,80,.3)', warning:'rgba(232,165,48,.3)' }[type||''] || 'var(--border)')

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ padding:'10px 16px', background:bg(t.type), border:`1px solid ${bd(t.type)}`, borderRadius:10, color:'var(--text)', fontSize:12, fontWeight:600, boxShadow:'0 8px 24px rgba(0,0,0,.4)', animation:'slideIn .2s ease' }}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
