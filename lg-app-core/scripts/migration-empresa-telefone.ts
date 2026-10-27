import pool from '../database'

async function run() {
  await pool.query(`
    ALTER TABLE empresas
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(30) NULL
  `)
  console.log('Coluna telefone adicionada em empresas (ou já existia).')
  await pool.end()
}

run().catch((e) => { console.error(e); process.exit(1) })
