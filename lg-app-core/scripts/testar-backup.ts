/**
 * Teste completo de ciclo de backup/restauração usando o container Docker.
 * Requer que o container `postgres` esteja rodando.
 *
 * Uso: tsx scripts/testar-backup.ts
 */
import 'dotenv/config'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs'

const execFileAsync = promisify(execFile)

const DB_URL = process.env.DATABASE_URL ?? 'postgresql://lg-manutencao:lg-manutencao@localhost:5433/lg_manut_db'
const CONTAINER = 'postgres'
const BANCO_RESTORE = 'lg_manut_test_restore'
const DUMP_HOST = path.join(os.tmpdir(), 'teste-backup.dump')
const DUMP_CONT = '/tmp/teste-backup.dump'

function parseDatabaseUrl(url: string) {
  const u = new URL(url)
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  }
}

const db = parseDatabaseUrl(DB_URL)

// executa comando dentro do container via docker exec com array (sem shell do host)
async function dexec(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('docker', [
    'exec', '-e', `PGPASSWORD=${db.password}`, CONTAINER, ...args,
  ])
  return stdout.trim()
}

async function psql(banco: string, sql: string): Promise<string> {
  return dexec('psql', '-h', 'localhost', '-U', db.user, '-d', banco, '-tAc', sql)
}

async function contarLinhas(banco: string): Promise<Record<string, number>> {
  const tabelas = ['usuarios', 'empresas', 'solicitantes', 'mecanicos', 'orcamentos']
  const contagens: Record<string, number> = {}
  for (const t of tabelas) {
    try {
      const saida = await psql(banco, `SELECT COUNT(*) FROM ${t}`)
      contagens[t] = parseInt(saida, 10)
    } catch {
      contagens[t] = -1 // tabela pode não existir no banco de teste antes da restauração
    }
  }
  return contagens
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  Teste de ciclo backup / restauração')
  console.log('═══════════════════════════════════════\n')

  // 1. contagem original
  console.log(`1. Contando linhas em "${db.database}"...`)
  const antes = await contarLinhas(db.database)
  for (const [t, n] of Object.entries(antes)) console.log(`   ${t.padEnd(18)} ${n}`)

  // 2. pg_dump dentro do container
  console.log('\n2. Gerando dump (pg_dump -Fc)...')
  await dexec('pg_dump', '-Fc', '-h', 'localhost', '-U', db.user, '-d', db.database, '-f', DUMP_CONT)
  await execFileAsync('docker', ['cp', `${CONTAINER}:${DUMP_CONT}`, DUMP_HOST])
  const kb = (fs.statSync(DUMP_HOST).size / 1024).toFixed(1)
  console.log(`   ${kb} KB → ${DUMP_HOST}`)

  // 3. banco destino
  console.log(`\n3. Criando banco destino "${BANCO_RESTORE}"...`)
  await psql('postgres', `DROP DATABASE IF EXISTS ${BANCO_RESTORE}`)
  await psql('postgres', `CREATE DATABASE ${BANCO_RESTORE} OWNER "${db.user}"`)

  // 4. restaurar
  console.log('\n4. Restaurando...')
  await execFileAsync('docker', ['cp', DUMP_HOST, `${CONTAINER}:${DUMP_CONT}`])
  await dexec('pg_restore', '-h', 'localhost', '-U', db.user, '-d', BANCO_RESTORE,
    '--no-owner', '--no-privileges', DUMP_CONT)

  // 5. contagem após restauração
  console.log('\n5. Contando linhas em "${BANCO_RESTORE}"...')
  const depois = await contarLinhas(BANCO_RESTORE)

  // 6. comparação
  console.log('\n6. Comparação:\n')
  console.log(`   ${'tabela'.padEnd(18)} ${'original'.padStart(8)} ${'restaurado'.padStart(10)} ${''.padStart(4)}`)
  console.log(`   ${'-'.repeat(44)}`)
  let passou = true
  for (const t of Object.keys(antes)) {
    const a = antes[t] ?? 0
    const d = depois[t] ?? 0
    const ok = a === d
    if (!ok) passou = false
    console.log(`   ${t.padEnd(18)} ${String(a).padStart(8)} ${String(d).padStart(10)}   ${ok ? '✓' : '✗ DIVERGÊNCIA'}`)
  }

  // 7. limpeza
  console.log('\n7. Removendo banco de teste e arquivo temporário...')
  await psql('postgres', `DROP DATABASE IF EXISTS ${BANCO_RESTORE}`)
  if (fs.existsSync(DUMP_HOST)) fs.unlinkSync(DUMP_HOST)
  await dexec('rm', '-f', DUMP_CONT)

  console.log('\n═══════════════════════════════════════')
  if (passou) {
    console.log('  ✓ Ciclo completo OK — backup e restauração funcionando')
  } else {
    console.log('  ✗ Divergências encontradas — verificar!')
    process.exit(1)
  }
  console.log('═══════════════════════════════════════')
}

main().catch((e) => { console.error('Erro:', e instanceof Error ? e.message : e); process.exit(1) })
