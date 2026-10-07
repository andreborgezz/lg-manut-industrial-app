import pool from '../../database'
import type { Solicitante } from '../models/solicitante'
import { solicitanteAtualizarSchema, solicitanteCriarSchema } from '../models/cadastros.schema'

const cols = 'id, empresa_id as "empresaId", nome, email, telefone'

export const listarPorEmpresa = async (empresaId: number): Promise<Solicitante[]> => {
  const { rows } = await pool.query(
    `select ${cols} from solicitantes where empresa_id = $1 order by nome`,
    [empresaId]
  )
  return rows
}

export const criar = async (body: unknown): Promise<Solicitante> => {
  const d = solicitanteCriarSchema.parse(body)
  const { rows } = await pool.query(
    `insert into solicitantes (empresa_id, nome, email, telefone)
     values ($1, $2, $3, $4) returning ${cols}`,
    [d.empresaId, d.nome, d.email ?? null, d.telefone ?? null]
  )
  return rows[0]
}

export const atualizar = async (id: number, body: unknown): Promise<Solicitante | undefined> => {
  const d = solicitanteAtualizarSchema.parse(body)
  const { rows } = await pool.query(
    `update solicitantes set nome = $2, email = $3, telefone = $4
     where id = $1 returning ${cols}`,
    [id, d.nome, d.email ?? null, d.telefone ?? null]
  )
  return rows[0]
}
