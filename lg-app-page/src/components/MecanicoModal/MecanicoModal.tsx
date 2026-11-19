import { useEffect, useRef, useState, type FormEvent } from 'react'
import { atualizarMecanico, criarMecanico, type Mecanico } from '../../services/api'
import '../NovoOrcamentoModal/NovoOrcamentoModal.css'
import './MecanicoModal.css'

type Props = {
  onFechar: () => void
  onSalvo: (mecanico: Mecanico) => void
  editando?: Mecanico
}

function formatarTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function MecanicoModal({ onFechar, onSalvo, editando }: Props) {
  const [nome, setNome] = useState(editando?.nome ?? '')
  const [telefone, setTelefone] = useState(editando?.telefone ? formatarTelefone(editando.telefone) : '')
  const [descricao, setDescricao] = useState(editando?.descricao ?? '')
  const [ativo, setAtivo] = useState(editando?.ativo ?? true)
  const [erroNome, setErroNome] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const nomeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nomeRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && !salvando && onFechar()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar, salvando])

  async function enviar(ev: FormEvent) {
    ev.preventDefault()
    if (!nome.trim()) return setErroNome('informe o nome do mecânico')

    setSalvando(true)
    setErro('')
    try {
      const tel = telefone.trim() || null
      const desc = descricao.trim() || null
      const salvo = editando
        ? await atualizarMecanico(editando.id, { nome: nome.trim(), telefone: tel, descricao: desc, ativo })
        : await criarMecanico({ nome: nome.trim(), telefone: tel, descricao: desc })
      onSalvo(salvo)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'erro ao salvar')
      setSalvando(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal mec-modal" role="dialog" aria-modal="true" aria-labelledby="mec-modal-titulo">
        <header className="modal-header">
          <h2 id="mec-modal-titulo">{editando ? `Editar ${editando.nome}` : 'Novo mecânico'}</h2>
          <button type="button" className="modal-fechar" onClick={onFechar} disabled={salvando} aria-label="Fechar">
            ×
          </button>
        </header>

        <form className="modal-form" onSubmit={enviar} noValidate>
          <div className="modal-corpo">
            <label className="modal-campo">
              <span>Nome *</span>
              <input
                ref={nomeRef}
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  setErroNome('')
                }}
                aria-invalid={!!erroNome}
                disabled={salvando}
              />
              {erroNome && <span className="modal-erro-campo" role="alert">{erroNome}</span>}
            </label>

            <label className="modal-campo">
              <span>Telefone</span>
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                disabled={salvando}
              />
            </label>

            <label className="modal-campo">
              <span>Descrição / Área</span>
              <input
                type="text"
                placeholder="Ex: Hidráulica, Torno CNC, Solda..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                disabled={salvando}
              />
            </label>

            {editando && (
              <label className="modal-campo mec-modal-status">
                <span>Status</span>
                <div className="mec-modal-toggle">
                  <button
                    type="button"
                    className={`mec-status-btn ${ativo ? 'mec-status-ativo' : ''}`}
                    onClick={() => setAtivo(true)}
                    disabled={salvando}
                  >
                    Ativo
                  </button>
                  <button
                    type="button"
                    className={`mec-status-btn ${!ativo ? 'mec-status-inativo' : ''}`}
                    onClick={() => setAtivo(false)}
                    disabled={salvando}
                  >
                    Inativo
                  </button>
                </div>
              </label>
            )}

            {erro && <p className="modal-erro">{erro}</p>}
          </div>

          <footer className="modal-rodape">
            <button type="button" className="modal-cancelar" onClick={onFechar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="btn-primario" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
