import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  criarEmpresa,
  criarOrcamento,
  atualizarOrcamento,
  criarSolicitante,
  listarEmpresas,
  listarMecanicos,
  listarOrcamentosRecentes,
  listarSolicitantes,
  type Empresa,
  type Mecanico,
  type NovoOrcamentoBody,
  type Orcamento,
  type OrcamentoRecente,
  type Solicitante,
} from '../../services/api'
import { Minus, Plus } from 'lucide-react'
import { Combobox, type OpcaoCombo } from '../Combobox/Combobox'
import './NovoOrcamentoModal.css'

export type InicialOrcamento = Partial<
  Pick<Orcamento, 'empresaId' | 'solicitanteId' | 'mecanicoId' | 'maquina' | 'titulo' | 'escopo' | 'valor' | 'prazoDias' | 'fimDeSemana'>
>

type Props = {
  onFechar: () => void
  onSalvo: (orc: Orcamento, gerarPdf?: boolean) => void
  inicial?: InicialOrcamento
  copiaDe?: number
  editando?: { id: number; numero: number }
}

const CHAVE_MECANICO = 'lg:ultimoMecanicoId'
const lerMecanicoLembrado = (): string => { try { return localStorage.getItem(CHAVE_MECANICO) ?? '' } catch { return '' } }
const lembrarMecanico = (id: string) => { try { localStorage.setItem(CHAVE_MECANICO, id) } catch { /* sem storage */ } }

// máscara BRL da direita pra esquerda: centavos como inteiro
const formatarCentavos = (c: string) =>
  c === '' ? '' : (Number(c) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const paraCentavos = (v: string | null | undefined) =>
  v ? String(Math.round(Number(v) * 100)) : ''

// data de hoje no formato yyyy-mm-dd (local)
function hoje(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

type Erros = Partial<Record<'empresa' | 'solicitante' | 'titulo' | 'valor' | 'prazoDias', string>>

export function NovoOrcamentoModal({ onFechar, onSalvo, inicial, copiaDe, editando }: Props) {
  const formRef = useRef<HTMLFormElement>(null)

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [solicitantes, setSolicitantes] = useState<Solicitante[]>([])
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])

  const [empresaId, setEmpresaId] = useState(inicial?.empresaId ? String(inicial.empresaId) : '')
  const [solicitanteId, setSolicitanteId] = useState(inicial?.solicitanteId ? String(inicial.solicitanteId) : '')
  const [mecanicoId, setMecanicoId] = useState(
    inicial?.mecanicoId ? String(inicial.mecanicoId) : lerMecanicoLembrado()
  )
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [escopo, setEscopo] = useState(inicial?.escopo ?? '')
  const [valor, setValor] = useState(paraCentavos(inicial?.valor))
  const [prazoDias, setPrazoDias] = useState(
    inicial ? (inicial.prazoDias != null ? String(inicial.prazoDias) : '') : '1'
  )
  const [fimDeSemana, setFimDeSemana] = useState(inicial?.fimDeSemana ?? false)
  const [entradaEm, setEntradaEm] = useState(hoje())

  const [recentes, setRecentes] = useState<OrcamentoRecente[]>([])
  const [erros, setErros] = useState<Erros>({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const empresaEscolhida = empresaId !== ''

  // carrega dados iniciais
  useEffect(() => {
    Promise.all([listarEmpresas(), listarMecanicos()])
      .then(([emp, mec]) => {
        setEmpresas(emp)
        setMecanicos(mec)
      })
      .catch((e) => setErro(e.message))
  }, [])

  // solicitantes e recentes da empresa selecionada
  useEffect(() => {
    if (!empresaEscolhida) { setSolicitantes([]); setRecentes([]); return }
    let cancelado = false
    listarSolicitantes(Number(empresaId))
      .then((s) => {
        if (cancelado) return
        setSolicitantes(s)
        if (s.length === 1 && !solicitanteId) setSolicitanteId(String(s[0].id))
      })
      .catch((e) => !cancelado && setErro(e.message))
    // orçamentos recentes da empresa para reutilização
    if (!editando) {
      listarOrcamentosRecentes(Number(empresaId))
        .then((r) => { if (!cancelado) setRecentes(r) })
        .catch(() => { /* silencia: recentes são opcionais */ })
    }
    return () => { cancelado = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, empresaEscolhida])

  // Esc fecha (exceto ao salvar)
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !salvando) onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar, salvando])

  // Ctrl+Enter salva de qualquer campo
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (formRef.current?.contains(document.activeElement)) {
          e.preventDefault()
          formRef.current.requestSubmit()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const limpar = (campo: keyof Erros) => setErros((x) => ({ ...x, [campo]: undefined }))

  // cria empresa inline via "Criar 'X'" no combobox
  async function criarEmpresaRapido(nome: string) {
    try {
      const nova = await criarEmpresa({ nome })
      setEmpresas((l) => [...l, nova].sort((a, b) => a.nome.localeCompare(b.nome)))
      setEmpresaId(String(nova.id))
      setSolicitanteId('')
      limpar('empresa')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'erro ao criar empresa')
    }
  }

  // cria solicitante inline via "Criar 'X'" no combobox
  async function criarSolicitanteRapido(nome: string) {
    try {
      const novo = await criarSolicitante({ empresaId: Number(empresaId), nome, email: null, telefone: null })
      setSolicitantes((l) => [...l, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
      setSolicitanteId(String(novo.id))
      limpar('solicitante')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'erro ao criar solicitante')
    }
  }

  function aplicarRecente(r: OrcamentoRecente) {
    if (r.titulo) setTitulo(r.titulo)
    if (r.escopo) setEscopo(r.escopo)
    if (r.valor != null) setValor(paraCentavos(r.valor))
    limpar('titulo')
    limpar('valor')
  }

  function validar(): Erros {
    const e: Erros = {}
    if (!empresaEscolhida) e.empresa = 'selecione a empresa'
    if (!titulo.trim()) e.titulo = 'informe o título'
    if (valor === '') e.valor = 'informe o valor'
    if (prazoDias !== '' && !(Number.isInteger(Number(prazoDias)) && Number(prazoDias) >= 1 && Number(prazoDias) <= 365)) {
      e.prazoDias = 'deve ser entre 1 e 365'
    }
    return e
  }

  function montarBody(): NovoOrcamentoBody & { entradaEm?: string } {
    return {
      empresaId: Number(empresaId),
      solicitanteId: solicitanteId ? Number(solicitanteId) : null,
      mecanicoId: mecanicoId ? Number(mecanicoId) : null,
      titulo: titulo.trim() || null,
      escopo: escopo.trim() || null,
      valor: Number(valor) / 100,
      prazoDias: prazoDias !== '' ? Number(prazoDias) : null,
      fimDeSemana,
      entradaEm,
    }
  }

  async function enviar(ev: FormEvent, gerarPdfApos = false) {
    ev.preventDefault()
    const encontrados = validar()
    setErros(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setSalvando(true)
    setErro('')
    try {
      let orc: Orcamento
      if (editando) {
        orc = await atualizarOrcamento(editando.id, montarBody()) as unknown as Orcamento
      } else {
        orc = await criarOrcamento(montarBody())
      }
      if (mecanicoId) lembrarMecanico(mecanicoId)
      onSalvo(orc, gerarPdfApos)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao salvar')
      setSalvando(false)
    }
  }

  // enter em campo normal avança para o próximo (não submete)
  function aoEnterAvanca(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return
    const form = formRef.current
    if (!form) return
    const focaveis = Array.from(
      form.querySelectorAll<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])')
    ).filter((el) => !el.closest('[data-prazo-chips]'))
    const atual = document.activeElement as HTMLElement
    const idx = focaveis.indexOf(atual)
    if (idx >= 0 && idx < focaveis.length - 1) {
      e.preventDefault()
      focaveis[idx + 1].focus()
    }
  }

  const opcoesEmpresa: OpcaoCombo[] = empresas.map((e) => ({ valor: String(e.id), label: e.nome }))
  const opcoesSolicitante: OpcaoCombo[] = solicitantes
    .filter((s) => s.empresaId === Number(empresaId))
    .map((s) => ({ valor: String(s.id), label: s.nome }))
  const opcoesMecanico: OpcaoCombo[] = mecanicos.map((m) => ({ valor: String(m.id), label: m.nome }))

  // preview das linhas de escopo como bullets
  const linhasEscopo = escopo.split('\n').map((l) => l.trim()).filter(Boolean)

  // botão salvar desabilitado: explica o motivo
  const motivoBloqueio = salvando
    ? 'Salvando...'
    : !empresaEscolhida
      ? 'Selecione a empresa'
      : !titulo.trim()
        ? 'Informe o título'
        : valor === ''
          ? 'Informe o valor'
          : ''

  const tituloPrincipal = editando
    ? `Editar orçamento nº ${editando.numero}`
    : copiaDe
      ? `Novo orçamento (cópia do nº ${copiaDe})`
      : 'Novo orçamento'

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !salvando) onFechar() }}
    >
      <div className="modal modal-orc" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <header className="modal-header">
          <h2 id="modal-titulo">{tituloPrincipal}</h2>
          <button type="button" className="modal-fechar" onClick={onFechar} disabled={salvando} aria-label="Fechar">×</button>
        </header>

        <form
          className="modal-form"
          ref={formRef}
          onSubmit={(e) => enviar(e, false)}
          noValidate
        >
          {/* layout duas colunas: campos | preview */}
          <div className="modal-corpo-duplo">

            {/* coluna esquerda: campos */}
            <div className="modal-campos" onKeyDown={aoEnterAvanca}>

              {/* linha 1: empresa + solicitante */}
              <div className="modal-linha">
                <Combobox
                  label="Empresa *"
                  valor={empresaId}
                  opcoes={opcoesEmpresa}
                  obrigatorio
                  autoFocus={!inicial}
                  onChange={(v) => {
                    setEmpresaId(v)
                    setSolicitanteId('')
                    limpar('empresa')
                  }}
                  onCriar={criarEmpresaRapido}
                  labelAdicionar="+ Cadastrar empresa"
                  onAdicionar={() => { /* abrir modal de empresa se quiser fluxo completo */ }}
                  placeholder="Buscar empresa..."
                  disabled={salvando}
                  erro={erros.empresa}
                />

                <Combobox
                  label="Solicitante"
                  valor={solicitanteId}
                  opcoes={opcoesSolicitante}
                  onChange={(v) => { setSolicitanteId(v); limpar('solicitante') }}
                  onCriar={empresaEscolhida ? criarSolicitanteRapido : undefined}
                  placeholder={empresaEscolhida ? 'Buscar solicitante...' : 'Escolha a empresa primeiro'}
                  disabled={!empresaEscolhida || salvando}
                  erro={erros.solicitante}
                />
              </div>

              {/* recentes da empresa: reutilizar título/escopo/valor com 1 clique */}
              {!editando && recentes.length > 0 && (
                <div className="modal-recentes">
                  <span className="modal-recentes-label">Reutilizar de recente:</span>
                  {recentes.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="modal-recente-chip"
                      onClick={() => aplicarRecente(r)}
                      disabled={salvando}
                      title={r.escopo ?? r.titulo ?? `Orçamento nº ${r.numero}`}
                    >
                      nº {r.numero}{r.titulo ? ` – ${r.titulo.slice(0, 30)}${r.titulo.length > 30 ? '…' : ''}` : ''}
                    </button>
                  ))}
                </div>
              )}

              {/* linha 2: título (campo principal, span total) */}
              <div className="modal-linha">
                <label className="modal-campo modal-campo-full">
                  <span>Título *</span>
                  <input
                    value={titulo}
                    onChange={(e) => { setTitulo(e.target.value); limpar('titulo') }}
                    onBlur={() => { if (!titulo.trim()) setErros((x) => ({ ...x, titulo: 'informe o título' })) }}
                    placeholder="Ex: Manutenção preventiva bomba hidráulica"
                    aria-invalid={!!erros.titulo}
                    disabled={salvando}
                  />
                  {erros.titulo && <span className="modal-erro-campo" role="alert">{erros.titulo}</span>}
                </label>
              </div>

              {/* linha 3: escopo (textarea, sem preview inline — fica na coluna direita) */}
              <div className="modal-linha">
                <label className="modal-campo modal-campo-full">
                  <span>Escopo <span className="modal-dica-tecla">Enter = nova linha · Ctrl+Enter = salvar</span></span>
                  <textarea
                    rows={4}
                    value={escopo}
                    onChange={(e) => setEscopo(e.target.value)}
                    onKeyDown={(e) => {
                      // Ctrl+Enter no textarea submete o form
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault()
                        formRef.current?.requestSubmit()
                      }
                      // Enter normal no textarea = nova linha (comportamento padrão)
                    }}
                    placeholder="Uma linha por item do serviço..."
                    disabled={salvando}
                  />
                </label>
              </div>

              {/* linha 4: valor + prazo */}
              <div className="modal-linha">
                <label className="modal-campo">
                  <span>Valor (R$) *</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={formatarCentavos(valor)}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 12)
                      setValor(d === '' ? '' : String(Number(d)))
                      limpar('valor')
                    }}
                    onBlur={() => { if (valor === '') setErros((x) => ({ ...x, valor: 'informe o valor' })) }}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    aria-invalid={!!erros.valor}
                    disabled={salvando}
                    className="modal-input-valor"
                  />
                  {erros.valor && <span className="modal-erro-campo" role="alert">{erros.valor}</span>}
                </label>

                <div className="modal-campo">
                  <span>Prazo (dias)</span>
                  <div className="prazo-stepper" data-prazo-chips>
                    <button
                      type="button"
                      className="prazo-step-btn"
                      onClick={() => setPrazoDias((p) => p === '' ? '' : String(Math.max(1, Number(p) - 1)))}
                      disabled={salvando || prazoDias === '' || Number(prazoDias) <= 1}
                      aria-label="Diminuir prazo"
                      tabIndex={-1}
                    ><Minus size={16} /></button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={prazoDias}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 3)
                        setPrazoDias(v)
                      }}
                      onBlur={(e) => {
                        const v = e.target.value.replace(/\D/g, '')
                        if (v === '' || Number(v) < 1) setPrazoDias('1')
                        else if (Number(v) > 365) setPrazoDias('365')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setPrazoDias((p) => String(Math.min(365, (Number(p) || 0) + 1)))
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setPrazoDias((p) => p === '' ? '' : String(Math.max(1, Number(p) - 1)))
                        }
                      }}
                      aria-label="Prazo em dias"
                      disabled={salvando}
                      className="prazo-input"
                    />
                    <button
                      type="button"
                      className="prazo-step-btn"
                      onClick={() => setPrazoDias((p) => String(Math.min(365, (Number(p) || 0) + 1)))}
                      disabled={salvando || Number(prazoDias) >= 365}
                      aria-label="Aumentar prazo"
                      tabIndex={-1}
                    ><Plus size={16} /></button>
                  </div>
                </div>
              </div>

              {/* linha 5: mecânico + fim de semana + data */}
              <div className="modal-linha modal-linha-rodape">
                <Combobox
                  label="Mecânico"
                  valor={mecanicoId}
                  opcoes={opcoesMecanico}
                  onChange={(v) => { setMecanicoId(v); if (v) lembrarMecanico(v) }}
                  placeholder="Nenhum"
                  disabled={salvando}
                />

                <div className="modal-campo">
                  <span>Entrada</span>
                  <input
                    type="date"
                    value={entradaEm}
                    onChange={(e) => setEntradaEm(e.target.value)}
                    disabled={salvando}
                  />
                </div>

                <button
                  type="button"
                  className={`chip-fds ${fimDeSemana ? 'chip-fds-ativo' : ''}`}
                  onClick={() => setFimDeSemana((v) => !v)}
                  disabled={salvando}
                  aria-pressed={fimDeSemana}
                >
                  {fimDeSemana ? '✓ ' : ''}Fim de semana
                </button>
              </div>

              {erro && <p className="modal-erro">{erro}</p>}
            </div>

            {/* coluna direita: preview do escopo */}
            <aside className="modal-preview" aria-label="Preview do escopo no PDF">
              <div className="modal-preview-topo">Preview PDF</div>
              <div className="modal-preview-corpo">
                {linhasEscopo.length > 0 ? (
                  <ul className="modal-preview-lista">
                    {linhasEscopo.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                ) : (
                  <p className="modal-preview-vazio">As linhas do escopo aparecerão aqui como itens do orçamento.</p>
                )}
              </div>
            </aside>
          </div>

          <footer className="modal-rodape">
            <button type="button" className="btn-secundario" onClick={onFechar} disabled={salvando}>
              Cancelar
            </button>
            <button
              type="submit"
              className={editando ? "btn-primario" : "btn-escuro"}
              disabled={!!motivoBloqueio}
              title={motivoBloqueio ? motivoBloqueio : 'Salvar (Ctrl+Enter)'}
            >
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar'}
            </button>
            {!editando && (
              <button
                type="button"
                className="btn-primario"
                disabled={!!motivoBloqueio}
                title={motivoBloqueio || 'Salvar e abrir PDF (Ctrl+Shift+Enter)'}
                onClick={(e) => enviar(e as unknown as FormEvent, true)}
              >
                {salvando ? 'Salvando...' : 'Salvar e gerar PDF'}
              </button>
            )}
          </footer>
        </form>
      </div>
    </div>
  )
}
