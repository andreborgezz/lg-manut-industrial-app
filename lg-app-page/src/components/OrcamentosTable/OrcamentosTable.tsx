import { useEffect, useState } from 'react'
import { listarOrcamentos, type OrcamentoLinha } from '../../services/api'
import './OrcamentosTable.css'

// colunas e renderizadores da tabela de orçamentos
const colunas: { titulo: string; render: (o: OrcamentoLinha) => React.ReactNode }[] = [
  { titulo: 'EMPRESA', render: (o) => o.empresa },
  { titulo: 'SOLICITANTE', render: (o) => o.solicitante ?? '-' },
  { titulo: 'ENTRADA', render: (o) => dataBR(o.entradaEm) },
  { titulo: 'Nº ORÇAMENTO', render: (o) => String(o.numero) },
  { titulo: 'Nº PEDIDO', render: (o) => o.numeroPedido ?? '-' },
  { titulo: 'MÁQUINA', render: (o) => o.maquina ?? '-' },
  { titulo: 'MECÂNICO', render: (o) => o.mecanico ?? '-' },
  { titulo: 'INÍCIO', render: (o) => dataBR(o.inicioEm) },
  { titulo: 'ENTREGA', render: (o) => dataBR(o.entregaEm) },
  { titulo: 'VALOR', render: (o) => moeda(o.valor) },
  {
    titulo: 'STATUS',
    render: (o) => (
      <span className={`badge badge-${o.status.toLowerCase()}`}>
        {o.status}
      </span>
    ),
  },
]

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

export function OrcamentosTable() {
  const [linhas, setLinhas] = useState<OrcamentoLinha[]>([])
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [erro, setErro] = useState('')

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
  }, [busca, status])

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
