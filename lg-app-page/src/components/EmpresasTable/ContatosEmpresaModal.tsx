import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  atualizarSolicitante,
  criarSolicitante,
  excluirSolicitante,
  listarSolicitantes,
  type Empresa,
  type EmpresaContato,
  type Solicitante,
} from '../../services/api'
import '../EmpresaModal/EmpresaModal.css'

type Props = {
  empresa: Empresa
  onFechar: () => void
  onAtualizado: (empresaId: number, contatos: EmpresaContato[]) => void
}

function formatarTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function ContatosEmpresaModal({ empresa, onFechar, onAtualizado }: Props) {
  const [contatos, setContatos] = useState<Solicitante[]>(() =>
    (empresa.contatos ?? []).map((c) => ({ ...c, empresaId: empresa.id }))
  )
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [formAberto, setFormAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let cancelado = false
    listarSolicitantes(empresa.id)
      .then((dados) => {
        if (cancelado) return
        setContatos(dados)
        onAtualizado(empresa.id, dados)
      })
      .catch(() => !cancelado && setErro('Erro ao carregar contatos'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa.id])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && !salvando && onFechar()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar, salvando])

  function limparForm() {
    setFormAberto(false)
    setEditandoId(null)
    setNome('')
    setCargo('')
    setTelefone('')
    setEmail('')
    setErro('')
  }

  function iniciarEdicao(c: Solicitante) {
    setEditandoId(c.id)
    setNome(c.nome)
    setCargo(c.cargo ?? '')
    setTelefone(c.telefone ? formatarTelefone(c.telefone) : '')
    setEmail(c.email ?? '')
    setErro('')
    setFormAberto(true)
  }

  async function salvarContato() {
    if (!nome.trim()) return setErro('Nome do contato é obrigatório')
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        nome: nome.trim(),
        cargo: cargo.trim() || null,
        telefone: telefone.trim() || null,
        email: email.trim() || null,
      }
      let proximaLista: Solicitante[]
      if (editandoId !== null) {
        const atualizado = await atualizarSolicitante(editandoId, payload)
        proximaLista = contatos.map((c) => (c.id === atualizado.id ? atualizado : c))
      } else {
        const novo = await criarSolicitante({ empresaId: empresa.id, ...payload })
        proximaLista = [...contatos, novo]
      }
      setContatos(proximaLista)
      onAtualizado(empresa.id, proximaLista)
      limparForm()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar contato')
    } finally {
      setSalvando(false)
    }
  }

  async function removerContato(id: number) {
    try {
      await excluirSolicitante(id)
      const proximaLista = contatos.filter((c) => c.id !== id)
      setContatos(proximaLista)
      onAtualizado(empresa.id, proximaLista)
      if (editandoId === id) limparForm()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover contato')
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !salvando) onFechar()
      }}
    >
      <div className="modal emp-modal" role="dialog" aria-modal="true" aria-labelledby="ctt-modal-titulo">
        <header className="modal-header">
          <h2 id="ctt-modal-titulo">Contatos — {empresa.nome}</h2>
          <button type="button" className="modal-fechar" onClick={onFechar} disabled={salvando} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="modal-corpo">
          <div className="modal-bloco">
            <h3 className="modal-bloco-titulo emp-bloco-topo">
              <span>Contatos cadastrados ({contatos.length})</span>
              {!formAberto && (
                <button
                  type="button"
                  className="btn-texto"
                  onClick={() => { limparForm(); setFormAberto(true) }}
                >
                  <Plus size={14} />
                  <span>Adicionar contato</span>
                </button>
              )}
            </h3>

            {carregando && contatos.length === 0 && <p className="emp-ctt-vazio">Carregando contatos...</p>}

            {!carregando && contatos.length === 0 && !formAberto && (
              <p className="emp-ctt-vazio">Nenhum contato cadastrado nesta empresa.</p>
            )}

            {contatos.length > 0 && (
              <ul className="emp-ctt-lista">
                {contatos.map((c) => (
                  <li key={c.id} className={`emp-ctt-item ${editandoId === c.id ? 'emp-ctt-item-ativo' : ''}`}>
                    <div className="emp-ctt-info">
                      <div className="emp-ctt-cabecalho">
                        <strong>{c.nome}</strong>
                        {c.cargo && <span className="emp-ctt-badge">{c.cargo}</span>}
                      </div>
                      {(c.telefone || c.email) && (
                        <div className="emp-ctt-detalhes">
                          {c.telefone && <span>{c.telefone}</span>}
                          {c.email && <span>{c.email}</span>}
                        </div>
                      )}
                    </div>
                    <div className="emp-ctt-acoes">
                      <button
                        type="button"
                        className="emp-ctt-editar"
                        onClick={() => iniciarEdicao(c)}
                        aria-label={`Editar ${c.nome}`}
                        title="Editar contato"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="emp-ctt-remover"
                        onClick={() => removerContato(c.id)}
                        aria-label={`Remover ${c.nome}`}
                        title="Remover contato"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {formAberto && (
              <div className="modal-mini-form">
                <label className="modal-campo">
                  <span>Nome *</span>
                  <input
                    value={nome}
                    placeholder="Ex: Paulo Henrique"
                    onChange={(e) => { setNome(e.target.value); setErro('') }}
                    disabled={salvando}
                  />
                </label>
                <label className="modal-campo">
                  <span>Cargo</span>
                  <input
                    value={cargo}
                    placeholder="Ex: Comprador / Manutenção"
                    onChange={(e) => setCargo(e.target.value)}
                    disabled={salvando}
                  />
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
                  <span>E-mail</span>
                  <input
                    type="email"
                    placeholder="nome@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={salvando}
                  />
                </label>
                {erro && <p className="modal-erro modal-span-2">{erro}</p>}
                <div className="emp-mini-acoes">
                  <button type="button" className="btn-primario" onClick={salvarContato} disabled={salvando}>
                    {salvando ? 'Salvando...' : editandoId !== null ? 'Atualizar contato' : 'Salvar contato'}
                  </button>
                  <button type="button" className="modal-cancelar" onClick={limparForm} disabled={salvando}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {erro && !formAberto && <p className="modal-erro">{erro}</p>}
          </div>
        </div>

        <footer className="modal-rodape">
          <button type="button" className="btn-primario" onClick={onFechar} disabled={salvando}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}
