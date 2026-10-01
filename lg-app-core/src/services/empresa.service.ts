import pool from '../../database'
import type { Empresa, NovaEmpresa } from '../models/empresa'

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

export const criar = async (d: NovaEmpresa): Promise<Empresa> => {
  const { rows } = await pool.query(
    'insert into empresas (nome, cnpj, email) values ($1, $2, $3) returning id, nome, cnpj, email',
    [d.nome, d.cnpj, d.email]
  )
  return rows[0]
}

export const atualizar = async (id: number, d: NovaEmpresa): Promise<Empresa | undefined> => {
  const { rows } = await pool.query(
    'update empresas set nome = $2, cnpj = $3, email = $4 where id = $1 returning id, nome, cnpj, email',
    [id, d.nome, d.cnpj, d.email]
  )
  return rows[0]
}
