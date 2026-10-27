import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as KE,
} from 'react'
import './Combobox.css'

export type OpcaoCombo = { valor: string; label: string }

type Props = {
  label: string
  valor: string
  opcoes: OpcaoCombo[]
  onChange: (valor: string) => void
  labelAdicionar?: string
  // quando fornecido, mostra "Criar '<busca>'" em vez do labelAdicionar fixo
  onCriar?: (texto: string) => void
  onAdicionar?: () => void
  placeholder?: string
  disabled?: boolean
  erro?: string
  obrigatorio?: boolean
  autoFocus?: boolean
}

export function Combobox({
  label,
  valor,
  opcoes,
  onChange,
  labelAdicionar,
  onCriar,
  onAdicionar,
  placeholder = 'Selecione ou digite...',
  disabled = false,
  erro,
  obrigatorio = false,
  autoFocus = false,
}: Props) {
  const id = useId()
  const listId = `${id}-lista`
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [cursor, setCursor] = useState(-1)

  const labelAtual = opcoes.find((o) => o.valor === valor)?.label ?? ''

  const filtradas = busca.trim()
    ? opcoes.filter((o) => o.label.toLowerCase().includes(busca.toLowerCase()))
    : opcoes

  // "Criar 'X'" quando há texto digitado sem match exato
  const textoBusca = busca.trim()
  const matchExato = filtradas.some((o) => o.label.toLowerCase() === textoBusca.toLowerCase())
  const mostrarCriar = !!onCriar && textoBusca.length > 0 && !matchExato
  // "Cadastrar" fixo quando não há busca ou há match exato
  const mostrarAdicionar = !!labelAdicionar && !!onAdicionar && !disabled && !mostrarCriar

  const totalOpcoes = filtradas.length + (mostrarCriar || mostrarAdicionar ? 1 : 0)
  const idxEspecial = filtradas.length

  function abrir() {
    if (disabled) return
    setBusca('')
    setCursor(-1)
    setAberto(true)
  }

  function fechar() {
    setAberto(false)
    setBusca('')
    setCursor(-1)
  }

  function selecionar(val: string) {
    onChange(val)
    fechar()
  }

  function aoTeclar(e: KE<HTMLInputElement | HTMLButtonElement>) {
    if (!aberto) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); abrir() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); fechar(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, totalOpcoes - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (cursor >= 0 && cursor < filtradas.length) {
        selecionar(filtradas[cursor].valor)
      } else if (cursor === idxEspecial) {
        if (mostrarCriar) { onCriar!(textoBusca); fechar() }
        else if (mostrarAdicionar) { onAdicionar!(); fechar() }
      }
    }
  }

  useEffect(() => {
    if (!aberto) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) fechar()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [aberto])

  useEffect(() => { setCursor(-1) }, [busca])

  // autoFocus na montagem
  useEffect(() => {
    if (autoFocus && !disabled) {
      // pequeno timeout para garantir que o modal já está no DOM
      const t = setTimeout(() => {
        const btn = containerRef.current?.querySelector<HTMLButtonElement>('button.combo-btn-valor')
        btn?.focus()
      }, 50)
      return () => clearTimeout(t)
    }
  }, [autoFocus, disabled])

  return (
    <div ref={containerRef} className={`combo ${aberto ? 'combo-aberto' : ''} ${disabled ? 'combo-desabilitado' : ''}`}>
      <label htmlFor={id} className="combo-label">{label}</label>

      <div
        className={`combo-controle ${erro ? 'combo-invalido' : ''}`}
        role="combobox"
        aria-expanded={aberto}
        aria-haspopup="listbox"
        aria-owns={listId}
      >
        {aberto ? (
          <input
            id={id}
            ref={inputRef}
            autoFocus
            className="combo-input"
            value={busca}
            placeholder="Filtrar ou digitar para criar..."
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={aoTeclar}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={cursor >= 0 ? `${id}-op-${cursor}` : undefined}
          />
        ) : (
          <button
            id={id}
            type="button"
            className="combo-btn-valor"
            onClick={abrir}
            onKeyDown={(e) => aoTeclar(e)}
            disabled={disabled}
            aria-invalid={!!erro}
          >
            <span className={labelAtual ? '' : 'combo-placeholder'}>
              {labelAtual || placeholder}
            </span>
            <span className="combo-seta" aria-hidden>▾</span>
          </button>
        )}
      </div>

      {aberto && (
        <ul
          id={listId}
          className="combo-lista"
          role="listbox"
          aria-label={label}
        >
          {!obrigatorio && !busca && (
            <li
              role="option"
              aria-selected={valor === ''}
              className={`combo-opcao ${valor === '' ? 'combo-opcao-selecionada' : ''}`}
              onMouseDown={() => selecionar('')}
            >
              <span className="combo-placeholder">Nenhum</span>
            </li>
          )}
          {filtradas.map((o, i) => (
            <li
              key={o.valor}
              id={`${id}-op-${i}`}
              role="option"
              aria-selected={o.valor === valor}
              className={`combo-opcao ${o.valor === valor ? 'combo-opcao-selecionada' : ''} ${cursor === i ? 'combo-opcao-cursor' : ''}`}
              onMouseDown={() => selecionar(o.valor)}
              onMouseEnter={() => setCursor(i)}
            >
              {o.label}
            </li>
          ))}
          {filtradas.length === 0 && !mostrarCriar && !mostrarAdicionar && (
            <li className="combo-vazio">Nenhum resultado</li>
          )}
          {/* "Criar 'X'" dinâmico quando há texto digitado */}
          {mostrarCriar && (
            <li
              id={`${id}-op-${idxEspecial}`}
              role="option"
              aria-selected={false}
              className={`combo-opcao combo-opcao-criar ${cursor === idxEspecial ? 'combo-opcao-cursor' : ''}`}
              onMouseDown={() => { onCriar!(textoBusca); fechar() }}
              onMouseEnter={() => setCursor(idxEspecial)}
            >
              Criar <strong>"{textoBusca}"</strong>
            </li>
          )}
          {/* "+ Cadastrar" fixo quando não há texto de busca */}
          {mostrarAdicionar && (
            <li
              id={`${id}-op-${idxEspecial}`}
              role="option"
              aria-selected={false}
              className={`combo-opcao combo-opcao-adicionar ${cursor === idxEspecial ? 'combo-opcao-cursor' : ''}`}
              onMouseDown={() => { onAdicionar!(); fechar() }}
              onMouseEnter={() => setCursor(idxEspecial)}
            >
              {labelAdicionar}
            </li>
          )}
        </ul>
      )}

      {erro && <span className="combo-erro" role="alert">{erro}</span>}
    </div>
  )
}
