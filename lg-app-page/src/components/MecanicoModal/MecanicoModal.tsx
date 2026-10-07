import { useEffect, useRef, useState, type FormEvent } from 'react'
import { atualizarMecanico, criarMecanico, type Mecanico } from '../../services/api'
// reaproveita o estilo base dos modais (.modal, .modal-campo, ...)
import '../NovoOrcamentoModal/NovoOrcamentoModal.css'
import './MecanicoModal.css'

type Props = {
  onFechar: () => void
  onSalvo: () => void
  // com mecânico é edição; sem, é cadastro
  editando?: Mecanico
}

export function MecanicoModal({ onFechar, onSalvo, editando }: Props) {
  const [nome, setNome] = useState(editando?.nome ?? '')
  const [erroNome, setErroNome] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const nomeRef = useRef<HTMLInputElement>(null)

  // foco no primeiro campo ao abrir
  useEffect(() => {
    nomeRef.current?.focus()
  }, [])

  // fecha com esc
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
      if (editando) await atualizarMecanico(editando.id, { nome: nome.trim() })
      else await criarMecanico({ nome: nome.trim() })
      onSalvo()
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
