import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  atualizarEmpresa,
  criarEmpresa,
  criarCttEmpresa,
  listarCttEmpresas,
  type Empresa,
  type CttEmpresa
} from '../../services/api'
import './EmpresaModal.css'

type Props = {
  onFechar: () => void
  onSalvo: () => void
  // se passar a empresa, estamos editando. Se não, estamos criando.
  editando?: Empresa
}

export function EmpresaModal({ onFechar, onSalvo, editando }: Props) {
  const [nome, setNome] = useState(editando?.nome ?? '')
  const [email, setEmail] = useState(editando?.email ?? '')
  const [cnpj, setCnpj] = useState(editando?.cnpj ?? '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Lista de contatos (telefones)
  const [contatos, setContatos] = useState<CttEmpresa[]>([])
  // já nasce carregando quando está editando (os contatos são buscados ao abrir)
  const [carregandoContatos, setCarregandoContatos] = useState(!!editando)

  // Campos para novo contato
  const [addContato, setAddContato] = useState(false)
  const [cttNome, setCttNome] = useState('')
  const [cttTelefone, setCttTelefone] = useState('')
  const [cttEmail, setCttEmail] = useState('')
  const [cttCargo, setCttCargo] = useState('')
  const [cttErro, setCttErro] = useState('')
  const [salvandoCtt, setSalvandoCtt] = useState(false)

  const nomeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nomeRef.current?.focus()
  }, [])

  useEffect(() => {
    if (editando) {
      listarCttEmpresas(editando.id)
        .then(setContatos)
        .catch(() => setErro('Erro ao carregar contatos'))
        .finally(() => setCarregandoContatos(false))
    }
  }, [editando])

  // fecha com esc
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && !salvando && onFechar()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar, salvando])

  async function enviar(ev: FormEvent) {
    ev.preventDefault()
    if (!nome.trim()) return setErro('Nome é obrigatório')

    setSalvando(true)
    setErro('')
    try {
      if (editando) {
        await atualizarEmpresa(editando.id, {
          nome: nome.trim(),
          email: email.trim() || null,
          cnpj: cnpj.trim() || null
        })
      } else {
        await criarEmpresa({
          nome: nome.trim(),
          email: email.trim() || null,
          cnpj: cnpj.trim() || null
        })
      }
      onSalvo()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao salvar')
      setSalvando(false)
    }
  }

  async function salvarContato() {
    if (!cttNome.trim()) return setCttErro('Nome do contato é obrigatório')
    if (!editando) return // Só deveria poder adicionar se estiver editando

    setSalvandoCtt(true)
    setCttErro('')
    try {
      const novo = await criarCttEmpresa({
        empresaId: editando.id,
        nome: cttNome.trim(),
        telefone: cttTelefone.trim() || null,
        email: cttEmail.trim() || null,
        cargo: cttCargo.trim() || null
      })
      setContatos((lista) => [...lista, novo])
      setAddContato(false)
      setCttNome('')
      setCttTelefone('')
      setCttEmail('')
      setCttCargo('')
    } catch (e) {
      setCttErro(e instanceof Error ? e.message : 'Erro ao adicionar contato')
    } finally {
      setSalvandoCtt(false)
    }
  }

  return (
    <div className="modal-overlay">
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
                  <span>Nome *</span>
                  <input
                    ref={nomeRef}
                    value={nome}
                    onChange={(e) => { setNome(e.target.value); setErro('') }}
                    disabled={salvando}
                  />
                </label>
                <label className="modal-campo">
                  <span>CNPJ</span>
                  <input
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    disabled={salvando}
                  />
                </label>
                <label className="modal-campo">
                  <span>E-mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={salvando}
                  />
                </label>
              </div>
            </section>

            {editando && (
              <section className="modal-bloco">
                <h3 className="modal-bloco-titulo" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Contatos / Telefones
                  {!addContato && (
                    <button type="button" className="btn-texto" onClick={() => setAddContato(true)}>
                      + Adicionar
                    </button>
                  )}
                </h3>

                {carregandoContatos && <p>Carregando contatos...</p>}
                
                {!carregandoContatos && contatos.length > 0 && (
                  <ul className="emp-ctt-lista">
                    {contatos.map(c => (
                      <li key={c.id}>
                        <strong>{c.nome}</strong> {c.cargo && `(${c.cargo})`} <br/>
                        {c.telefone && <span>📞 {c.telefone} </span>}
                        {c.email && <span>✉️ {c.email}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {!carregandoContatos && contatos.length === 0 && !addContato && (
                  <p className="emp-ctt-vazio">Nenhum contato cadastrado.</p>
                )}

                {addContato && (
                  <div className="modal-mini-form">
                    <label className="modal-campo">
                      <span>Nome do contato *</span>
                      <input value={cttNome} onChange={e => setCttNome(e.target.value)} />
                    </label>
                    <label className="modal-campo">
                      <span>Telefone</span>
                      <input value={cttTelefone} onChange={e => setCttTelefone(e.target.value)} />
                    </label>
                    <label className="modal-campo">
                      <span>E-mail</span>
                      <input value={cttEmail} onChange={e => setCttEmail(e.target.value)} />
                    </label>
                    <label className="modal-campo">
                      <span>Cargo</span>
                      <input value={cttCargo} onChange={e => setCttCargo(e.target.value)} />
                    </label>
                    {cttErro && <p className="modal-erro modal-span-2">{cttErro}</p>}
                    <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1' }}>
                      <button
                        type="button"
                        className="btn-primario"
                        onClick={salvarContato}
                        disabled={salvandoCtt}
                      >
                        {salvandoCtt ? 'Salvando...' : 'Salvar contato'}
                      </button>
                      <button
                        type="button"
                        className="modal-cancelar"
                        onClick={() => setAddContato(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {erro && <p className="modal-erro">{erro}</p>}
            {!editando && <p className="modal-aviso">Salve a empresa primeiro para adicionar os telefones de contato.</p>}
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

