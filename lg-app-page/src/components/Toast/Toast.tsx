import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import './Toast.css'

export type TipoToast = 'sucesso' | 'erro' | 'info'

export type ToastItem = {
  id: number
  tipo: TipoToast
  mensagem: string
  // label do botão de ação opcional (ex: "Gerar PDF", "Tentar de novo")
  acaoLabel?: string
  onAcao?: () => void
  // duração em ms; undefined = padrão por tipo
  duracao?: number
}

type CtxToast = {
  mostrar: (item: Omit<ToastItem, 'id'>) => number
  fechar: (id: number) => void
}

const Ctx = createContext<CtxToast | null>(null)

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}

const DURACAO: Record<TipoToast, number> = { sucesso: 5000, erro: 8000, info: 5000 }

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const fechar = useCallback((id: number) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setLista((l) => l.filter((t) => t.id !== id))
  }, [])

  const mostrar = useCallback(
    (item: Omit<ToastItem, 'id'>): number => {
      const id = ++seq
      const dur = item.duracao ?? DURACAO[item.tipo]
      setLista((l) => [...l, { ...item, id }])
      const t = setTimeout(() => fechar(id), dur)
      timers.current.set(id, t)
      return id
    },
    [fechar]
  )

  // fecha o toast mais recente com Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setLista((l) => {
        if (l.length === 0) return l
        const ultimo = l[l.length - 1]
        fechar(ultimo.id)
        return l
      })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fechar])

  return (
    <Ctx.Provider value={{ mostrar, fechar }}>
      {children}
      <div className="toast-regiao" aria-live="polite" aria-atomic="false">
        {lista.map((t) => (
          <ToastItem key={t.id} item={t} onFechar={() => fechar(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  )
}

function ToastItem({ item, onFechar }: { item: ToastItem; onFechar: () => void }) {
  return (
    <div className={`toast toast-${item.tipo}`} role="status">
      <span className="toast-mensagem">{item.mensagem}</span>
      <div className="toast-acoes">
        {item.acaoLabel && item.onAcao && (
          <button
            type="button"
            className="toast-btn-acao"
            onClick={() => {
              item.onAcao!()
              onFechar()
            }}
          >
            {item.acaoLabel}
          </button>
        )}
        <button type="button" className="toast-btn-fechar" onClick={onFechar} aria-label="Fechar notificação">
          ×
        </button>
      </div>
    </div>
  )
}
