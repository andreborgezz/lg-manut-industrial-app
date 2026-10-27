import { useEffect, useState } from 'react'
import { Copy, FileText, Loader2, MessageCircle, Pencil } from 'lucide-react'
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
import { useToast } from '../Toast/Toast'
import './OrcamentosTable.css'

const statusOpcoes: Opcao[] = (['ABERTO', 'APROVADO', 'RECUSADO', 'ENTREGUE'] as Status[]).map((v) => ({
  valor: v,
  label: v,
}))

type Acao = 'editar' | 'duplicar'

type Coluna = { titulo: string; render: (o: OrcamentoLinha) => React.ReactNode }

function montarColunas(
  mecanicos: Mecanico[],
  salvar: (o: OrcamentoLinha, patch: AtualizarOrcamentoBody) => Promise<void>,
  abrir: (o: OrcamentoLinha, acao: Acao) => void,
  carregando: { id: number; acao: Acao } | null,
  gerandoPdf: number | null,
  gerarPdf: (o: OrcamentoLinha) => void,
  compartilharWhatsapp: (o: OrcamentoLinha) => void,
  compartilhando: number | null,
): Coluna[] {
  const opcoesMecanico = (o: OrcamentoLinha): Opcao[] => {
    const lista = mecanicos.map((m) => ({ valor: String(m.id), label: m.nome }))
    if (o.mecanicoId && !lista.some((m) => m.valor === String(o.mecanicoId))) {
      lista.push({ valor: String(o.mecanicoId), label: `${o.mecanico} (inativo)` })
    }
    return [{ valor: '', label: '-' }, ...lista]
  }

  return [
    { titulo: 'EMPRESA', render: (o) => o.empresa },
    { titulo: 'SOLICITANTE', render: (o) => o.solicitante ?? '-' },
    { titulo: 'ENTRADA', render: (o) => dataBR(o.entradaEm) },
    { titulo: 'Nº ORÇAMENTO', render: (o) => String(o.numero) },
    {
      titulo: 'Nº PEDIDO',
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
    { titulo: 'MÁQUINA', render: (o) => o.maquina ?? '-' },
    {
      titulo: 'MECÂNICO',
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
    { titulo: 'VALOR', render: (o) => moeda(o.valor) },
    {
      titulo: 'STATUS',
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
      render: (o) => {
        const girando = (acao: Acao) => carregando?.id === o.id && carregando.acao === acao
        const carregandoPdf = gerandoPdf === o.id
        const carregandoWa = compartilhando === o.id
        const qualquerCarregando = carregando !== null || gerandoPdf !== null || compartilhando !== null
        return (
          <div className="orc-acoes">
            <button
              type="button"
              className="orc-acao-btn"
              title="Editar"
              aria-label={`Editar orçamento ${o.numero}`}
              disabled={qualquerCarregando}
              onClick={() => abrir(o, 'editar')}
            >
              {girando('editar') ? <Loader2 size={16} className="orc-spin" /> : <Pencil size={16} />}
            </button>
            <button
              type="button"
              className="orc-acao-btn"
              title="Duplicar"
              aria-label={`Duplicar orçamento ${o.numero}`}
              disabled={qualquerCarregando}
              onClick={() => abrir(o, 'duplicar')}
            >
              {girando('duplicar') ? <Loader2 size={16} className="orc-spin" /> : <Copy size={16} />}
            </button>
            <button
              type="button"
              className="orc-acao-btn"
              title="Gerar PDF"
              aria-label={`Gerar PDF do orçamento ${o.numero}`}
              disabled={qualquerCarregando}
              onClick={() => gerarPdf(o)}
            >
              {carregandoPdf ? <Loader2 size={16} className="orc-spin" /> : <FileText size={16} />}
            </button>
            <button
              type="button"
              className="orc-acao-btn orc-acao-btn-wa"
              title="Compartilhar por WhatsApp"
              aria-label={`Compartilhar orçamento ${o.numero} por WhatsApp`}
              disabled={qualquerCarregando}
              onClick={() => compartilharWhatsapp(o)}
            >
              {carregandoWa ? <Loader2 size={16} className="orc-spin" /> : <MessageCircle size={16} />}
            </button>
          </div>
        )
      },
    },
  ]
}

function dataBR(d: string | null) {
  if (!d) return '-'
  const [a, m, dia] = d.split('-')
  return `${dia}/${m}/${a}`
}

function moeda(v: string | null) {
  if (v == null) return '-'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// calcula dataInicio/dataFim para os atalhos de período
function calcularPeriodo(chave: string): { dataInicio: string; dataFim: string } | null {
  const hoje = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (chave === 'hoje') {
    const s = fmt(hoje)
    return { dataInicio: s, dataFim: s }
  }
  if (chave === 'semana') {
    const diaSemana = hoje.getDay() // 0=dom
    const inicio = new Date(hoje)
    inicio.setDate(hoje.getDate() - diaSemana)
    const fim = new Date(inicio)
    fim.setDate(inicio.getDate() + 6)
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

// gera CSV com BOM UTF-8 e separador ";" para Excel BR
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
  // BOM UTF-8 para Excel reconhecer acentos
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orcamentos_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// modal de atalhos
type ModalAtalhosProps = { onFechar: () => void }
function ModalAtalhos({ onFechar }: ModalAtalhosProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onFechar])

  return (
    <div className="orc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="modal-atalhos" role="dialog" aria-modal="true" aria-labelledby="atalhos-titulo">
        <header className="orc-modal-header">
          <h2 id="atalhos-titulo">Atalhos de teclado</h2>
          <button type="button" className="orc-modal-fechar" onClick={onFechar} aria-label="Fechar">×</button>
        </header>
        <div className="atalhos-lista">
          <div className="atalho-item"><kbd>N</kbd><span>Novo orçamento</span></div>
          <div className="atalho-item"><kbd>?</kbd><span>Este modal</span></div>
          <div className="atalho-item"><kbd>Esc</kbd><span>Fechar modal / toast</span></div>
          <div className="atalho-item"><kbd>Ctrl</kbd>+<kbd>Enter</kbd><span>Salvar no modal</span></div>
          <div className="atalho-item"><kbd>Enter</kbd><span>Avançar campo no modal</span></div>
        </div>
      </div>
    </div>
  )
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
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])
  const [mostrarAtalhos, setMostrarAtalhos] = useState(false)
  const [urlPdfBloqueado, setUrlPdfBloqueado] = useState<string | null>(null)

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

  // atalho "?" abre o modal de atalhos
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === '?') { e.preventDefault(); setMostrarAtalhos(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function selecionarChip(chave: string) {
    if (chipPeriodo === chave) {
      setChipPeriodo('')
      setDataInicio('')
      setDataFim('')
      return
    }
    setChipPeriodo(chave)
    const periodo = calcularPeriodo(chave)
    if (periodo) {
      setDataInicio(periodo.dataInicio)
      setDataFim(periodo.dataFim)
    }
  }

  async function salvar(o: OrcamentoLinha, patch: AtualizarOrcamentoBody) {
    const statusAnterior = o.status

    try {
      const nova = await atualizarOrcamento(o.id, patch)
      setLinhas((ls) => ls.map((l) => (l.id === nova.id ? nova : l)))
      setAviso('')

      // desfazer mudança de status
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
            } catch {
              toast.mostrar({ tipo: 'erro', mensagem: 'Não foi possível desfazer.' })
            }
          },
        })
      }
    } catch (e) {
      setAviso(`Orçamento ${o.numero}: ${e instanceof Error ? e.message : 'erro ao salvar'}`)
      throw e
    }
  }

  const [carregando, setCarregando] = useState<{ id: number; acao: Acao } | null>(null)
  async function abrir(o: OrcamentoLinha, acao: Acao) {
    setCarregando({ id: o.id, acao })
    try {
      const completo = await buscarOrcamento(o.id)
      if (acao === 'editar') onEditar?.(completo, o.numero)
      else onDuplicar?.(completo, o.numero)
    } catch (e) {
      setAviso(`Orçamento ${o.numero}: ${e instanceof Error ? e.message : 'erro ao carregar'}`)
    } finally {
      setCarregando(null)
    }
  }

  const [gerandoPdf, setGerandoPdf] = useState<number | null>(null)
  async function gerarPdf(o: OrcamentoLinha) {
    setGerandoPdf(o.id)
    setUrlPdfBloqueado(null)
    try {
      const { url } = await gerarPdfOrcamento(o.id)
      const janela = window.open(url, '_blank')
      if (!janela) {
        setUrlPdfBloqueado(url)
        setAviso('PDF gerado! Seu navegador bloqueou a abertura automática.')
      }
    } catch (e) {
      setAviso(`Orçamento ${o.numero}: ${e instanceof Error ? e.message : 'erro ao gerar PDF'}`)
    } finally {
      setGerandoPdf(null)
    }
  }

  const [compartilhando, setCompartilhando] = useState<number | null>(null)
  async function compartilharWhatsapp(o: OrcamentoLinha) {
    setCompartilhando(o.id)
    try {
      const { url: urlPdf } = await buscarUrlPdfOrcamento(o.id)
      const desc = o.maquina ? `${o.maquina}` : `orçamento nº ${o.numero}`
      const texto = `Olá, segue o orçamento nº ${o.numero} – ${desc}. ${urlPdf}`
      // telefone do solicitante sem formatação, só dígitos; sem número → wa.me abre seletor
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

  const colunas = montarColunas(mecanicos, salvar, abrir, carregando, gerandoPdf, gerarPdf, compartilharWhatsapp, compartilhando)

  const filtro: FiltroPeriodo = {
    busca,
    status,
    dataInicio: chipPeriodo === 'custom' ? dataInicio : dataInicio,
    dataFim: chipPeriodo === 'custom' ? dataFim : dataFim,
  }

  useEffect(() => {
    const t = setTimeout(() => {
      listarOrcamentos(filtro)
        .then((dados) => {
          setLinhas(dados)
          setErro('')
        })
        .catch((e) => setErro(e.message))
    }, 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, status, dataInicio, dataFim, refresh])

  const totalFiltrado = linhas.reduce((acc, o) => acc + (o.valor ? Number(o.valor) : 0), 0)

  return (
    <section className="orc-table-container">
      {mostrarAtalhos && <ModalAtalhos onFechar={() => setMostrarAtalhos(false)} />}

      <div className="orc-table-filtros">
        <input
          type="text"
          className="orc-input"
          placeholder="Buscar por empresa ou número..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="orc-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="ABERTO">Aberto</option>
          <option value="APROVADO">Aprovado</option>
          <option value="RECUSADO">Recusado</option>
          <option value="ENTREGUE">Entregue</option>
        </select>
        <button
          type="button"
          className={`orc-exportar-btn`}
          title="Exportar para CSV (Excel)"
          onClick={() => exportarCSV(linhas)}
        >
          Exportar CSV
        </button>
        <button
          type="button"
          className="orc-atalhos-btn"
          title="Ver atalhos de teclado (?)"
          onClick={() => setMostrarAtalhos(true)}
          aria-keyshortcuts="?"
        >
          ?
        </button>
      </div>

      <div className="orc-chips-periodo">
        {(['hoje', 'semana', 'mes', 'mes_passado'] as const).map((c) => {
          const labels: Record<string, string> = { hoje: 'Hoje', semana: 'Esta semana', mes: 'Este mês', mes_passado: 'Mês passado' }
          return (
            <button
              key={c}
              type="button"
              className={`orc-chip-periodo ${chipPeriodo === c ? 'orc-chip-ativo' : ''}`}
              onClick={() => selecionarChip(c)}
            >
              {labels[c]}
            </button>
          )
        })}
        <div className="orc-periodo-custom">
          <input
            type="date"
            className="orc-input-data"
            value={dataInicio}
            onChange={(e) => { setDataInicio(e.target.value); setChipPeriodo('') }}
            aria-label="Data inicial"
          />
          <span className="orc-periodo-sep">—</span>
          <input
            type="date"
            className="orc-input-data"
            value={dataFim}
            onChange={(e) => { setDataFim(e.target.value); setChipPeriodo('') }}
            aria-label="Data final"
          />
          {(dataInicio || dataFim) && (
            <button
              type="button"
              className="orc-limpar-data"
              onClick={() => { setDataInicio(''); setDataFim(''); setChipPeriodo('') }}
              aria-label="Limpar filtro de data"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {erro && <p className="orc-table-erro">{erro}</p>}
      {aviso && (
        <div className="orc-table-aviso" role="alert">
          <span>
            {aviso}
            {urlPdfBloqueado && (
              <> — <a href={urlPdfBloqueado} target="_blank" rel="noreferrer">Abrir PDF</a></>
            )}
          </span>
          <button type="button" onClick={() => { setAviso(''); setUrlPdfBloqueado(null) }} aria-label="Fechar aviso">×</button>
        </div>
      )}

      <div className="orc-table-card">
        <div className="orc-table-scroll">
          <table>
            <thead>
              <tr>
                {colunas.map((c) => (
                  <th key={c.titulo}>{c.titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((o) => (
                <tr key={o.id} className={novoId === o.id ? 'linha-nova' : ''}>
                  {colunas.map((c) => (
                    <td key={c.titulo}>{c.render(o)}</td>
                  ))}
                </tr>
              ))}
              {linhas.length === 0 && !erro && (
                <tr>
                  <td colSpan={colunas.length} className="orc-table-vazio">
                    Nenhum orçamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {linhas.length > 0 && (
          <div className="orc-table-rodape">
            <span className="orc-table-contagem">{linhas.length} orçamento{linhas.length !== 1 ? 's' : ''}</span>
            <span className="orc-table-total">Total: <strong>{totalFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
          </div>
        )}
      </div>
    </section>
  )
}
