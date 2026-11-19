import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  buscarProximoNumeroOrcamento,
  criarOrcamento,
  atualizarOrcamento,
  criarSolicitante,
  listarEmpresas,
  listarMecanicos,
  listarOrcamentosRecentes,
  listarSolicitantes,
  previewHtmlOrcamento,
  type Empresa,
  type Mecanico,
  type NovoOrcamentoBody,
  type Orcamento,
  type OrcamentoRecente,
  type Solicitante,
} from '../../services/api'
import { Check, FileText, Minus, Plus, Trash2 } from 'lucide-react'
import { Combobox, type OpcaoCombo } from '../Combobox/Combobox'
import './NovoOrcamentoModal.css'

export type InicialOrcamento = Partial<
  Pick<Orcamento, 'empresaId' | 'solicitanteId' | 'mecanicoId' | 'maquina' | 'titulo' | 'escopo' | 'valor' | 'prazoDias' | 'fimDeSemana' | 'entradaEm'>
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

// converte string de escopo (incluindo '\n' literais) em lista de itens
function parsearEscopo(texto?: string | null): string[] {
  if (!texto) return ['']
  const itens = texto
    .replace(/\\n/g, '\n')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  return itens.length > 0 ? itens : ['']
}

const formatarTelefone = (valor: string): string => {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
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
  const [maquina, setMaquina] = useState(inicial?.maquina ?? '')
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [itensEscopo, setItensEscopo] = useState<string[]>(() => parsearEscopo(inicial?.escopo))
  const itemRefs = useRef<(HTMLInputElement | null)[]>([])
  const [valor, setValor] = useState(paraCentavos(inicial?.valor))
  const [prazoDias, setPrazoDias] = useState(
    inicial ? (inicial.prazoDias != null ? String(inicial.prazoDias) : '') : '1'
  )
  const [fimDeSemana, setFimDeSemana] = useState(inicial?.fimDeSemana ?? false)
  const [entradaEm, setEntradaEm] = useState(inicial?.entradaEm ? inicial.entradaEm.slice(0, 10) : hoje())
  const [proximoNumero, setProximoNumero] = useState<number | null>(editando?.numero ?? null)
  const [htmlPreview, setHtmlPreview] = useState('')
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [escalaPreview, setEscalaPreview] = useState(0.42)

  const [recentes, setRecentes] = useState<OrcamentoRecente[]>([])
  const [erros, setErros] = useState<Erros>({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Criação inline de contato após selecionar a empresa
  const [criandoContato, setCriandoContato] = useState(false)
  const [cttNome, setCttNome] = useState('')
  const [cttCargo, setCttCargo] = useState('')
  const [cttTelefone, setCttTelefone] = useState('')
  const [cttEmail, setCttEmail] = useState('')
  const [cttErro, setCttErro] = useState('')
  const [salvandoCtt, setSalvandoCtt] = useState(false)

  const empresaEscolhida = empresaId !== ''

  // carrega dados iniciais
  useEffect(() => {
    Promise.all([listarEmpresas(), listarMecanicos()])
      .then(([emp, mec]) => {
        setEmpresas(emp)
        setMecanicos(mec)
      })
      .catch((e) => setErro(e.message))

    if (!editando) {
      buscarProximoNumeroOrcamento()
        .then((res) => setProximoNumero(res.numero))
        .catch(() => { /* opcional */ })
    }
  }, [editando])

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

  // cria contato inline via "Criar 'X'" no combobox (após selecionar empresa)
  async function criarSolicitanteRapido(nome: string) {
    try {
      const novo = await criarSolicitante({ empresaId: Number(empresaId), nome, email: null, telefone: null })
      setSolicitantes((l) => [...l, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
      setSolicitanteId(String(novo.id))
      limpar('solicitante')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'erro ao criar contato')
    }
  }

  function abrirNovoContato() {
    setCttNome('')
    setCttCargo('')
    setCttTelefone('')
    setCttEmail('')
    setCttErro('')
    setCriandoContato(true)
  }

  async function salvarNovoContato() {
    if (!cttNome.trim()) return setCttErro('Nome do contato é obrigatório')
    setSalvandoCtt(true)
    setCttErro('')
    try {
      const novo = await criarSolicitante({
        empresaId: Number(empresaId),
        nome: cttNome.trim(),
        cargo: cttCargo.trim() || null,
        telefone: cttTelefone.trim() || null,
        email: cttEmail.trim() || null,
      })
      setSolicitantes((l) => [...l, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
      setSolicitanteId(String(novo.id))
      limpar('solicitante')
      setCriandoContato(false)
    } catch (e) {
      setCttErro(e instanceof Error ? e.message : 'Erro ao salvar contato')
    } finally {
      setSalvandoCtt(false)
    }
  }

  function aplicarRecente(r: OrcamentoRecente) {
    if (r.titulo) setTitulo(r.titulo)
    if (r.escopo) setItensEscopo(parsearEscopo(r.escopo))
    if (r.valor != null) setValor(paraCentavos(r.valor))
    limpar('titulo')
    limpar('valor')
  }

  function atualizarItem(idx: number, texto: string) {
    setItensEscopo((lista) => lista.map((item, i) => (i === idx ? texto : item)))
  }

  function adicionarItem(aposIdx?: number) {
    const novoIdx = aposIdx !== undefined ? aposIdx + 1 : itensEscopo.length
    setItensEscopo((lista) => {
      const copia = [...lista]
      copia.splice(novoIdx, 0, '')
      return copia
    })
    setTimeout(() => itemRefs.current[novoIdx]?.focus(), 0)
  }

  function removerItem(idx: number) {
    setItensEscopo((lista) => {
      if (lista.length <= 1) return ['']
      return lista.filter((_, i) => i !== idx)
    })
  }

  const escopoTexto = itensEscopo.map((l) => l.trim()).filter(Boolean).join('\n')

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
      maquina: maquina.trim() || null,
      titulo: titulo.trim() || null,
      escopo: escopoTexto || null,
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
  const solicitantesDaEmpresa = solicitantes.filter((s) => s.empresaId === Number(empresaId))
  const opcoesSolicitante: OpcaoCombo[] = solicitantesDaEmpresa
    .map((s) => ({ valor: String(s.id), label: s.cargo ? `${s.nome} — ${s.cargo}` : s.nome }))
  const contatoSelecionado = solicitantesDaEmpresa.find((s) => String(s.id) === solicitanteId)
  const opcoesMecanico: OpcaoCombo[] = mecanicos.map((m) => ({ valor: String(m.id), label: m.nome }))

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

  const numeroExibido = editando?.numero ?? proximoNumero

  // busca o HTML real do template oficial do PDF (com debounce curto ao digitar)
  useEffect(() => {
    let cancelado = false
    const t = setTimeout(() => {
      previewHtmlOrcamento({
        numero: numeroExibido ?? 0,
        titulo: titulo.trim() || null,
        escopo: escopoTexto || null,
        valor: valor !== '' ? Number(valor) / 100 : null,
        prazoDias: prazoDias !== '' ? Number(prazoDias) : null,
        fimDeSemana,
        entradaEm,
      })
        .then((res) => { if (!cancelado) setHtmlPreview(res.html) })
        .catch(() => { /* silencia falha transitória de preview */ })
    }, 180)
    return () => { cancelado = true; clearTimeout(t) }
  }, [numeroExibido, titulo, escopoTexto, valor, prazoDias, fimDeSemana, entradaEm])

  // calcula escala proporcional da folha A4 (794px) para caber no painel lateral
  useEffect(() => {
    const el = previewContainerRef.current
    if (!el) return
    const atualizar = () => {
      const largura = el.clientWidth - 20
      if (largura > 0) setEscalaPreview(Math.min(1, largura / 794))
    }
    atualizar()
    const obs = new ResizeObserver(atualizar)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !salvando) onFechar() }}
    >
      <div className="modal modal-orc" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <header className="modal-header">
          <div className="modal-header-titulo-grupo">
            <h2 id="modal-titulo">{tituloPrincipal}</h2>
            {numeroExibido != null && !editando && (
              <span className="modal-numero-badge tabular-nums" title="Número sequencial do orçamento">
                Nº {numeroExibido}
              </span>
            )}
          </div>
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

              {/* linha 1: empresa + contato */}
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
                    setCriandoContato(false)
                    limpar('empresa')
                  }}
                  placeholder="Buscar empresa..."
                  disabled={salvando}
                  erro={erros.empresa}
                />

                <Combobox
                  label="Contato"
                  valor={solicitanteId}
                  opcoes={opcoesSolicitante}
                  onChange={(v) => { setSolicitanteId(v); limpar('solicitante') }}
                  onCriar={empresaEscolhida ? criarSolicitanteRapido : undefined}
                  labelAdicionar={empresaEscolhida ? '+ Novo contato' : undefined}
                  onAdicionar={empresaEscolhida ? abrirNovoContato : undefined}
                  placeholder={empresaEscolhida ? 'Buscar ou criar contato...' : 'Escolha a empresa primeiro'}
                  disabled={!empresaEscolhida || salvando}
                  erro={erros.solicitante}
                />
              </div>

              {contatoSelecionado && (contatoSelecionado.cargo || contatoSelecionado.telefone || contatoSelecionado.email) && (
                <div className="orc-contato-resumo">
                  {contatoSelecionado.cargo && <span className="orc-contato-resumo-cargo">{contatoSelecionado.cargo}</span>}
                  {contatoSelecionado.telefone && <span>{contatoSelecionado.telefone}</span>}
                  {contatoSelecionado.email && <span>{contatoSelecionado.email}</span>}
                </div>
              )}

              {empresaEscolhida && criandoContato && (
                <div className="orc-novo-contato-box">
                  <div className="orc-novo-contato-topo">
                    <span>Novo contato para esta empresa</span>
                  </div>
                  <div className="orc-novo-contato-grade">
                    <label className="modal-campo">
                      <span>Nome *</span>
                      <input
                        value={cttNome}
                        placeholder="Ex: Paulo Henrique"
                        onChange={(e) => { setCttNome(e.target.value); setCttErro('') }}
                        disabled={salvandoCtt}
                      />
                    </label>
                    <label className="modal-campo">
                      <span>Cargo</span>
                      <input
                        value={cttCargo}
                        placeholder="Ex: Comprador"
                        onChange={(e) => setCttCargo(e.target.value)}
                        disabled={salvandoCtt}
                      />
                    </label>
                    <label className="modal-campo">
                      <span>Telefone</span>
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={cttTelefone}
                        onChange={(e) => setCttTelefone(formatarTelefone(e.target.value))}
                        disabled={salvandoCtt}
                      />
                    </label>
                    <label className="modal-campo">
                      <span>E-mail</span>
                      <input
                        type="email"
                        placeholder="nome@empresa.com.br"
                        value={cttEmail}
                        onChange={(e) => setCttEmail(e.target.value)}
                        disabled={salvandoCtt}
                      />
                    </label>
                  </div>
                  {cttErro && <p className="modal-erro">{cttErro}</p>}
                  <div className="orc-novo-contato-acoes">
                    <button type="button" className="btn-secundario" onClick={() => setCriandoContato(false)} disabled={salvandoCtt}>
                      Cancelar
                    </button>
                    <button type="button" className="btn-primario" onClick={salvarNovoContato} disabled={salvandoCtt}>
                      {salvandoCtt ? 'Salvando...' : 'Salvar contato'}
                    </button>
                  </div>
                </div>
              )}

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

              {/* linha 2: título + máquina */}
              <div className="modal-linha modal-linha-titulo-maquina">
                <label className="modal-campo">
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

                <label className="modal-campo">
                  <span>Máquina / Equipamento</span>
                  <input
                    value={maquina}
                    onChange={(e) => setMaquina(e.target.value)}
                    placeholder="Ex: Prensa Hidráulica 02"
                    disabled={salvando}
                  />
                </label>
              </div>

              {/* linha 3: lista de itens do serviço (escopo) */}
              <div className="modal-linha">
                <div className="modal-campo modal-campo-full">
                  <div className="modal-campo-cabecalho">
                    <span>Itens do serviço (Escopo)</span>
                    <button
                      type="button"
                      className="btn-add-item"
                      onClick={() => adicionarItem()}
                      disabled={salvando}
                    >
                      <Plus size={13} />
                      <span>Adicionar item</span>
                    </button>
                  </div>
                  <div className="itens-escopo-lista">
                    {itensEscopo.map((item, idx) => (
                      <div key={idx} className="itens-escopo-linha">
                        <span className="itens-escopo-num tabular-nums">{idx + 1}.</span>
                        <input
                          ref={(el) => { itemRefs.current[idx] = el }}
                          type="text"
                          value={item}
                          onChange={(e) => atualizarItem(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                              e.preventDefault()
                              e.stopPropagation()
                              adicionarItem(idx)
                            }
                          }}
                          placeholder={`Descreva o item ${idx + 1}...`}
                          disabled={salvando}
                        />
                        {(itensEscopo.length > 1 || item.trim() !== '') && (
                          <button
                            type="button"
                            className="itens-escopo-remover"
                            onClick={() => removerItem(idx)}
                            disabled={salvando}
                            aria-label={`Remover item ${idx + 1}`}
                            title="Remover item"
                            tabIndex={-1}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
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
                  placeholder="Selecionar mecânico..."
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
                  title="Incluir adicional de sábado (50%) no orçamento"
                >
                  {fimDeSemana && <Check size={14} strokeWidth={2.5} />}
                  <span>Fim de semana</span>
                </button>
              </div>

              {erro && <p className="modal-erro">{erro}</p>}
            </div>

            {/* coluna direita: visualizador real do PDF */}
            <aside className="modal-preview" aria-label="Visualizador do orçamento em PDF">
              <div className="modal-preview-topo">
                <span className="modal-preview-topo-titulo">
                  <FileText size={13} />
                  <span>Visualizador PDF</span>
                </span>
                {numeroExibido != null && (
                  <span className="modal-preview-num tabular-nums">#{numeroExibido}</span>
                )}
              </div>
              <div className="modal-preview-corpo" ref={previewContainerRef}>
                {htmlPreview ? (
                  <div
                    className="pdf-iframe-moldura"
                    style={{
                      width: `${Math.round(794 * escalaPreview)}px`,
                      height: `${Math.round(2246 * escalaPreview)}px`,
                    }}
                  >
                    <iframe
                      title="Visualizador real do PDF do orçamento"
                      srcDoc={htmlPreview}
                      className="pdf-iframe-real"
                      style={{
                        transform: `scale(${escalaPreview})`,
                      }}
                    />
                  </div>
                ) : (
                  <p className="modal-preview-vazio">Carregando visualização do PDF...</p>
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
