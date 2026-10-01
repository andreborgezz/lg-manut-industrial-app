import pool from '../../database'
import type { Orcamento, OrcamentoLinha, NovoOrcamento, Status } from '../models/orcamento'

const cols = `
  id, numero,
  empresa_id as "empresaId",
  solicitante_id as "solicitanteId",
  mecanico_id as "mecanicoId",
  maquina, titulo, escopo, valor,
  prazo_dias as "prazoDias",
  fim_de_semana as "fimDeSemana",
  status,
  to_char(entrada_em, 'YYYY-MM-DD') as "entradaEm",
  numero_pedido as "numeroPedido",
  to_char(inicio_em, 'YYYY-MM-DD') as "inicioEm",
  to_char(entrega_em, 'YYYY-MM-DD') as "entregaEm",
  pdf_path as "pdfPath"`

// campos que o patch pode alterar -> coluna no banco
const editaveis: Record<string, string> = {
  empresaId: 'empresa_id',
  solicitanteId: 'solicitante_id',
  mecanicoId: 'mecanico_id',
  maquina: 'maquina',
  titulo: 'titulo',
  escopo: 'escopo',
  valor: 'valor',
  prazoDias: 'prazo_dias',
  fimDeSemana: 'fim_de_semana',
  status: 'status',
  entradaEm: 'entrada_em',
  numeroPedido: 'numero_pedido',
  inicioEm: 'inicio_em',
  entregaEm: 'entrega_em',
  pdfPath: 'pdf_path',
}

export const listar = async (busca = '', status?: string): Promise<OrcamentoLinha[]> => {
  const statusFiltrado = status ? (status as Status) : null
  const { rows } = await pool.query(
    `select
       o.id,
       e.nome as empresa,
       s.nome as solicitante,
       to_char(o.entrada_em, 'YYYY-MM-DD') as "entradaEm",
       o.numero,
       o.numero_pedido as "numeroPedido",
       o.maquina,
       m.nome as mecanico,
       to_char(o.inicio_em, 'YYYY-MM-DD') as "inicioEm",
       to_char(o.entrega_em, 'YYYY-MM-DD') as "entregaEm",
       o.valor,
       o.status
     from orcamentos o
     join empresas e on e.id = o.empresa_id
     left join solicitantes s on s.id = o.solicitante_id
     left join mecanicos m on m.id = o.mecanico_id
     where (e.nome ilike $1 or o.numero::text ilike $1 or o.maquina ilike $1)
       and ($2::text is null or o.status = $2)
     order by o.numero desc`,
    [`%${busca}%`, statusFiltrado]
  )
  return rows
}

export const buscarPorId = async (id: number): Promise<Orcamento | undefined> => {
  const { rows } = await pool.query(`select ${cols} from orcamentos where id = $1`, [id])
  return rows[0]
}

export const criar = async (d: Partial<NovoOrcamento> & { empresaId: number }): Promise<Orcamento> => {
  // 1. Valida se a empresa existe antes de tentar o insert (evita gastar sequence se falhar)
  const checkEmpresa = await pool.query('select 1 from empresas where id = $1', [d.empresaId])
  if (checkEmpresa.rowCount === 0) {
    const error: any = new Error(`Empresa com id ${d.empresaId} não foi encontrada.`)
    error.status = 400
    throw error
  }

  // 2. Se informou solicitante, valida se pertence à empresa
  if (d.solicitanteId) {
    const checkSolicitante = await pool.query(
      'select 1 from solicitantes where id = $1 and empresa_id = $2',
      [d.solicitanteId, d.empresaId]
    )
    if (checkSolicitante.rowCount === 0) {
      const error: any = new Error(
        `Solicitante com id ${d.solicitanteId} não existe ou não pertence à empresa informada.`
      )
      error.status = 400
      throw error
    }
  }

  // 3. Se informou mecânico, valida se existe
  if (d.mecanicoId) {
    const checkMecanico = await pool.query('select 1 from mecanicos where id = $1', [d.mecanicoId])
    if (checkMecanico.rowCount === 0) {
      const error: any = new Error(`Mecânico com id ${d.mecanicoId} não foi encontrado.`)
      error.status = 400
      throw error
    }
  }

  const { rows } = await pool.query(
    `insert into orcamentos
       (empresa_id, solicitante_id, mecanico_id, maquina, titulo, escopo, valor,
        prazo_dias, fim_de_semana, entrada_em, numero_pedido, inicio_em, entrega_em)
     values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9, false),
             coalesce($10, current_date), $11, $12, $13)
     returning ${cols}`,
    [
      d.empresaId, d.solicitanteId ?? null, d.mecanicoId ?? null, d.maquina ?? null,
      d.titulo ?? null, d.escopo ?? null, d.valor ?? null, d.prazoDias ?? null,
      d.fimDeSemana ?? null, d.entradaEm ?? null, d.numeroPedido ?? null,
      d.inicioEm ?? null, d.entregaEm ?? null,
    ]
  )
  return rows[0]
}

export const atualizar = async (id: number, campos: Partial<NovoOrcamento>): Promise<Orcamento | undefined> => {
  const chaves = Object.keys(campos).filter(k => k in editaveis)
  if (chaves.length === 0) return buscarPorId(id)

  const sets = chaves.map((k, i) => `${editaveis[k]} = $${i + 2}`)
  const valores = chaves.map(k => (campos as Record<string, unknown>)[k])

  const { rows } = await pool.query(
    `update orcamentos set ${sets.join(', ')} where id = $1 returning ${cols}`,
    [id, ...valores]
  )
  return rows[0]
}
