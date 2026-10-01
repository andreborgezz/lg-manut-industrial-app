import pool from '../../database'
import type { Mecanico } from '../models/mecanico'

export const listar = async (somenteAtivos = true): Promise<Mecanico[]> => {
  const { rows } = await pool.query(
    'select id, nome, ativo from mecanicos where ($1 = false or ativo) order by nome',
    [somenteAtivos]
  )
  return rows
}

export const criar = async (d: { nome: string } | string): Promise<Mecanico> => {
  const nome = typeof d === 'string' ? d : d.nome
  const { rows } = await pool.query(
    'insert into mecanicos (nome) values ($1) returning id, nome, ativo',
    [nome]
  )
  return rows[0]
}

export const atualizar = async (id: number, d: { nome: string; ativo: boolean }): Promise<Mecanico | undefined> => {
  const { rows } = await pool.query(
    'update mecanicos set nome = $2, ativo = $3 where id = $1 returning id, nome, ativo',
    [id, d.nome, d.ativo]
  )
  return rows[0]
}
