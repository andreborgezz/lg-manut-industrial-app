import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  criarEmpresa,
  criarOrcamento,
  atualizarOrcamento,
  criarSolicitante,
  listarEmpresas,
  listarSolicitantes,
  type Empresa,
  type NovoOrcamentoBody,
  type Orcamento,
  type Solicitante,
} from '../../services/api'
import './NovoOrcamentoModal.css'

// dados que podem vir pré-preenchidos (ex: duplicar um orçamento)
export type InicialOrcamento = Partial<
  Pick<Orcamento, 'empresaId' | 'solicitanteId' | 'maquina' | 'titulo' | 'escopo' | 'valor' | 'prazoDias' | 'fimDeSemana'>
>

type Props = {
  onFechar: () => void
  onSalvo: () => void
  inicial?: InicialOrcamento
  // número do orçamento original, quando é uma cópia
  copiaDe?: number
  // quando preenchido, o modal edita esse orçamento em vez de criar
  editando?: { id: number; numero: number }
}

// valores dos selects que abrem os mini forms
const NOVA_EMPRESA = 'nova'
const NOVO_SOLICITANTE = 'novo'

const CHAVE_EMPRESA = 'lg:ultimaEmpresaId'

const lerEmpresaLembrada = (): string => {
  try {
    return localStorage.getItem(CHAVE_EMPRESA) ?? ''
  } catch {
    return ''
  }
}

const lembrarEmpresa = (id: string) => {
  try {
    localStorage.setItem(CHAVE_EMPRESA, id)
  } catch {
    // sem storage disponível, segue sem lembrar
  }
}

// valor guardado em centavos (só dígitos); exibido como 2.025,00
const formatarCentavos = (centavos: string) =>
  centavos === '' ? '' : (Number(centavos) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const paraCentavos = (v: string | null | undefined) => (v ? String(Math.round(Number(v) * 100)) : '')

const emailOk = (e: string) => /^\S+@\S+\.\S+$/.test(e)

type Erros = Partial<Record<'empresa' | 'solicitante' | 'maquina' | 'valor' | 'prazoDias', string>>

export function NovoOrcamentoModal({ onFechar, onSalvo, inicial, copiaDe, editando }: Props) {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [solicitantes, setSolicitantes] = useState<Solicitante[]>([])

  const [empresaId, setEmpresaId] = useState(inicial?.empresaId ? String(inicial.empresaId) : '')
  const [solicitanteId, setSolicitanteId] = useState(inicial?.solicitanteId ? String(inicial.solicitanteId) : '')
  const [maquina, setMaquina] = useState(inicial?.maquina ?? '')
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [escopo, setEscopo] = useState(inicial?.escopo ?? '')
  const [valor, setValor] = useState(paraCentavos(inicial?.valor))
  // orçamento novo começa com 1 dia; cópia mantém o prazo original
  const [prazoDias, setPrazoDias] = useState(
    inicial ? (inicial.prazoDias != null ? String(inicial.prazoDias) : '') : '1'
  )
  const [fimDeSemana, setFimDeSemana] = useState(inicial?.fimDeSemana ?? false)

  // mini form de empresa nova
  const [novaNome, setNovaNome] = useState('')
  const [novaEmail, setNovaEmail] = useState('')
  const [novaErro, setNovaErro] = useState('')
  const [criandoEmpresa, setCriandoEmpresa] = useState(false)

  // mini form de solicitante novo
  const [solNome, setSolNome] = useState('')
  const [solEmail, setSolEmail] = useState('')
  const [solTelefone, setSolTelefone] = useState('')
  const [solErro, setSolErro] = useState('')
  const [criandoSolicitante, setCriandoSolicitante] = useState(false)

  const [erros, setErros] = useState<Erros>({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const empresaRef = useRef<HTMLSelectElement>(null)

  const criandoNova = empresaId === NOVA_EMPRESA
  const empresaEscolhida = empresaId !== '' && !criandoNova
  const criandoSol = solicitanteId === NOVO_SOLICITANTE

  // foco no primeiro campo ao abrir
  useEffect(() => {
    empresaRef.current?.focus()
  }, [])

  // carrega empresas ao abrir; orçamento novo pré-seleciona a última empresa usada
  useEffect(() => {
    listarEmpresas()
      .then((lista) => {
        setEmpresas(lista)
        if (inicial) return
        const lembrada = lerEmpresaLembrada()
        if (lembrada && lista.some((e) => String(e.id) === lembrada)) setEmpresaId(lembrada)
      })
      .catch((e) => setErro(e.message))
  }, [inicial])

  // solicitantes dependem da empresa escolhida
  useEffect(() => {
    if (!empresaEscolhida) return
    let cancelado = false
    listarSolicitantes(Number(empresaId))
      .then((s) => !cancelado && setSolicitantes(s))
      .catch((e) => !cancelado && setErro(e.message))
    return () => {
      cancelado = true
    }
  }, [empresaId, empresaEscolhida])

  // fecha com esc
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && !salvando && onFechar()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar, salvando])

  // limpa o erro de um campo quando ele é alterado
  const limpar = (campo: keyof Erros) => setErros((x) => ({ ...x, [campo]: undefined }))

  // enter dentro de um mini form salva só o mini form, não o orçamento
  const aoEnter = (salvar: () => void) => (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    salvar()
  }

  async function salvarEmpresa() {
    const nome = novaNome.trim()
    const email = novaEmail.trim()
    if (!nome) return setNovaErro('informe o nome da empresa')
    if (email && !emailOk(email)) return setNovaErro('e-mail inválido')

    setCriandoEmpresa(true)
    setNovaErro('')
    try {
      const nova = await criarEmpresa({ nome, email: email || null })
      setEmpresas((lista) => [...lista, nova].sort((a, b) => a.nome.localeCompare(b.nome)))
      setEmpresaId(String(nova.id))
      lembrarEmpresa(String(nova.id))
      setSolicitanteId('')
      limpar('empresa')
      setNovaNome('')
      setNovaEmail('')
    } catch (e) {
      setNovaErro(e instanceof Error ? e.message : 'erro ao criar empresa')
    } finally {
      setCriandoEmpresa(false)
    }
  }

  async function salvarSolicitante() {
    const nome = solNome.trim()
    const email = solEmail.trim()
    const telefone = solTelefone.trim()
    if (!nome) return setSolErro('informe o nome do solicitante')
    if (email && !emailOk(email)) return setSolErro('e-mail inválido')

    setCriandoSolicitante(true)
    setSolErro('')
    try {
      const novo = await criarSolicitante({
        empresaId: Number(empresaId),
        nome,
        email: email || null,
        telefone: telefone || null,
      })
      setSolicitantes((lista) => [...lista, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
      setSolicitanteId(String(novo.id))
      limpar('solicitante')
      setSolNome('')
      setSolEmail('')
      setSolTelefone('')
    } catch (e) {
      setSolErro(e instanceof Error ? e.message : 'erro ao criar solicitante')
    } finally {
      setCriandoSolicitante(false)
    }
  }

  // validação do front; devolve os erros por campo
  function validar(): Erros {
    const e: Erros = {}
    if (!empresaEscolhida) {
      e.empresa = criandoNova ? 'salve a empresa nova antes de continuar' : 'selecione a empresa'
    }
    if (criandoSol) e.solicitante = 'salve o solicitante novo ou escolha outra opção'
    if (!maquina.trim()) e.maquina = 'informe a máquina'
    if (valor === '') e.valor = 'informe o valor'
    if (prazoDias !== '' && !(Number.isInteger(Number(prazoDias)) && Number(prazoDias) >= 0)) {
      e.prazoDias = 'prazo deve ser um número inteiro de dias'
    }
    return e
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault()
    const encontrados = validar()
    setErros(encontrados)
    if (Object.keys(encontrados).length > 0) return

    const body: NovoOrcamentoBody = {
      empresaId: Number(empresaId),
      solicitanteId: solicitanteId ? Number(solicitanteId) : null,
      maquina: maquina.trim(),
      titulo: titulo.trim() || null,
      escopo: escopo.trim() || null,
      valor: Number(valor) / 100,
      prazoDias: prazoDias !== '' ? Number(prazoDias) : null,
      fimDeSemana,
    }

    setSalvando(true)
    setErro('')
    try {
      if (editando) await atualizarOrcamento(editando.id, body)
      else await criarOrcamento(body)
      onSalvo()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao salvar')
      setSalvando(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <header className="modal-header">
          <h2 id="modal-titulo">
            {editando
              ? `Editar orçamento nº ${editando.numero}`
              : copiaDe
                ? `Novo orçamento (cópia do nº ${copiaDe})`
                : 'Novo orçamento'}
          </h2>
          <button type="button" className="modal-fechar" onClick={onFechar} disabled={salvando} aria-label="Fechar">
            ×
          </button>
        </header>

        <form className="modal-form" ref={formRef} onSubmit={enviar} noValidate>
          <div className="modal-corpo">
            {/* quem */}
            <section className="modal-bloco">
              <h3 className="modal-bloco-titulo">Quem</h3>
              <div className="modal-grade">
                <label className="modal-campo">
                  <span>Empresa *</span>
                  <select
                    ref={empresaRef}
                    value={empresaId}
                    onChange={(e) => {
                      setEmpresaId(e.target.value)
                      setSolicitanteId('')
                      limpar('empresa')
                      if (e.target.value && e.target.value !== NOVA_EMPRESA) lembrarEmpresa(e.target.value)
                    }}
                    aria-invalid={!!erros.empresa}
                    disabled={salvando}
                  >
                    <option value="">Selecione...</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.nome}</option>
                    ))}
                    <option value={NOVA_EMPRESA}>+ Cadastrar empresa nova</option>
                  </select>
                  {erros.empresa && <span className="modal-erro-campo" role="alert">{erros.empresa}</span>}
                </label>

                <label className="modal-campo">
                  <span>Solicitante</span>
                  <select
                    value={solicitanteId}
                    onChange={(e) => {
                      setSolicitanteId(e.target.value)
                      limpar('solicitante')
                    }}
                    aria-invalid={!!erros.solicitante}
                    disabled={!empresaEscolhida || salvando}
                  >
                    <option value="">
                      {empresaEscolhida ? 'Nenhum' : 'Escolha a empresa primeiro'}
                    </option>
                    {solicitantes
                      .filter((s) => s.empresaId === Number(empresaId))
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    {empresaEscolhida && <option value={NOVO_SOLICITANTE}>+ Cadastrar solicitante novo</option>}
                  </select>
                  {erros.solicitante && <span className="modal-erro-campo" role="alert">{erros.solicitante}</span>}
                </label>

                {criandoNova && (
                  <div className="modal-mini-form">
                    <label className="modal-campo">
                      <span>Nome da empresa *</span>
                      <input
                        value={novaNome}
                        onChange={(e) => setNovaNome(e.target.value)}
                        onKeyDown={aoEnter(salvarEmpresa)}
                      />
                    </label>
                    <label className="modal-campo">
                      <span>E-mail</span>
                      <input
                        type="email"
                        value={novaEmail}
                        onChange={(e) => setNovaEmail(e.target.value)}
                        onKeyDown={aoEnter(salvarEmpresa)}
                      />
                    </label>
                    {novaErro && <p className="modal-erro modal-span-2">{novaErro}</p>}
                    <button type="button" className="btn-primario" onClick={salvarEmpresa} disabled={criandoEmpresa}>
                      {criandoEmpresa ? 'Salvando...' : 'Salvar empresa'}
                    </button>
                  </div>
                )}

                {criandoSol && (
                  <div className="modal-mini-form">
                    <label className="modal-campo">
                      <span>Nome do solicitante *</span>
                      <input
                        value={solNome}
                        onChange={(e) => setSolNome(e.target.value)}
                        onKeyDown={aoEnter(salvarSolicitante)}
                      />
                    </label>
                    <label className="modal-campo">
                      <span>E-mail</span>
                      <input
                        type="email"
                        value={solEmail}
                        onChange={(e) => setSolEmail(e.target.value)}
                        onKeyDown={aoEnter(salvarSolicitante)}
                      />
                    </label>
                    <label className="modal-campo">
                      <span>Telefone</span>
                      <input
                        type="tel"
                        value={solTelefone}
                        onChange={(e) => setSolTelefone(e.target.value)}
                        onKeyDown={aoEnter(salvarSolicitante)}
                      />
                    </label>
                    {solErro && <p className="modal-erro modal-span-2">{solErro}</p>}
                    <button
                      type="button"
                      className="btn-primario"
                      onClick={salvarSolicitante}
                      disabled={criandoSolicitante}
                    >
                      {criandoSolicitante ? 'Salvando...' : 'Salvar solicitante'}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* serviço */}
            <section className="modal-bloco">
              <h3 className="modal-bloco-titulo">Serviço</h3>
              <div className="modal-grade">
                <label className="modal-campo">
                  <span>Máquina *</span>
                  <input
                    value={maquina}
                    onChange={(e) => {
                      setMaquina(e.target.value)
                      limpar('maquina')
                    }}
                    aria-invalid={!!erros.maquina}
                    disabled={salvando}
                  />
                  {erros.maquina && <span className="modal-erro-campo" role="alert">{erros.maquina}</span>}
                </label>

                <label className="modal-campo">
                  <span>Título</span>
                  <input value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={salvando} />
                </label>

                <label className="modal-campo modal-span-2">
                  <span>Escopo (Ctrl+Enter salva)</span>
                  <textarea
                    rows={3}
                    value={escopo}
                    onChange={(e) => setEscopo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        formRef.current?.requestSubmit()
                      }
                    }}
                    disabled={salvando}
                  />
                </label>
              </div>
            </section>

            {/* valores */}
            <section className="modal-bloco">
              <h3 className="modal-bloco-titulo">Valores</h3>
              <div className="modal-grade">
                <label className="modal-campo">
                  <span>Valor (R$) *</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={formatarCentavos(valor)}
                    onChange={(e) => {
                      // só dígitos; limita a 12 (numeric(12,2) do banco)
                      const digitos = e.target.value.replace(/\D/g, '').slice(0, 12)
                      setValor(digitos === '' ? '' : String(Number(digitos)))
                      limpar('valor')
                    }}
                    aria-invalid={!!erros.valor}
                    disabled={salvando}
                  />
                  {erros.valor && <span className="modal-erro-campo" role="alert">{erros.valor}</span>}
                </label>
                <label className="modal-campo">
                  <span>Prazo (dias)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={prazoDias}
                    onChange={(e) => {
                      setPrazoDias(e.target.value)
                      limpar('prazoDias')
                    }}
                    aria-invalid={!!erros.prazoDias}
                    disabled={salvando}
                  />
                  {erros.prazoDias && <span className="modal-erro-campo" role="alert">{erros.prazoDias}</span>}
                </label>

                <label className="modal-check modal-span-2">
                  <input
                    type="checkbox"
                    checked={fimDeSemana}
                    onChange={(e) => setFimDeSemana(e.target.checked)}
                    disabled={salvando}
                  />
                  <span>Inclui fim de semana</span>
                </label>
              </div>
            </section>

            {erro && <p className="modal-erro">{erro}</p>}
          </div>

          <footer className="modal-rodape">
            <button type="button" className="modal-cancelar" onClick={onFechar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="btn-primario" disabled={salvando}>
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
