import { useEffect, useState } from 'react'
import { listarOrcamentos, type OrcamentoLinha } from '../../services/api'
import './OrcamentosTable.css'

// mesmas colunas e títulos da planilha
const colunas: { titulo: string; render: (o: OrcamentoLinha) => string }[] = [
  { titulo: 'EMPRESA', render: (o) => o.empresa },
  { titulo: 'NOME SOLICITANTE', render: (o) => o.solicitante ?? '' },
  { titulo: 'ENTRADA ORÇAMENTO', render: (o) => dataBR(o.entradaEm) },
  { titulo: 'NUMERO ORÇAMENTO', render: (o) => String(o.numero) },
  { titulo: 'NUMERO DO PEDIDO', render: (o) => o.numeroPedido ?? '' },
  { titulo: 'NOME DA MÁQUINA', render: (o) => o.maquina ?? '' },
  { titulo: 'NOME DO MECÂNICO', render: (o) => o.mecanico ?? '' },
  { titulo: 'INÍCIO DO TRABALHO', render: (o) => dataBR(o.inicioEm) },
  { titulo: 'DATA DA ENTREGA', render: (o) => dataBR(o.entregaEm) },
  { titulo: 'VALOR', render: (o) => moeda(o.valor) },
]

function dataBR(d: string | null) {
  if (!d) return ''
  const [a, m, dia] = d.split('-')
  return `${dia}/${m}/${a}`
}

function moeda(v: string | null) {
  if (v == null) return ''
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function OrcamentosTable() {
  const [linhas, setLinhas] = useState<OrcamentoLinha[]>([])
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [erro, setErro] = useState('')

  // debounce na busca pra não bater no back a cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      listarOrcamentos(busca, status)
        .then((dados) => { setLinhas(dados); setErro('') })
        .catch((e) => setErro(e.message))
    }, 300)
    return () => clearTimeout(t)
  }, [busca, status])

  return (
    <section className="orc-table">
      <div className="orc-table-filtros">
        <input
          placeholder="Buscar por empresa ou número"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="ABERTO">Aberto</option>
          <option value="APROVADO">Aprovado</option>
          <option value="RECUSADO">Recusado</option>
          <option value="ENTREGUE">Entregue</option>
        </select>
      </div>

      {erro && <p className="orc-table-erro">{erro}</p>}

      <div className="orc-table-scroll">
        <table>
          <thead>
            <tr>{colunas.map((c) => <th key={c.titulo}>{c.titulo}</th>)}</tr>
          </thead>
          <tbody>
            {linhas.map((o) => (
              <tr key={o.id}>
                {colunas.map((c) => <td key={c.titulo}>{c.render(o)}</td>)}
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr><td colSpan={colunas.length} className="orc-table-vazio">Nenhum orçamento</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
