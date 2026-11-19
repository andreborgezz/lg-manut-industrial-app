import pool from '../../database'
import type { Mecanico } from '../models/mecanico'
import { mecanicoAtualizarSchema, mecanicoCriarSchema, mecanicoPatchSchema } from '../models/cadastros.schema'
import { montarSet } from '../utils/patch'

const COLS = 'id, nome, telefone, descricao, ativo'

export const listar = async (somenteAtivos = true): Promise<Mecanico[]> => {
  const { rows } = await pool.query(
    `select ${COLS} from mecanicos where ($1 = false or ativo) order by nome`,
    [somenteAtivos]
  )
  return rows
}

export const criar = async (body: unknown): Promise<Mecanico> => {
  const { nome, telefone, descricao } = mecanicoCriarSchema.parse(body)
  const { rows } = await pool.query(
    `insert into mecanicos (nome, telefone, descricao) values ($1, $2, $3) returning ${COLS}`,
    [nome, telefone ?? null, descricao ?? null]
  )
  return rows[0]
}

export const atualizar = async (id: number, body: unknown): Promise<Mecanico | undefined> => {
  const d = mecanicoAtualizarSchema.parse(body)
  const { rows } = await pool.query(
    `update mecanicos set nome = $2, telefone = $3, descricao = $4, ativo = $5 where id = $1 returning ${COLS}`,
    [id, d.nome, d.telefone ?? null, d.descricao ?? null, d.ativo]
  )
  return rows[0]
}

// atualiza só os campos enviados (nome, telefone, descricao e/ou ativo)
export const atualizarParcial = async (id: number, body: unknown): Promise<Mecanico | undefined> => {
  const d = mecanicoPatchSchema.parse(body)
  const { vazio, sets, valores } = montarSet(d as Record<string, unknown>, {
    nome: 'nome',
    telefone: 'telefone',
    descricao: 'descricao',
    ativo: 'ativo',
  })
  if (vazio) {
    const { rows } = await pool.query(`select ${COLS} from mecanicos where id = $1`, [id])
    return rows[0]
  }

  const { rows } = await pool.query(
    `update mecanicos set ${sets} where id = $1 returning ${COLS}`,
    [id, ...valores]
  )
  return rows[0]
}

export const remover = async (id: number): Promise<boolean> => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('update orcamentos set mecanico_id = null where mecanico_id = $1', [id])
    const { rowCount } = await client.query('delete from mecanicos where id = $1', [id])
    await client.query('COMMIT')
    return (rowCount ?? 0) > 0
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
