import 'dotenv/config'
import pool, { connect } from '../database'

async function main() {
  await connect()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         serial primary key,
      nome       text not null,
      email      text not null unique,
      senha_hash text not null,
      ativo      boolean not null default true,
      criado_em  timestamptz not null default now()
    )
  `)
  console.log('Tabela usuarios criada (ou já existia).')
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
