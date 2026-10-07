import pool from '../../database'
import type { Mecanico } from '../models/mecanico'
import { mecanicoAtualizarSchema, mecanicoCriarSchema, mecanicoPatchSchema } from '../models/cadastros.schema'
import { montarSet } from '../utils/patch'

export const listar = async (somenteAtivos = true): Promise<Mecanico[]> => {
  const { rows } = await pool.query(
    'select id, nome, ativo from mecanicos where ($1 = false or ativo) order by nome',
    [somenteAtivos]
  )
  return rows
}

export const criar = async (body: unknown): Promise<Mecanico> => {
  const { nome } = mecanicoCriarSchema.parse(body)
  const { rows } = await pool.query(
    'insert into mecanicos (nome) values ($1) returning id, nome, ativo',
    [nome]
  )
  return rows[0]
}

export const atualizar = async (id: number, body: unknown): Promise<Mecanico | undefined> => {
  const d = mecanicoAtualizarSchema.parse(body)
  const { rows } = await pool.query(
    'update mecanicos set nome = $2, ativo = $3 where id = $1 returning id, nome, ativo',
    [id, d.nome, d.ativo]
  )
  return rows[0]
}

// atualiza só os campos enviados (nome e/ou ativo)
export const atualizarParcial = async (id: number, body: unknown): Promise<Mecanico | undefined> => {
  const d = mecanicoPatchSchema.parse(body)
  const { vazio, sets, valores } = montarSet(d, { nome: 'nome', ativo: 'ativo' })
  if (vazio) {
    const { rows } = await pool.query('select id, nome, ativo from mecanicos where id = $1', [id])
    return rows[0]
  }

  const { rows } = await pool.query(
    `update mecanicos set ${sets} where id = $1 returning id, nome, ativo`,
    [id, ...valores]
  )
  return rows[0]
}
