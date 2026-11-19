import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  atualizarEmpresa,
  criarEmpresa,
  criarSolicitante,
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

type SolicitanteRascunho = {
  tempId: number
  nome: string
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

  // Solicitantes existentes (modo edição)
  const [solicitantes, setSolicitantes] = useState<Solicitante[]>([])
  const [carregandoSolicitantes, setCarregandoSolicitantes] = useState(!!editando)

  // Rascunhos (modo criação — salvos junto com a empresa)
  const [rascunhos, setRascunhos] = useState<SolicitanteRascunho[]>([])

  // Campos para novo solicitante
  const [addSolicitante, setAddSolicitante] = useState(false)
  const [solNome, setSolNome] = useState('')
  const [solTelefone, setSolTelefone] = useState('')
  const [solEmail, setSolEmail] = useState('')
  const [solErro, setSolErro] = useState('')
  const [salvandoSol, setSalvandoSol] = useState(false)

  const nomeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nomeRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!editando) return
    listarSolicitantes(editando.id)
      .then(setSolicitantes)
      .catch(() => setErro('Erro ao carregar solicitantes'))
      .finally(() => setCarregandoSolicitantes(false))
  }, [editando])

  // fecha com esc
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && !salvando && onFechar()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar, salvando])

  function limparFormSolicitante() {
    setAddSolicitante(false)
    setSolNome('')
    setSolTelefone('')
    setSolEmail('')
    setSolErro('')
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

        // Solicitantes adicionados durante a criação são gravados junto
        const pendentes = [...rascunhos]
        // Se o mini-form foi preenchido mas o usuário esqueceu de clicar "Adicionar", inclui automaticamente
        if (addSolicitante && solNome.trim()) {
          pendentes.push({
            tempId: Date.now(),
            nome: solNome.trim(),
            telefone: solTelefone.trim(),
            email: solEmail.trim(),
          })
        }

        if (pendentes.length > 0) {
          await Promise.all(
            pendentes.map((s) =>
              criarSolicitante({
                empresaId: salva.id,
                nome: s.nome,
                telefone: s.telefone || null,
                email: s.email || null,
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

  async function salvarSolicitante() {
    if (!solNome.trim()) return setSolErro('Nome do solicitante é obrigatório')

    if (!editando) {
      setRascunhos((lista) => [
        ...lista,
        { tempId: Date.now(), nome: solNome.trim(), telefone: solTelefone.trim(), email: solEmail.trim() },
      ])
      limparFormSolicitante()
      return
    }

    setSalvandoSol(true)
    setSolErro('')
    try {
      const novo = await criarSolicitante({
        empresaId: editando.id,
        nome: solNome.trim(),
        telefone: solTelefone.trim() || null,
        email: solEmail.trim() || null,
      })
      setSolicitantes((lista) => [...lista, novo])
      limparFormSolicitante()
    } catch (e) {
      setSolErro(e instanceof Error ? e.message : 'Erro ao adicionar solicitante')
    } finally {
      setSalvandoSol(false)
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
                <span>Solicitantes</span>
                {!addSolicitante && (
                  <button type="button" className="btn-texto" onClick={() => setAddSolicitante(true)} disabled={salvando}>
                    <Plus size={14} />
                    <span>Adicionar solicitante</span>
                  </button>
                )}
              </h3>

              {carregandoSolicitantes && <p className="emp-ctt-vazio">Carregando solicitantes...</p>}

              {editando && !carregandoSolicitantes && solicitantes.length > 0 && (
                <ul className="emp-ctt-lista">
                  {solicitantes.map((s) => (
                    <li key={s.id} className="emp-ctt-item">
                      <div>
                        <strong>{s.nome}</strong>
                        <div className="emp-ctt-detalhes">
                          {s.telefone && <span>{s.telefone}</span>}
                          {s.email && <span>{s.email}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {!editando && rascunhos.length > 0 && (
                <ul className="emp-ctt-lista">
                  {rascunhos.map((s) => (
                    <li key={s.tempId} className="emp-ctt-item">
                      <div>
                        <strong>{s.nome}</strong>
                        <div className="emp-ctt-detalhes">
                          {s.telefone && <span>{s.telefone}</span>}
                          {s.email && <span>{s.email}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="emp-ctt-remover"
                        onClick={() => setRascunhos((l) => l.filter((x) => x.tempId !== s.tempId))}
                        aria-label={`Remover ${s.nome}`}
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!carregandoSolicitantes &&
                ((editando && solicitantes.length === 0) || (!editando && rascunhos.length === 0)) &&
                !addSolicitante && (
                  <p className="emp-ctt-vazio">
                    Nenhum solicitante adicionado. Você já pode cadastrar aqui antes mesmo de salvar.
                  </p>
                )}

              {addSolicitante && (
                <div className="modal-mini-form">
                  <label className="modal-campo">
                    <span>Nome do solicitante *</span>
                    <input
                      value={solNome}
                      placeholder="Ex: Paulo Henrique"
                      onChange={(e) => {
                        setSolNome(e.target.value)
                        setSolErro('')
                      }}
                    />
                  </label>
                  <label className="modal-campo">
                    <span>Telefone</span>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={solTelefone}
                      onChange={(e) => setSolTelefone(formatarTelefone(e.target.value))}
                    />
                  </label>
                  <label className="modal-campo modal-span-2">
                    <span>E-mail</span>
                    <input
                      type="email"
                      placeholder="nome@empresa.com.br"
                      value={solEmail}
                      onChange={(e) => setSolEmail(e.target.value)}
                    />
                  </label>

                  {solErro && <p className="modal-erro modal-span-2">{solErro}</p>}
                  <div className="emp-mini-acoes">
                    <button
                      type="button"
                      className="btn-primario"
                      onClick={salvarSolicitante}
                      disabled={salvandoSol}
                    >
                      {salvandoSol ? 'Salvando...' : editando ? 'Salvar solicitante' : 'Adicionar na lista'}
                    </button>
                    <button type="button" className="modal-cancelar" onClick={limparFormSolicitante}>
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
