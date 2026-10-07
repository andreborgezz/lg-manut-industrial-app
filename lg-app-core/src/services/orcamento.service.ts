import pool from '../../database'
import { AppError } from '../utils/errors'
import { criarSchema, patchSchema } from '../models/orcamento.schema'
import type { Orcamento, OrcamentoLinha, Status } from '../models/orcamento'

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

// select da linha da tabela (com nomes já juntados)
const selectLinha = `select
       o.id,
       e.nome as empresa,
       s.nome as solicitante,
       to_char(o.entrada_em, 'YYYY-MM-DD') as "entradaEm",
       o.numero,
       o.numero_pedido as "numeroPedido",
       o.maquina,
       m.nome as mecanico,
       o.mecanico_id as "mecanicoId",
       to_char(o.inicio_em, 'YYYY-MM-DD') as "inicioEm",
       to_char(o.entrega_em, 'YYYY-MM-DD') as "entregaEm",
       o.valor,
       o.status
     from orcamentos o
     join empresas e on e.id = o.empresa_id
     left join solicitantes s on s.id = o.solicitante_id
     left join mecanicos m on m.id = o.mecanico_id`

export const listar = async (busca = '', status?: string): Promise<OrcamentoLinha[]> => {
  const statusFiltrado = status ? (status as Status) : null
  const { rows } = await pool.query(
    `${selectLinha}
     where (e.nome ilike $1 or o.numero::text ilike $1 or o.maquina ilike $1)
       and ($2::text is null or o.status = $2)
     order by o.numero desc`,
    [`%${busca}%`, statusFiltrado]
  )
  return rows
}

export const buscarLinha = async (id: number): Promise<OrcamentoLinha | undefined> => {
  const { rows } = await pool.query(`${selectLinha} where o.id = $1`, [id])
  return rows[0]
}

export const buscarPorId = async (id: number): Promise<Orcamento | undefined> => {
  const { rows } = await pool.query(`select ${cols} from orcamentos where id = $1`, [id])
  return rows[0]
}

// confere vínculos antes de gravar (insert que falha também consome a sequence do número)
const validarVinculos = async (empresaId: number, solicitanteId?: number | null, mecanicoId?: number | null) => {
  const empresa = await pool.query('select 1 from empresas where id = $1', [empresaId])
  if (empresa.rowCount === 0) throw new AppError('empresa não encontrada', 404)

  if (solicitanteId) {
    const sol = await pool.query(
      'select 1 from solicitantes where id = $1 and empresa_id = $2',
      [solicitanteId, empresaId]
    )
    if (sol.rowCount === 0) throw new AppError('solicitante não pertence à empresa informada', 400)
  }

  if (mecanicoId) {
    const mec = await pool.query('select ativo from mecanicos where id = $1', [mecanicoId])
    if (mec.rowCount === 0) throw new AppError('mecânico não encontrado', 404)
    if (!mec.rows[0].ativo) throw new AppError('mecânico está inativo', 400)
  }
}

export const criar = async (body: unknown): Promise<Orcamento> => {
  const d = criarSchema.parse(body)
  await validarVinculos(d.empresaId, d.solicitanteId, d.mecanicoId)

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

// atualiza só os campos enviados e devolve a linha da tabela
export const atualizar = async (id: number, body: unknown): Promise<OrcamentoLinha | undefined> => {
  const patch = patchSchema.parse(body)
  const atual = await buscarPorId(id)
  if (!atual) return undefined

  const chaves = Object.keys(patch).filter(
    k => k in editaveis && (patch as Record<string, unknown>)[k] !== undefined
  )
  if (chaves.length === 0) return buscarLinha(id)

  // datas conferidas contra o que já está gravado (o patch pode trazer só uma)
  const inicio = patch.inicioEm !== undefined ? patch.inicioEm : atual.inicioEm
  const entrega = patch.entregaEm !== undefined ? patch.entregaEm : atual.entregaEm
  if (inicio && entrega && entrega < inicio) {
    throw new AppError('a data de entrega não pode ser anterior ao início', 400)
  }

  const mexeuVinculo = ['empresaId', 'solicitanteId', 'mecanicoId'].some(k => chaves.includes(k))
  if (mexeuVinculo) {
    await validarVinculos(
      patch.empresaId ?? atual.empresaId,
      patch.solicitanteId !== undefined ? patch.solicitanteId : atual.solicitanteId,
      patch.mecanicoId // mecânico só é checado quando enviado
    )
  }

  const sets = chaves.map((k, i) => `${editaveis[k]} = $${i + 2}`)
  const valores = chaves.map(k => (patch as Record<string, unknown>)[k])

  await pool.query(`update orcamentos set ${sets.join(', ')} where id = $1`, [id, ...valores])
  return buscarLinha(id)
}
