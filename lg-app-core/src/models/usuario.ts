import pool from '../../database'

export type Usuario = {
  id: number
  nome: string
  email: string
  senhaHash: string
  ativo: boolean
  criadoEm: Date
}

export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  const { rows } = await pool.query<{
    id: number; nome: string; email: string; senha_hash: string; ativo: boolean; criado_em: Date
  }>(
    'SELECT id, nome, email, senha_hash, ativo, criado_em FROM usuarios WHERE email = $1',
    [email.toLowerCase().trim()]
  )
  if (!rows[0]) return null
  const r = rows[0]
  return { id: r.id, nome: r.nome, email: r.email, senhaHash: r.senha_hash, ativo: r.ativo, criadoEm: r.criado_em }
}

export async function buscarUsuarioPorId(id: number): Promise<Usuario | null> {
  const { rows } = await pool.query<{
    id: number; nome: string; email: string; senha_hash: string; ativo: boolean; criado_em: Date
  }>(
    'SELECT id, nome, email, senha_hash, ativo, criado_em FROM usuarios WHERE id = $1',
    [id]
  )
  if (!rows[0]) return null
  const r = rows[0]
  return { id: r.id, nome: r.nome, email: r.email, senhaHash: r.senha_hash, ativo: r.ativo, criadoEm: r.criado_em }
}

export async function criarUsuario(nome: string, email: string, senhaHash: string): Promise<Usuario> {
  const { rows } = await pool.query<{
    id: number; nome: string; email: string; senha_hash: string; ativo: boolean; criado_em: Date
  }>(
    'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email, senha_hash, ativo, criado_em',
    [nome.trim(), email.toLowerCase().trim(), senhaHash]
  )
  const r = rows[0]
  return { id: r.id, nome: r.nome, email: r.email, senhaHash: r.senha_hash, ativo: r.ativo, criadoEm: r.criado_em }
}
