import pool from '../../database'
import type { Empresa } from '../models/empresa'
import { empresaPatchSchema, empresaSchema } from '../models/cadastros.schema'
import { montarSet } from '../utils/patch'

export const listar = async (busca = ''): Promise<Empresa[]> => {
  const { rows } = await pool.query(
    'select id, nome, cnpj, email from empresas where nome ilike $1 order by nome',
    [`%${busca}%`]
  )
  return rows
}

export const buscarPorId = async (id: number): Promise<Empresa | undefined> => {
  const { rows } = await pool.query(
    'select id, nome, cnpj, email from empresas where id = $1',
    [id]
  )
  return rows[0]
}

export const criar = async (body: unknown): Promise<Empresa> => {
  const d = empresaSchema.parse(body)
  const { rows } = await pool.query(
    'insert into empresas (nome, cnpj, email) values ($1, $2, $3) returning id, nome, cnpj, email',
    [d.nome, d.cnpj ?? null, d.email ?? null]
  )
  return rows[0]
}

export const atualizar = async (id: number, body: unknown): Promise<Empresa | undefined> => {
  const d = empresaSchema.parse(body)
  const { rows } = await pool.query(
    'update empresas set nome = $2, cnpj = $3, email = $4 where id = $1 returning id, nome, cnpj, email',
    [id, d.nome, d.cnpj ?? null, d.email ?? null]
  )
  return rows[0]
}

// atualiza só os campos enviados
export const atualizarParcial = async (id: number, body: unknown): Promise<Empresa | undefined> => {
  const d = empresaPatchSchema.parse(body)
  const { vazio, sets, valores } = montarSet(d, { nome: 'nome', cnpj: 'cnpj', email: 'email' })
  if (vazio) return buscarPorId(id)

  const { rows } = await pool.query(
    `update empresas set ${sets} where id = $1 returning id, nome, cnpj, email`,
    [id, ...valores]
  )
  return rows[0]
}
