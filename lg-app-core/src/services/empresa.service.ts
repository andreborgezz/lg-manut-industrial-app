import pool from '../../database'
import type { Empresa } from '../models/empresa'
import { empresaPatchSchema, empresaSchema } from '../models/cadastros.schema'
import { montarSet } from '../utils/patch'

export const listar = async (busca = ''): Promise<Empresa[]> => {
  const { rows } = await pool.query(
    'select id, nome, cnpj, email, telefone from empresas where nome ilike $1 order by nome',
    [`%${busca}%`]
  )
  return rows
}

export const buscarPorId = async (id: number): Promise<Empresa | undefined> => {
  const { rows } = await pool.query(
    'select id, nome, cnpj, email, telefone from empresas where id = $1',
    [id]
  )
  return rows[0]
}

export const buscarDetalhe = async (id: number) => {
  const empresa = await buscarPorId(id)
  if (!empresa) return undefined

  const { rows: solicitantes } = await pool.query(
    'select id, nome, email, telefone from solicitantes where empresa_id = $1 order by nome',
    [id]
  )

  const { rows: orcamentos } = await pool.query(
    `select o.id, o.numero, o.titulo, o.status, o.valor::text,
            to_char(o.entrada_em, 'YYYY-MM-DD') as "entradaEm"
     from orcamentos o
     where o.empresa_id = $1
     order by o.numero desc
     limit 10`,
    [id]
  )

  const { rows: [{ total }] } = await pool.query(
    `select coalesce(sum(valor), 0)::text as total from orcamentos where empresa_id = $1`,
    [id]
  )

  return { empresa, solicitantes, orcamentos, totalAcumulado: total }
}

export const criar = async (body: unknown): Promise<Empresa> => {
  const d = empresaSchema.parse(body)
  const { rows } = await pool.query(
    'insert into empresas (nome, cnpj, email, telefone) values ($1, $2, $3, $4) returning id, nome, cnpj, email, telefone',
    [d.nome, d.cnpj ?? null, d.email ?? null, d.telefone ?? null]
  )
  return rows[0]
}

export const atualizar = async (id: number, body: unknown): Promise<Empresa | undefined> => {
  const d = empresaSchema.parse(body)
  const { rows } = await pool.query(
    'update empresas set nome = $2, cnpj = $3, email = $4, telefone = $5 where id = $1 returning id, nome, cnpj, email, telefone',
    [id, d.nome, d.cnpj ?? null, d.email ?? null, d.telefone ?? null]
  )
  return rows[0]
}

// atualiza só os campos enviados
export const atualizarParcial = async (id: number, body: unknown): Promise<Empresa | undefined> => {
  const d = empresaPatchSchema.parse(body)
  const { vazio, sets, valores } = montarSet(d as Record<string, unknown>, { nome: 'nome', cnpj: 'cnpj', email: 'email', telefone: 'telefone' })
  if (vazio) return buscarPorId(id)

  const { rows } = await pool.query(
    `update empresas set ${sets} where id = $1 returning id, nome, cnpj, email, telefone`,
    [id, ...valores]
  )
  return rows[0]
}
