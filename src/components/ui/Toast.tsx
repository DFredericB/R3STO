import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

/* Toast desactive -- useToast() reste disponible comme no-op */

interface ToastCtx { toast: (msg: string, type?: 'success'|'error'|'warning'|'info') => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Ctx.Provider value={{ toast: () => {} }}>
      {children}
    </Ctx.Provider>
  )
}
