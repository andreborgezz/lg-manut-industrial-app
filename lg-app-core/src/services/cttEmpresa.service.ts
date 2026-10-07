import pool from '../../database'
import type { CttEmpresa } from '../models/cttEmpresa'
import { cttEmpresaAtualizarSchema, cttEmpresaCriarSchema } from '../models/cadastros.schema'
import { montarSet } from '../utils/patch'

const cols = 'id, empresa_id as "empresaId", nome, email, cargo, telefone'

export const listarPorEmpresa = async (empresaId: number): Promise<CttEmpresa[]> => {
  const { rows } = await pool.query(
    `select ${cols} from ctt_empresas where empresa_id = $1 order by nome`,
    [empresaId]
  )
  return rows
}

export const criar = async (body: unknown): Promise<CttEmpresa> => {
  const d = cttEmpresaCriarSchema.parse(body)
  const { rows } = await pool.query(
    `insert into ctt_empresas (empresa_id, nome, email, cargo, telefone)
     values ($1, $2, $3, $4, $5) returning ${cols}`,
    [d.empresaId, d.nome, d.email ?? null, d.cargo ?? null, d.telefone ?? null]
  )
  return rows[0]
}

// atualiza só os campos enviados
export const atualizar = async (id: number, body: unknown): Promise<CttEmpresa | undefined> => {
  const d = cttEmpresaAtualizarSchema.parse(body)
  const { vazio, sets, valores } = montarSet(d, {
    nome: 'nome',
    email: 'email',
    cargo: 'cargo',
    telefone: 'telefone',
  })
  if (vazio) {
    const { rows } = await pool.query(`select ${cols} from ctt_empresas where id = $1`, [id])
    return rows[0]
  }

  const { rows } = await pool.query(
    `update ctt_empresas set ${sets} where id = $1 returning ${cols}`,
    [id, ...valores]
  )
  return rows[0]
}
