import pool from '../../database'
import type { Empresa } from '../models/empresa'
import { empresaPatchSchema, empresaSchema } from '../models/cadastros.schema'
import { AppError } from '../utils/errors'
import { montarSet } from '../utils/patch'

const colsEmpresa = 'id, nome, cnpj, email, telefone'

export const listar = async (busca = ''): Promise<Empresa[]> => {
  const { rows } = await pool.query(
    `select ${colsEmpresa} from empresas where nome ilike $1 order by id desc`,
    [`%${busca}%`]
  )
  return rows
}

export const buscarPorId = async (id: number): Promise<Empresa | undefined> => {
  const { rows } = await pool.query(
    `select ${colsEmpresa} from empresas where id = $1`,
    [id]
  )
  return rows[0]
}

export const criar = async (body: unknown): Promise<Empresa> => {
  const d = empresaSchema.parse(body)
  const { rows } = await pool.query(
    `insert into empresas (nome, cnpj, email, telefone)
     values ($1, $2, $3, $4) returning ${colsEmpresa}`,
    [d.nome, d.cnpj ?? null, d.email ?? null, d.telefone ?? null]
  )
  return rows[0]
}

export const atualizar = async (id: number, body: unknown): Promise<Empresa | undefined> => {
  const d = empresaSchema.parse(body)
  const { rows } = await pool.query(
    `update empresas set nome = $2, cnpj = $3, email = $4, telefone = $5
     where id = $1 returning ${colsEmpresa}`,
    [id, d.nome, d.cnpj ?? null, d.email ?? null, d.telefone ?? null]
  )
  return rows[0]
}

// atualiza só os campos enviados
export const atualizarParcial = async (id: number, body: unknown): Promise<Empresa | undefined> => {
  const d = empresaPatchSchema.parse(body)
  const { vazio, sets, valores } = montarSet(d as Record<string, unknown>, {
    nome: 'nome',
    cnpj: 'cnpj',
    email: 'email',
    telefone: 'telefone',
  })
  if (vazio) return buscarPorId(id)

  const { rows } = await pool.query(
    `update empresas set ${sets} where id = $1 returning ${colsEmpresa}`,
    [id, ...valores]
  )
  return rows[0]
}

export const remover = async (id: number): Promise<boolean> => {
  const vinculos = await pool.query('select 1 from orcamentos where empresa_id = $1 limit 1', [id])
  if ((vinculos.rowCount ?? 0) > 0) {
    throw new AppError('Não é possível excluir: existem orçamentos vinculados a esta empresa.', 400)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('delete from solicitantes where empresa_id = $1', [id])
    const { rowCount } = await client.query('delete from empresas where id = $1', [id])
    await client.query('COMMIT')
    return (rowCount ?? 0) > 0
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
