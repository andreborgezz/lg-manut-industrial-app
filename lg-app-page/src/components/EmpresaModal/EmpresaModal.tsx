import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  atualizarEmpresa,
  criarEmpresa,
  criarSolicitante,
  excluirSolicitante,
  listarSolicitantes,
  type Empresa,
  type Solicitante,
} from '../../services/api'
import './EmpresaModal.css'

type Props = {
  onFechar: () => void
  onSalvo: (empresa?: Empresa) => void
  // se passar a empresa, estamos editando. Se não, estamos criando.
  editando?: Empresa
}

type ContatoRascunho = {
  tempId: number
  nome: string
  cargo: string
  telefone: string
  email: string
}

function formatarCnpj(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function formatarTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function EmpresaModal({ onFechar, onSalvo, editando }: Props) {
  const [nome, setNome] = useState(editando?.nome ?? '')
  const [email, setEmail] = useState(editando?.email ?? '')
  const [cnpj, setCnpj] = useState(editando?.cnpj ? formatarCnpj(editando.cnpj) : '')
  const [telefone, setTelefone] = useState(editando?.telefone ? formatarTelefone(editando.telefone) : '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Contatos existentes (modo edição)
  const [contatos, setContatos] = useState<Solicitante[]>([])
  const [carregandoContatos, setCarregandoContatos] = useState(!!editando)

  // Rascunhos (modo criação — salvos junto com a empresa)
  const [rascunhos, setRascunhos] = useState<ContatoRascunho[]>([])

  // Campos para novo contato
  const [addContato, setAddContato] = useState(false)
  const [cttNome, setCttNome] = useState('')
  const [cttCargo, setCttCargo] = useState('')
  const [cttTelefone, setCttTelefone] = useState('')
  const [cttEmail, setCttEmail] = useState('')
  const [cttErro, setCttErro] = useState('')
  const [salvandoCtt, setSalvandoCtt] = useState(false)

  const nomeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nomeRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!editando) return
    listarSolicitantes(editando.id)
      .then(setContatos)
      .catch(() => setErro('Erro ao carregar contatos'))
      .finally(() => setCarregandoContatos(false))
  }, [editando])

  // fecha com esc
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && !salvando && onFechar()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar, salvando])

  function limparFormContato() {
    setAddContato(false)
    setCttNome('')
    setCttCargo('')
    setCttTelefone('')
    setCttEmail('')
    setCttErro('')
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault()
    if (!nome.trim()) return setErro('Nome é obrigatório')

    setSalvando(true)
    setErro('')
    try {
      const dados = {
        nome: nome.trim(),
        email: email.trim() || null,
        cnpj: cnpj.trim() || null,
        telefone: telefone.trim() || null,
      }
      let salva: Empresa
      if (editando) {
        salva = await atualizarEmpresa(editando.id, dados)
      } else {
        salva = await criarEmpresa(dados)

        // Contatos adicionados durante a criação são gravados junto
        const pendentes = [...rascunhos]
        if (addContato && cttNome.trim()) {
          pendentes.push({
            tempId: Date.now(),
            nome: cttNome.trim(),
            cargo: cttCargo.trim(),
            telefone: cttTelefone.trim(),
            email: cttEmail.trim(),
          })
        }

        if (pendentes.length > 0) {
          await Promise.all(
            pendentes.map((c) =>
              criarSolicitante({
                empresaId: salva.id,
                nome: c.nome,
                cargo: c.cargo || null,
                telefone: c.telefone || null,
                email: c.email || null,
              })
            )
          )
        }
      }
      onSalvo(salva)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao salvar')
      setSalvando(false)
    }
  }

  async function salvarContato() {
    if (!cttNome.trim()) return setCttErro('Nome do contato é obrigatório')

    if (!editando) {
      setRascunhos((lista) => [
        ...lista,
        {
          tempId: Date.now(),
          nome: cttNome.trim(),
          cargo: cttCargo.trim(),
          telefone: cttTelefone.trim(),
          email: cttEmail.trim(),
        },
      ])
      limparFormContato()
      return
    }

    setSalvandoCtt(true)
    setCttErro('')
    try {
      const novo = await criarSolicitante({
        empresaId: editando.id,
        nome: cttNome.trim(),
        cargo: cttCargo.trim() || null,
        telefone: cttTelefone.trim() || null,
        email: cttEmail.trim() || null,
      })
      setContatos((lista) => [...lista, novo])
      limparFormContato()
    } catch (e) {
      setCttErro(e instanceof Error ? e.message : 'Erro ao adicionar contato')
    } finally {
      setSalvandoCtt(false)
    }
  }

  async function removerContatoExistente(contatoId: number) {
    try {
      await excluirSolicitante(contatoId)
      setContatos((lista) => lista.filter((c) => c.id !== contatoId))
    } catch (e) {
      setCttErro(e instanceof Error ? e.message : 'Erro ao remover contato')
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !salvando) onFechar()
      }}
    >
      <div className="modal emp-modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <h2>{editando ? `Editar ${editando.nome}` : 'Nova empresa'}</h2>
          <button type="button" className="modal-fechar" onClick={onFechar} disabled={salvando} aria-label="Fechar">
            ×
          </button>
        </header>

        <form className="modal-form" onSubmit={enviar} noValidate>
          <div className="modal-corpo">
            <section className="modal-bloco">
              <h3 className="modal-bloco-titulo">Dados da Empresa</h3>
              <div className="modal-grade">
                <label className="modal-campo modal-span-2">
                  <span>Nome / Razão Social *</span>
                  <input
                    ref={nomeRef}
                    value={nome}
                    placeholder="Ex: Metalúrgica Vega Ltda"
                    onChange={(e) => {
                      setNome(e.target.value)
                      setErro('')
                    }}
                    disabled={salvando}
                  />
                </label>
                <label className="modal-campo">
                  <span>CNPJ</span>
                  <input
                    value={cnpj}
                    placeholder="00.000.000/0000-00"
                    onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
                    disabled={salvando}
                  />
                </label>
                <label className="modal-campo">
                  <span>Telefone principal</span>
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                    disabled={salvando}
                  />
                </label>
                <label className="modal-campo modal-span-2">
                  <span>E-mail</span>
                  <input
                    type="email"
                    placeholder="contato@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={salvando}
                  />
                </label>
              </div>
            </section>

            <section className="modal-bloco">
              <h3 className="modal-bloco-titulo emp-bloco-topo">
                <span>Contatos</span>
                {!addContato && (
                  <button type="button" className="btn-texto" onClick={() => setAddContato(true)} disabled={salvando}>
                    <Plus size={14} />
                    <span>Adicionar contato</span>
                  </button>
                )}
              </h3>

              {carregandoContatos && <p className="emp-ctt-vazio">Carregando contatos...</p>}

              {editando && !carregandoContatos && contatos.length > 0 && (
                <ul className="emp-ctt-lista">
                  {contatos.map((c) => (
                    <li key={c.id} className="emp-ctt-item">
                      <div>
                        <strong>{c.nome}</strong>
                        {c.cargo && <span className="emp-ctt-cargo">{c.cargo}</span>}
                        <div className="emp-ctt-detalhes">
                          {c.telefone && <span>{c.telefone}</span>}
                          {c.email && <span>{c.email}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="emp-ctt-remover"
                        onClick={() => removerContatoExistente(c.id)}
                        aria-label={`Remover ${c.nome}`}
                        title="Remover contato"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!editando && rascunhos.length > 0 && (
                <ul className="emp-ctt-lista">
                  {rascunhos.map((c) => (
                    <li key={c.tempId} className="emp-ctt-item">
                      <div>
                        <strong>{c.nome}</strong>
                        {c.cargo && <span className="emp-ctt-cargo">{c.cargo}</span>}
                        <div className="emp-ctt-detalhes">
                          {c.telefone && <span>{c.telefone}</span>}
                          {c.email && <span>{c.email}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="emp-ctt-remover"
                        onClick={() => setRascunhos((l) => l.filter((x) => x.tempId !== c.tempId))}
                        aria-label={`Remover ${c.nome}`}
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!carregandoContatos &&
                ((editando && contatos.length === 0) || (!editando && rascunhos.length === 0)) &&
                !addContato && (
                  <p className="emp-ctt-vazio">
                    Nenhum contato cadastrado. Adicione o nome da pessoa e o cargo dela na empresa.
                  </p>
                )}

              {addContato && (
                <div className="modal-mini-form">
                  <label className="modal-campo">
                    <span>Nome *</span>
                    <input
                      value={cttNome}
                      placeholder="Ex: Paulo Henrique"
                      onChange={(e) => {
                        setCttNome(e.target.value)
                        setCttErro('')
                      }}
                    />
                  </label>
                  <label className="modal-campo">
                    <span>Cargo</span>
                    <input
                      value={cttCargo}
                      placeholder="Ex: Comprador / Manutenção"
                      onChange={(e) => setCttCargo(e.target.value)}
                    />
                  </label>
                  <label className="modal-campo">
                    <span>Telefone</span>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={cttTelefone}
                      onChange={(e) => setCttTelefone(formatarTelefone(e.target.value))}
                    />
                  </label>
                  <label className="modal-campo">
                    <span>E-mail</span>
                    <input
                      type="email"
                      placeholder="nome@empresa.com.br"
                      value={cttEmail}
                      onChange={(e) => setCttEmail(e.target.value)}
                    />
                  </label>

                  {cttErro && <p className="modal-erro modal-span-2">{cttErro}</p>}
                  <div className="emp-mini-acoes">
                    <button
                      type="button"
                      className="btn-primario"
                      onClick={salvarContato}
                      disabled={salvandoCtt}
                    >
                      {salvandoCtt ? 'Salvando...' : editando ? 'Salvar contato' : 'Adicionar na lista'}
                    </button>
                    <button type="button" className="modal-cancelar" onClick={limparFormContato}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </section>

            {erro && <p className="modal-erro">{erro}</p>}
          </div>

          <footer className="modal-rodape">
            <button type="button" className="modal-cancelar" onClick={onFechar} disabled={salvando}>
              Fechar
            </button>
            <button type="submit" className="btn-primario" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar empresa'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
