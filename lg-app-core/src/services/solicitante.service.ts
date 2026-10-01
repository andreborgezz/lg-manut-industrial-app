import pool from '../../database'
import type { Solicitante, NovoSolicitante } from '../models/solicitante'

const cols = 'id, empresa_id as "empresaId", nome, email, telefone'

export const listarPorEmpresa = async (empresaId: number): Promise<Solicitante[]> => {
  const { rows } = await pool.query(
    `select ${cols} from solicitantes where empresa_id = $1 order by nome`,
    [empresaId]
  )
  return rows
}

export const criar = async (d: NovoSolicitante): Promise<Solicitante> => {
  const { rows } = await pool.query(
    `insert into solicitantes (empresa_id, nome, email, telefone)
     values ($1, $2, $3, $4) returning ${cols}`,
    [d.empresaId, d.nome, d.email, d.telefone]
  )
  return rows[0]
}

export const atualizar = async (id: number, d: Omit<NovoSolicitante, 'empresaId'>): Promise<Solicitante | undefined> => {
  const { rows } = await pool.query(
    `update solicitantes set nome = $2, email = $3, telefone = $4
     where id = $1 returning ${cols}`,
    [id, d.nome, d.email, d.telefone]
  )
  return rows[0]
}
