import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  atualizarEmpresa,
  criarEmpresa,
  criarCttEmpresa,
  criarSolicitante,
  listarCttEmpresas,
  listarSolicitantes,
  type Empresa,
  type CttEmpresa,
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
  telefone: string
  email: string
  cargo: string
  tambemSolicitante: boolean
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
  const [endereco, setEndereco] = useState(editando?.endereco ?? '')
  const [observacoes, setObservacoes] = useState(editando?.observacoes ?? '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Contatos & solicitantes existentes (modo edição)
  const [contatos, setContatos] = useState<CttEmpresa[]>([])
  const [solicitantes, setSolicitantes] = useState<Solicitante[]>([])
  const [carregandoContatos, setCarregandoContatos] = useState(!!editando)

  // Rascunhos (modo criação — salvos junto com a empresa)
  const [rascunhos, setRascunhos] = useState<ContatoRascunho[]>([])

  // Campos para novo contato/solicitante
  const [addContato, setAddContato] = useState(false)
  const [cttNome, setCttNome] = useState('')
  const [cttTelefone, setCttTelefone] = useState('')
  const [cttEmail, setCttEmail] = useState('')
  const [cttCargo, setCttCargo] = useState('')
  const [cttTambemSolicitante, setCttTambemSolicitante] = useState(true)
  const [cttErro, setCttErro] = useState('')
  const [salvandoCtt, setSalvandoCtt] = useState(false)

  const nomeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nomeRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!editando) return
    Promise.all([listarCttEmpresas(editando.id), listarSolicitantes(editando.id)])
      .then(([ctts, sols]) => {
        setContatos(ctts)
        setSolicitantes(sols)
      })
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
    setCttTelefone('')
    setCttEmail('')
    setCttCargo('')
    setCttTambemSolicitante(true)
    setCttErro('')
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault()
    if (!nome.trim()) return setErro('Nome é obrigatório')

    setSalvando(true)
    setErro('')
    try {
      let salva: Empresa
      if (editando) {
        salva = await atualizarEmpresa(editando.id, {
          nome: nome.trim(),
          email: email.trim() || null,
          cnpj: cnpj.trim() || null,
          telefone: telefone.trim() || null,
          endereco: endereco.trim() || null,
          observacoes: observacoes.trim() || null,
        })
      } else {
        salva = await criarEmpresa({
          nome: nome.trim(),
          email: email.trim() || null,
          cnpj: cnpj.trim() || null,
          telefone: telefone.trim() || null,
          endereco: endereco.trim() || null,
          observacoes: observacoes.trim() || null,
        })

        // Se houver contatos/solicitantes adicionados durante a criação, grava todos junto
        const pendentes = [...rascunhos]
        // Se o usuário preencheu o mini-form de contato mas esqueceu de clicar "Adicionar", inclui automaticamente
        if (addContato && cttNome.trim()) {
          pendentes.push({
            tempId: Date.now(),
            nome: cttNome.trim(),
            telefone: cttTelefone.trim(),
            email: cttEmail.trim(),
            cargo: cttCargo.trim(),
            tambemSolicitante: cttTambemSolicitante,
          })
        }

        if (pendentes.length > 0) {
          await Promise.all(
            pendentes.flatMap((c) => {
              const chamadas: Promise<unknown>[] = [
                criarCttEmpresa({
                  empresaId: salva.id,
                  nome: c.nome,
                  telefone: c.telefone || null,
                  email: c.email || null,
                  cargo: c.cargo || null,
                }),
              ]
              if (c.tambemSolicitante) {
                chamadas.push(
                  criarSolicitante({
                    empresaId: salva.id,
                    nome: c.nome,
                    telefone: c.telefone || null,
                    email: c.email || null,
                  })
                )
              }
              return chamadas
            })
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
          telefone: cttTelefone.trim(),
          email: cttEmail.trim(),
          cargo: cttCargo.trim(),
          tambemSolicitante: cttTambemSolicitante,
        },
      ])
      limparFormContato()
      return
    }

    setSalvandoCtt(true)
    setCttErro('')
    try {
      const novo = await criarCttEmpresa({
        empresaId: editando.id,
        nome: cttNome.trim(),
        telefone: cttTelefone.trim() || null,
        email: cttEmail.trim() || null,
        cargo: cttCargo.trim() || null,
      })
      setContatos((lista) => [...lista, novo])

      if (cttTambemSolicitante) {
        const jaExiste = solicitantes.some(
          (s) => s.nome.toLowerCase() === cttNome.trim().toLowerCase()
        )
        if (!jaExiste) {
          const novoSol = await criarSolicitante({
            empresaId: editando.id,
            nome: cttNome.trim(),
            telefone: cttTelefone.trim() || null,
            email: cttEmail.trim() || null,
          })
          setSolicitantes((lista) => [...lista, novoSol])
        }
      }

      limparFormContato()
    } catch (e) {
      setCttErro(e instanceof Error ? e.message : 'Erro ao adicionar contato')
    } finally {
      setSalvandoCtt(false)
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
                <label className="modal-campo modal-span-2">
                  <span>Endereço</span>
                  <input
                    value={endereco}
                    placeholder="Rua, número, bairro, cidade - UF"
                    onChange={(e) => setEndereco(e.target.value)}
                    disabled={salvando}
                  />
                </label>
                <label className="modal-campo modal-span-2">
                  <span>Observações</span>
                  <input
                    value={observacoes}
                    placeholder="Ex: Condição de pagamento, horário de recebimento..."
                    onChange={(e) => setObservacoes(e.target.value)}
                    disabled={salvando}
                  />
                </label>
              </div>
            </section>

            <section className="modal-bloco">
              <h3 className="modal-bloco-titulo emp-bloco-topo">
                <span>Contatos & Solicitantes</span>
                {!addContato && (
                  <button type="button" className="btn-texto" onClick={() => setAddContato(true)} disabled={salvando}>
                    <Plus size={14} />
                    <span>Adicionar pessoa</span>
                  </button>
                )}
              </h3>

              {carregandoContatos && <p className="emp-ctt-vazio">Carregando contatos...</p>}

              {editando && !carregandoContatos && contatos.length > 0 && (
                <ul className="emp-ctt-lista">
                  {contatos.map((c) => {
                    const ehSolicitante = solicitantes.some(
                      (s) => s.nome.toLowerCase() === c.nome.toLowerCase()
                    )
                    return (
                      <li key={c.id} className="emp-ctt-item">
                        <div>
                          <strong>{c.nome}</strong> {c.cargo && <span className="emp-ctt-cargo">({c.cargo})</span>}
                          {ehSolicitante && <span className="emp-ctt-badge">Solicitante</span>}
                          <div className="emp-ctt-detalhes">
                            {c.telefone && <span>{c.telefone}</span>}
                            {c.email && <span>{c.email}</span>}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {!editando && rascunhos.length > 0 && (
                <ul className="emp-ctt-lista">
                  {rascunhos.map((c) => (
                    <li key={c.tempId} className="emp-ctt-item">
                      <div>
                        <strong>{c.nome}</strong> {c.cargo && <span className="emp-ctt-cargo">({c.cargo})</span>}
                        {c.tambemSolicitante && <span className="emp-ctt-badge">Solicitante</span>}
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
                    Nenhum contato adicionado. Você já pode cadastrar aqui antes mesmo de salvar.
                  </p>
                )}

              {addContato && (
                <div className="modal-mini-form">
                  <label className="modal-campo">
                    <span>Nome do contato *</span>
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
                    <span>Telefone / WhatsApp</span>
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
                  <label className="modal-campo">
                    <span>Cargo</span>
                    <input
                      value={cttCargo}
                      placeholder="Ex: Comprador / Manutenção"
                      onChange={(e) => setCttCargo(e.target.value)}
                    />
                  </label>

                  <label className="emp-ctt-check modal-span-2">
                    <input
                      type="checkbox"
                      checked={cttTambemSolicitante}
                      onChange={(e) => setCttTambemSolicitante(e.target.checked)}
                    />
                    <span>Também cadastrar como solicitante de orçamentos</span>
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
                    <button
                      type="button"
                      className="modal-cancelar"
                      onClick={limparFormContato}
                    >
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
