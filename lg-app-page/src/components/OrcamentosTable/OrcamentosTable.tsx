import { useEffect, useRef, useState } from 'react'
import {
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileSearch,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Search,
  X,
} from 'lucide-react'
import {
  atualizarOrcamento,
  buscarOrcamento,
  buscarUrlPdfOrcamento,
  gerarPdfOrcamento,
  listarMecanicos,
  listarOrcamentos,
  type AtualizarOrcamentoBody,
  type FiltroPeriodo,
  type Mecanico,
  type Orcamento,
  type OrcamentoLinha,
  type Status,
} from '../../services/api'
import { CelulaEditavel, type Opcao } from '../CelulaEditavel/CelulaEditavel'
import { EnviarEmailModal } from '../EnviarEmailModal/EnviarEmailModal'
import { useToast } from '../Toast/Toast'
import './OrcamentosTable.css'

const statusOpcoes: Opcao[] = (['ABERTO', 'APROVADO', 'RECUSADO', 'ENTREGUE'] as Status[]).map((v) => ({
  valor: v,
  label: v,
}))

type Acao = 'editar' | 'duplicar'

type Coluna = {
  titulo: string
  largura?: string
  alinhamento?: 'left' | 'right' | 'center'
  render: (o: OrcamentoLinha) => React.ReactNode
}

function dataBR(d?: string | null): string {
  if (!d) return '-'
  const [ano, mes, dia] = d.slice(0, 10).split('-')
  if (!ano || !mes || !dia) return d
  return `${dia}/${mes}/${ano}`
}

function moeda(v?: string | null): string {
  if (!v) return '-'
  const n = Number(v)
  if (isNaN(n)) return v
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calcularPeriodo(chave: string): { dataInicio: string; dataFim: string } | null {
  const hoje = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  if (chave === 'hoje') {
    const s = fmt(hoje)
    return { dataInicio: s, dataFim: s }
  }
  if (chave === 'semana') {
    const diaSemana = hoje.getDay()
    const inicio = new Date(hoje)
    inicio.setDate(hoje.getDate() - diaSemana)
    const fim = new Date(hoje)
    fim.setDate(hoje.getDate() + (6 - diaSemana))
    return { dataInicio: fmt(inicio), dataFim: fmt(fim) }
  }
  if (chave === 'mes') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    return { dataInicio: fmt(inicio), dataFim: fmt(fim) }
  }
  if (chave === 'mes_passado') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
    return { dataInicio: fmt(inicio), dataFim: fmt(fim) }
  }
  return null
}

function exportarCSV(linhas: OrcamentoLinha[]) {
  const cabecalho = ['Empresa', 'Solicitante', 'Entrada', 'Nº Orçamento', 'Nº Pedido', 'Máquina', 'Mecânico', 'Início', 'Entrega', 'Valor', 'Status']
  const linhasCSV = linhas.map((o) => [
    o.empresa,
    o.solicitante ?? '',
    dataBR(o.entradaEm),
    String(o.numero),
    o.numeroPedido ?? '',
    o.maquina ?? '',
    o.mecanico ?? '',
    dataBR(o.inicioEm),
    dataBR(o.entregaEm),
    o.valor ? Number(o.valor).toFixed(2).replace('.', ',') : '',
    o.status,
  ])
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const conteudo = [cabecalho, ...linhasCSV].map((row) => row.map(escape).join(';')).join('\r\n')
  const blob = new Blob(['\ufeff' + conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orcamentos_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function montarColunas(
  mecanicos: Mecanico[],
  salvar: (o: OrcamentoLinha, patch: AtualizarOrcamentoBody) => Promise<void>,
  abrir: (o: OrcamentoLinha, acao: Acao) => void,
  carregando: { id: number; acao: Acao } | null,
  gerandoPdf: number | null,
  gerarPdf: (o: OrcamentoLinha) => void,
  compartilharWhatsapp: (o: OrcamentoLinha) => void,
  compartilhando: number | null,
  abrirEmail: (o: OrcamentoLinha) => void,
): Coluna[] {
  const opcoesMecanico = (o: OrcamentoLinha): Opcao[] => {
    const lista = mecanicos.map((m) => ({ valor: String(m.id), label: m.nome }))
    if (o.mecanicoId && !lista.some((m) => m.valor === String(o.mecanicoId))) {
      lista.push({ valor: String(o.mecanicoId), label: `${o.mecanico} (inativo)` })
    }
    return [{ valor: '', label: '-' }, ...lista]
  }

  return [
    {
      titulo: 'Nº',
      largura: '65px',
      render: (o) => <span className="tabular-nums orc-col-numero">#{o.numero}</span>,
    },
    {
      titulo: 'EMPRESA',
      largura: '180px',
      render: (o) => (
        <span className="orc-texto-truncado" title={o.empresa}>
          {o.empresa}
        </span>
      ),
    },
    {
      titulo: 'SOLICITANTE',
      largura: '130px',
      render: (o) => (
        <span className="orc-texto-truncado" title={o.solicitante ?? '-'}>
          {o.solicitante ?? '-'}
        </span>
      ),
    },
    {
      titulo: 'ENTRADA',
      largura: '90px',
      render: (o) => <span className="tabular-nums">{dataBR(o.entradaEm)}</span>,
    },
    {
      titulo: 'Nº PEDIDO',
      largura: '110px',
      render: (o) => (
        <CelulaEditavel
          tipo="texto"
          rotulo={`Nº do pedido do orçamento ${o.numero}`}
          valor={o.numeroPedido ?? ''}
          className={o.status === 'APROVADO' && !o.numeroPedido ? 'celula-lembrete' : ''}
          onSalvar={(v) => salvar(o, { numeroPedido: v.trim() || null })}
        />
      ),
    },
    {
      titulo: 'MÁQUINA',
      largura: '150px',
      render: (o) => (
        <span className="orc-texto-truncado" title={o.maquina ?? '-'}>
          {o.maquina ?? '-'}
        </span>
      ),
    },
    {
      titulo: 'MECÂNICO',
      largura: '130px',
      render: (o) => (
        <CelulaEditavel
          tipo="select"
          rotulo={`Mecânico do orçamento ${o.numero}`}
          valor={o.mecanicoId ? String(o.mecanicoId) : ''}
          opcoes={opcoesMecanico(o)}
          onSalvar={(v) => salvar(o, { mecanicoId: v ? Number(v) : null })}
        />
      ),
    },
    {
      titulo: 'INÍCIO',
      largura: '90px',
      render: (o) => (
        <CelulaEditavel
          tipo="data"
          rotulo={`Início do trabalho do orçamento ${o.numero}`}
          valor={o.inicioEm ?? ''}
          renderValor={dataBR}
          onSalvar={(v) => salvar(o, { inicioEm: v || null })}
        />
      ),
    },
    {
      titulo: 'ENTREGA',
      largura: '90px',
      render: (o) => (
        <CelulaEditavel
          tipo="data"
          rotulo={`Data de entrega do orçamento ${o.numero}`}
          valor={o.entregaEm ?? ''}
          renderValor={dataBR}
          onSalvar={(v) => salvar(o, { entregaEm: v || null })}
        />
      ),
    },
    {
      titulo: 'VALOR',
      largura: '105px',
      alinhamento: 'right',
      render: (o) => <span className="tabular-nums orc-col-valor">{moeda(o.valor)}</span>,
    },
    {
      titulo: 'STATUS',
      largura: '100px',
      render: (o) => (
        <CelulaEditavel
          tipo="select"
          rotulo={`Status do orçamento ${o.numero}`}
          valor={o.status}
          opcoes={statusOpcoes}
          renderValor={(v) => <span className={`badge badge-${v.toLowerCase()}`}>{v}</span>}
          onSalvar={(v) => salvar(o, { status: v as Status })}
        />
      ),
    },
    {
      titulo: 'AÇÕES',
      largura: '140px',
      alinhamento: 'right',
      render: (o) => {
        const girando = (acao: Acao) => carregando?.id === o.id && carregando.acao === acao
        const carregandoPdf = gerandoPdf === o.id
        const carregandoWa = compartilhando === o.id
        const qualquerCarregando = carregando !== null || gerandoPdf !== null || compartilhando !== null
        return (
          <div className="orc-acoes">
            {/* Ação principal: PDF visível sempre */}
            <button
              type="button"
              className="orc-acao-btn orc-acao-pdf"
              title={o.temPdf ? 'Visualizar PDF' : 'Gerar PDF'}
              aria-label={o.temPdf ? `Visualizar PDF do orçamento ${o.numero}` : `Gerar PDF do orçamento ${o.numero}`}
              disabled={qualquerCarregando}
              onClick={() => gerarPdf(o)}
            >
              {carregandoPdf ? <Loader2 size={15} className="orc-spin" /> : <FileText size={15} />}
            </button>
            {/* Ações secundárias: aparecem no hover da linha */}
            <button
              type="button"
              className="orc-acao-btn orc-acao-secundaria"
              title="Editar no modal"
              aria-label={`Editar orçamento ${o.numero}`}
              disabled={qualquerCarregando}
              onClick={() => abrir(o, 'editar')}
            >
              {girando('editar') ? <Loader2 size={15} className="orc-spin" /> : <Pencil size={15} />}
            </button>
            <button
              type="button"
              className="orc-acao-btn orc-acao-secundaria"
              title="Duplicar orçamento"
              aria-label={`Duplicar orçamento ${o.numero}`}
              disabled={qualquerCarregando}
              onClick={() => abrir(o, 'duplicar')}
            >
              {girando('duplicar') ? <Loader2 size={15} className="orc-spin" /> : <Copy size={15} />}
            </button>
            <button
              type="button"
              className="orc-acao-btn orc-acao-secundaria orc-acao-btn-wa"
              title="Compartilhar por WhatsApp"
              aria-label={`Compartilhar orçamento ${o.numero} por WhatsApp`}
              disabled={qualquerCarregando}
              onClick={() => compartilharWhatsapp(o)}
            >
              {carregandoWa ? <Loader2 size={15} className="orc-spin" /> : <MessageCircle size={15} />}
            </button>
            <button
              type="button"
              className="orc-acao-btn orc-acao-secundaria orc-acao-btn-email"
              title="Enviar PDF por e-mail"
              aria-label={`Enviar orçamento ${o.numero} por e-mail`}
              disabled={qualquerCarregando}
              onClick={() => abrirEmail(o)}
            >
              <Mail size={15} />
            </button>
          </div>
        )
      },
    },
  ]
}

export function OrcamentosTable({
  refresh = 0,
  novoId,
  onDuplicar,
  onEditar,
}: {
  refresh?: number
  novoId?: number | null
  onDuplicar?: (original: Orcamento, numero: number) => void
  onEditar?: (original: Orcamento, numero: number) => void
}) {
  const toast = useToast()
  const [linhas, setLinhas] = useState<OrcamentoLinha[]>([])
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [chipPeriodo, setChipPeriodo] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [tempInicio, setTempInicio] = useState('')
  const [tempFim, setTempFim] = useState('')
  const [popoverPeriodoAberto, setPopoverPeriodoAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])
  const [urlPdfBloqueado, setUrlPdfBloqueado] = useState<string | null>(null)
  const [orcamentoParaEmail, setOrcamentoParaEmail] = useState<OrcamentoLinha | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listarMecanicos()
      .then(setMecanicos)
      .catch((e) => setAviso(e.message))
  }, [])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  // Fecha popover ao clicar fora
  useEffect(() => {
    function cliqueFora(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverPeriodoAberto(false)
      }
    }
    if (popoverPeriodoAberto) {
      document.addEventListener('mousedown', cliqueFora)
    }
    return () => document.removeEventListener('mousedown', cliqueFora)
  }, [popoverPeriodoAberto])

  function selecionarPreset(chave: string) {
    if (chave === 'todos') {
      setChipPeriodo('')
      setDataInicio('')
      setDataFim('')
      setTempInicio('')
      setTempFim('')
      setPopoverPeriodoAberto(false)
      return
    }
    setChipPeriodo(chave)
    const p = calcularPeriodo(chave)
    if (p) {
      setDataInicio(p.dataInicio)
      setDataFim(p.dataFim)
      setTempInicio(p.dataInicio)
      setTempFim(p.dataFim)
    }
    setPopoverPeriodoAberto(false)
  }

  function aplicarIntervaloCustom() {
    if (tempInicio || tempFim) {
      setChipPeriodo('custom')
      setDataInicio(tempInicio)
      setDataFim(tempFim)
    } else {
      setChipPeriodo('')
      setDataInicio('')
      setDataFim('')
    }
    setPopoverPeriodoAberto(false)
  }

  function limparFiltros() {
    setBusca('')
    setStatus('')
    setChipPeriodo('')
    setDataInicio('')
    setDataFim('')
    setTempInicio('')
    setTempFim('')
  }

  async function salvar(o: OrcamentoLinha, patch: AtualizarOrcamentoBody) {
    const statusAnterior = o.status
    try {
      const nova = await atualizarOrcamento(o.id, patch)
      setLinhas((ls) => ls.map((l) => (l.id === nova.id ? nova : l)))
      setAviso('')

      if (patch.status && patch.status !== statusAnterior) {
        toast.mostrar({
          tipo: 'info',
          mensagem: `Status do nº ${o.numero} alterado para ${patch.status}.`,
          acaoLabel: 'Desfazer',
          duracao: 5000,
          onAcao: async () => {
            try {
              const revertida = await atualizarOrcamento(o.id, { status: statusAnterior })
              setLinhas((ls) => ls.map((l) => (l.id === revertida.id ? revertida : l)))
            } catch (e) {
              setAviso(`Não foi possível desfazer: ${e instanceof Error ? e.message : 'erro'}`)
            }
          },
        })
      }
    } catch (e) {
      setAviso(`Orçamento ${o.numero}: ${e instanceof Error ? e.message : 'erro ao salvar'}`)
      throw e
    }
  }

  const [carregandoAcao, setCarregandoAcao] = useState<{ id: number; acao: Acao } | null>(null)
  async function abrir(o: OrcamentoLinha, acao: Acao) {
    setCarregandoAcao({ id: o.id, acao })
    try {
      const completo = await buscarOrcamento(o.id)
      if (acao === 'duplicar') onDuplicar?.(completo, o.numero)
      else onEditar?.(completo, o.numero)
    } catch (e) {
      setAviso(`Orçamento ${o.numero}: ${e instanceof Error ? e.message : 'erro ao carregar'}`)
    } finally {
      setCarregandoAcao(null)
    }
  }

  const [gerandoPdf, setGerandoPdf] = useState<number | null>(null)
  async function gerarPdf(o: OrcamentoLinha) {
    setGerandoPdf(o.id)
    setUrlPdfBloqueado(null)
    try {
      let url: string
      try {
        const res = await buscarUrlPdfOrcamento(o.id)
        url = res.url
      } catch {
        const res = await gerarPdfOrcamento(o.id)
        url = res.url
        setLinhas((anteriores) =>
          anteriores.map((item) => (item.id === o.id ? { ...item, temPdf: true } : item))
        )
      }
      const janela = window.open(url, '_blank')
      if (!janela) {
        setUrlPdfBloqueado(url)
        setAviso('PDF pronto! O navegador bloqueou a abertura automática.')
      }
    } catch (e) {
      setAviso(`Orçamento ${o.numero}: ${e instanceof Error ? e.message : 'erro ao abrir PDF'}`)
    } finally {
      setGerandoPdf(null)
    }
  }

  const [compartilhando, setCompartilhando] = useState<number | null>(null)
  async function compartilharWhatsapp(o: OrcamentoLinha) {
    setCompartilhando(o.id)
    try {
      let urlPdf: string
      try {
        const res = await buscarUrlPdfOrcamento(o.id)
        urlPdf = res.url
      } catch {
        const res = await gerarPdfOrcamento(o.id)
        urlPdf = res.url
        setLinhas((anteriores) =>
          anteriores.map((item) => (item.id === o.id ? { ...item, temPdf: true } : item))
        )
      }
      const desc = o.maquina ? `${o.maquina}` : `orçamento nº ${o.numero}`
      const texto = `Olá, segue o orçamento nº ${o.numero} – ${desc}. ${urlPdf}`
      const telefone = o.solicitanteTelefone ? o.solicitanteTelefone.replace(/\D/g, '') : ''
      const waUrl = `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`
      window.open(waUrl, '_blank')
      toast.mostrar({
        tipo: 'info',
        mensagem: 'Link do WhatsApp aberto. O PDF expira em 5 minutos — envie agora.',
        duracao: 8000,
      })
    } catch (e) {
      setAviso(`Orçamento ${o.numero}: ${e instanceof Error ? e.message : 'erro ao buscar PDF'}`)
    } finally {
      setCompartilhando(null)
    }
  }

  const colunas = montarColunas(
    mecanicos,
    salvar,
    abrir,
    carregandoAcao,
    gerandoPdf,
    gerarPdf,
    compartilharWhatsapp,
    compartilhando,
    (o) => setOrcamentoParaEmail(o),
  )

  const filtro: FiltroPeriodo = {
    busca,
    status,
    dataInicio,
    dataFim,
  }

  useEffect(() => {
    const t = setTimeout(() => {
      listarOrcamentos(filtro)
        .then((dados) => {
          setLinhas(dados)
          setErro('')
        })
        .catch((e) => setErro(e.message))
    }, 250)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, status, dataInicio, dataFim, refresh])

  const totalFiltrado = linhas.reduce((acc, o) => acc + (o.valor ? Number(o.valor) : 0), 0)

  // Label do botão de período
  const periodoLabel = (() => {
    if (chipPeriodo === 'hoje') return 'Hoje'
    if (chipPeriodo === 'semana') return 'Esta semana'
    if (chipPeriodo === 'mes') return 'Este mês'
    if (chipPeriodo === 'mes_passado') return 'Mês passado'
    if (chipPeriodo === 'custom' || dataInicio || dataFim) {
      if (dataInicio && dataFim) return `${dataBR(dataInicio)} a ${dataBR(dataFim)}`
      if (dataInicio) return `A partir de ${dataBR(dataInicio)}`
      if (dataFim) return `Até ${dataBR(dataFim)}`
    }
    return 'Período'
  })()

  const temFiltroAtivo = Boolean(busca.trim() || status || chipPeriodo || dataInicio || dataFim)

  return (
    <section className="orc-table-container">
      {/* Barra de ferramentas em UMA linha */}
      <div className="orc-toolbar">
        <div className="orc-toolbar-filtros">
          {/* Busca com lupa integrada */}
          <div className="orc-busca-wrapper">
            <Search size={14} className="orc-busca-icone" />
            <input
              type="text"
              className="orc-input-busca"
              placeholder="Buscar por empresa, máquina ou nº..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button
                type="button"
                className="orc-btn-limpar-campo"
                onClick={() => setBusca('')}
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Select de Status */}
          <select
            className="orc-select-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Status: Todos</option>
            <option value="ABERTO">Aberto</option>
            <option value="APROVADO">Aprovado</option>
            <option value="RECUSADO">Recusado</option>
            <option value="ENTREGUE">Entregue</option>
          </select>

          {/* Seletor de Período unificado com Popover */}
          <div className="orc-popover-wrapper" ref={popoverRef}>
            <button
              type="button"
              className={`btn-secundario orc-btn-periodo ${chipPeriodo ? 'orc-btn-periodo-ativo' : ''}`}
              onClick={() => setPopoverPeriodoAberto(!popoverPeriodoAberto)}
              aria-expanded={popoverPeriodoAberto}
            >
              <Calendar size={14} />
              <span>{periodoLabel}</span>
              <ChevronDown size={12} />
            </button>

            {popoverPeriodoAberto && (
              <div className="orc-popover-painel">
                <div className="orc-popover-secao">
                  <span className="orc-popover-rotulo">Predefinições</span>
                  <div className="orc-popover-opcoes">
                    {[
                      { chave: 'todos', label: 'Todos os períodos' },
                      { chave: 'hoje', label: 'Hoje' },
                      { chave: 'semana', label: 'Esta semana' },
                      { chave: 'mes', label: 'Este mês' },
                      { chave: 'mes_passado', label: 'Mês passado' },
                    ].map(({ chave, label }) => {
                      const ativo = (chave === 'todos' && !chipPeriodo && !dataInicio && !dataFim) || chipPeriodo === chave
                      return (
                        <button
                          key={chave}
                          type="button"
                          className={`orc-popover-item ${ativo ? 'ativo' : ''}`}
                          onClick={() => selecionarPreset(chave)}
                        >
                          <span>{label}</span>
                          {ativo && <Check size={14} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="orc-popover-divisor" />

                <div className="orc-popover-secao">
                  <span className="orc-popover-rotulo">Intervalo personalizado</span>
                  <div className="orc-popover-datas">
                    <div className="orc-popover-data-campo">
                      <label htmlFor="pop-data-ini">De:</label>
                      <input
                        id="pop-data-ini"
                        type="date"
                        value={tempInicio}
                        onChange={(e) => setTempInicio(e.target.value)}
                      />
                    </div>
                    <div className="orc-popover-data-campo">
                      <label htmlFor="pop-data-fim">Até:</label>
                      <input
                        id="pop-data-fim"
                        type="date"
                        value={tempFim}
                        onChange={(e) => setTempFim(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-escuro orc-popover-btn-aplicar"
                    onClick={aplicarIntervaloCustom}
                  >
                    Aplicar intervalo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* À direita: Exportar CSV secundário */}
        <div className="orc-toolbar-acoes">
          <button
            type="button"
            className="btn-secundario orc-btn-exportar"
            title="Exportar para CSV (Excel)"
            onClick={() => exportarCSV(linhas)}
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tags de filtros ativos logo abaixo da barra */}
      {temFiltroAtivo && (
        <div className="orc-tags-filtros">
          <span className="orc-tags-rotulo">Filtros:</span>
          {busca.trim() && (
            <span className="orc-tag">
              Busca: <strong>"{busca}"</strong>
              <button type="button" onClick={() => setBusca('')} aria-label="Remover filtro de busca">
                <X size={11} />
              </button>
            </span>
          )}
          {status && (
            <span className="orc-tag">
              Status: <strong>{status}</strong>
              <button type="button" onClick={() => setStatus('')} aria-label="Remover filtro de status">
                <X size={11} />
              </button>
            </span>
          )}
          {(chipPeriodo || dataInicio || dataFim) && (
            <span className="orc-tag">
              Período: <strong>{periodoLabel}</strong>
              <button
                type="button"
                onClick={() => {
                  setChipPeriodo('')
                  setDataInicio('')
                  setDataFim('')
                  setTempInicio('')
                  setTempFim('')
                }}
                aria-label="Remover filtro de período"
              >
                <X size={11} />
              </button>
            </span>
          )}
          <button type="button" className="orc-btn-limpar-todos" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>
      )}

      {erro && <p className="orc-table-erro">{erro}</p>}
      {aviso && (
        <div className="orc-table-aviso" role="alert">
          <span>
            {aviso}
            {urlPdfBloqueado && (
              <> — <a href={urlPdfBloqueado} target="_blank" rel="noreferrer">Abrir PDF</a></>
            )}
          </span>
          <button type="button" onClick={() => { setAviso(''); setUrlPdfBloqueado(null) }} aria-label="Fechar aviso">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Card da tabela */}
      <div className="orc-table-card">
        <div className="orc-table-scroll">
          <table className="orc-table">
            <thead>
              <tr>
                {colunas.map((c) => (
                  <th
                    key={c.titulo}
                    style={{
                      width: c.largura,
                      textAlign: c.alinhamento ?? 'left',
                    }}
                  >
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((o) => (
                <tr key={o.id} className={novoId === o.id ? 'linha-nova' : ''}>
                  {colunas.map((c) => (
                    <td
                      key={c.titulo}
                      style={{
                        textAlign: c.alinhamento ?? 'left',
                      }}
                    >
                      {c.render(o)}
                    </td>
                  ))}
                </tr>
              ))}
              {linhas.length === 0 && !erro && (
                <tr>
                  <td colSpan={colunas.length} className="orc-table-vazio-td">
                    <div className="orc-estado-vazio">
                      <FileSearch size={24} className="orc-estado-vazio-icone" />
                      <p className="orc-estado-vazio-texto">Nenhum orçamento encontrado com os filtros aplicados.</p>
                      {temFiltroAtivo && (
                        <button type="button" className="btn-secundario" onClick={limparFiltros}>
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela: barra de status fixa */}
        <div className="orc-table-rodape">
          <span className="orc-table-contagem">
            {linhas.length} {linhas.length === 1 ? 'orçamento listado' : 'orçamentos listados'}
          </span>
          <span className="orc-table-total">
            Total acumulado: <strong className="tabular-nums">{totalFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
          </span>
        </div>
      </div>

      {orcamentoParaEmail && (
        <EnviarEmailModal
          orcamento={orcamentoParaEmail}
          onFechar={() => setOrcamentoParaEmail(null)}
          onEnviado={(destinatario) => {
            const num = orcamentoParaEmail.numero
            setOrcamentoParaEmail(null)
            toast.mostrar({
              tipo: 'sucesso',
              mensagem: `Orçamento nº ${num} enviado por e-mail para ${destinatario}!`,
              duracao: 6000,
            })
          }}
        />
      )}
    </section>
  )
}
