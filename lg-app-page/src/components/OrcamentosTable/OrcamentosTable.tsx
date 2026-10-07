import { useEffect, useState } from 'react'
import { Copy, Loader2, Pencil } from 'lucide-react'
import {
  atualizarOrcamento,
  buscarOrcamento,
  listarMecanicos,
  listarOrcamentos,
  type AtualizarOrcamentoBody,
  type Mecanico,
  type Orcamento,
  type OrcamentoLinha,
  type Status,
} from '../../services/api'
import { CelulaEditavel, type Opcao } from '../CelulaEditavel/CelulaEditavel'
import './OrcamentosTable.css'

const statusOpcoes: Opcao[] = (['ABERTO', 'APROVADO', 'RECUSADO', 'ENTREGUE'] as Status[]).map((v) => ({
  valor: v,
  label: v,
}))

// ações que abrem o modal com os dados completos do orçamento
type Acao = 'editar' | 'duplicar'

type Coluna = { titulo: string; render: (o: OrcamentoLinha) => React.ReactNode }

// monta as colunas; salvar envia o patch da linha
function montarColunas(
  mecanicos: Mecanico[],
  salvar: (o: OrcamentoLinha, patch: AtualizarOrcamentoBody) => Promise<void>,
  abrir: (o: OrcamentoLinha, acao: Acao) => void,
  carregando: { id: number; acao: Acao } | null
): Coluna[] {
  // mecânicos ativos + o atual da linha (caso tenha sido inativado)
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
          // lembrete: aprovado sem pedido
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
        return (
          <div className="orc-acoes">
            <button
              type="button"
              className="orc-acao-btn"
              title="Editar"
              aria-label={`Editar orçamento ${o.numero}`}
              disabled={carregando !== null}
              onClick={() => abrir(o, 'editar')}
            >
              {girando('editar') ? <Loader2 size={16} className="orc-spin" /> : <Pencil size={16} />}
            </button>
            <button
              type="button"
              className="orc-acao-btn"
              title="Duplicar"
              aria-label={`Duplicar orçamento ${o.numero}`}
              disabled={carregando !== null}
              onClick={() => abrir(o, 'duplicar')}
            >
              {girando('duplicar') ? <Loader2 size={16} className="orc-spin" /> : <Copy size={16} />}
            </button>
          </div>
        )
      },
    },
  ]
}

// formata data yyyy-mm-dd para dd/mm/yyyy
function dataBR(d: string | null) {
  if (!d) return '-'
  const [a, m, dia] = d.split('-')
  return `${dia}/${m}/${a}`
}

// formata valor numerico para BRL
function moeda(v: string | null) {
  if (v == null) return '-'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// refresh: muda de valor pra forçar nova busca (ex: após criar orçamento)
export function OrcamentosTable({
  refresh = 0,
  onDuplicar,
  onEditar,
}: {
  refresh?: number
  onDuplicar?: (original: Orcamento, numero: number) => void
  onEditar?: (original: Orcamento, numero: number) => void
}) {
  const [linhas, setLinhas] = useState<OrcamentoLinha[]>([])
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])

  // mecânicos ativos carregados uma vez para todas as células
  useEffect(() => {
    listarMecanicos()
      .then(setMecanicos)
      .catch((e) => setAviso(e.message))
  }, [])

  // some sozinho depois de uns segundos
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  // envia o patch e troca a linha pela que o back devolveu; em erro, avisa e repassa
  async function salvar(o: OrcamentoLinha, patch: AtualizarOrcamentoBody) {
    try {
      const nova = await atualizarOrcamento(o.id, patch)
      setLinhas((ls) => ls.map((l) => (l.id === nova.id ? nova : l)))
      setAviso('')
    } catch (e) {
      setAviso(`Orçamento ${o.numero}: ${e instanceof Error ? e.message : 'erro ao salvar'}`)
      throw e
    }
  }

  // busca os dados completos do orçamento e entrega pra página abrir o modal
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

  const colunas = montarColunas(mecanicos, salvar, abrir, carregando)

  // busca os orçamentos com debounce de 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      listarOrcamentos(busca, status)
        .then((dados) => {
          setLinhas(dados)
          setErro('')
        })
        .catch((e) => setErro(e.message))
    }, 300)
    return () => clearTimeout(t)
  }, [busca, status, refresh])

  return (
    <section className="orc-table-container">
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
      </div>

      {erro && <p className="orc-table-erro">{erro}</p>}
      {aviso && (
        <div className="orc-table-aviso" role="alert">
          <span>{aviso}</span>
          <button type="button" onClick={() => setAviso('')} aria-label="Fechar aviso">×</button>
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
                <tr key={o.id}>
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
      </div>
    </section>
  )
}
