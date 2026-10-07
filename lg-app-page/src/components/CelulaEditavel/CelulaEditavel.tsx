import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import './CelulaEditavel.css'

export type Opcao = { valor: string; label: string }

type Props = {
  valor: string
  tipo: 'texto' | 'data' | 'select'
  opcoes?: Opcao[]
  rotulo: string
  // deve rejeitar se o back recusar; a célula volta ao valor anterior
  onSalvar: (novo: string) => Promise<void>
  renderValor?: (valor: string) => ReactNode
  className?: string
}

export function CelulaEditavel({ valor, tipo, opcoes = [], rotulo, onSalvar, renderValor, className = '' }: Props) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(valor)
  // valor mostrado enquanto o patch está em andamento
  const [otimista, setOtimista] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement & HTMLSelectElement>(null)
  const visao = useRef<HTMLDivElement>(null)
  const encerrado = useRef(false)
  const devolverFoco = useRef(false)

  const salvando = otimista !== null
  const atual = otimista ?? valor

  // ao entrar em edição foca o campo; ao sair por teclado devolve o foco à célula
  useEffect(() => {
    if (editando) {
      campo.current?.focus()
      if (tipo === 'select') {
        try {
          campo.current?.showPicker()
        } catch {
          // navegador sem showPicker: segue com o select fechado
        }
      }
    } else if (devolverFoco.current) {
      devolverFoco.current = false
      visao.current?.focus()
    }
  }, [editando, tipo])

  function abrir() {
    if (salvando) return
    encerrado.current = false
    setRascunho(valor)
    setEditando(true)
  }

  async function confirmar(novo: string) {
    if (encerrado.current) return
    encerrado.current = true
    setEditando(false)
    if (novo === valor) return // sem mudança, sem patch

    setOtimista(novo)
    try {
      await onSalvar(novo)
    } catch {
      // o pai mostra a mensagem; aqui só volta ao valor anterior
    } finally {
      setOtimista(null)
    }
  }

  function cancelar() {
    encerrado.current = true
    devolverFoco.current = true
    setEditando(false)
  }

  function aoTeclarCampo(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      devolverFoco.current = true
      confirmar(rascunho)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelar()
    }
  }

  function aoTeclarVisao(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      abrir()
    }
  }

  if (editando) {
    const comum = {
      ref: campo,
      className: 'celula-campo',
      'aria-label': rotulo,
      onKeyDown: aoTeclarCampo,
      onBlur: () => confirmar(rascunho),
    }
    return tipo === 'select' ? (
      <select
        {...comum}
        value={rascunho}
        onChange={(e) => {
          setRascunho(e.target.value)
          devolverFoco.current = true
          confirmar(e.target.value)
        }}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.label}</option>
        ))}
      </select>
    ) : (
      <input
        {...comum}
        type={tipo === 'data' ? 'date' : 'text'}
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
      />
    )
  }

  const texto = renderValor
    ? renderValor(atual)
    : tipo === 'select'
      ? (opcoes.find((o) => o.valor === atual)?.label ?? '-')
      : atual || '-'

  return (
    <div
      ref={visao}
      className={`celula ${salvando ? 'celula-salvando' : ''} ${className}`}
      role="button"
      tabIndex={0}
      aria-label={`${rotulo}: editar`}
      aria-busy={salvando}
      onClick={abrir}
      onKeyDown={aoTeclarVisao}
    >
      {texto}
    </div>
  )
}
