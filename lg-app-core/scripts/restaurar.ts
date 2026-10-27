/**
 * Restaura um backup do R2 num banco NOVO (nunca por cima do banco em uso).
 *
 * Uso:
 *   tsx scripts/restaurar.ts <nome-do-banco-destino>
 *
 * Variáveis de ambiente: DATABASE_URL (para conectar ao postgres admin),
 *   R2_ENDPOINT, R2_BACKUP_BUCKET, R2_BACKUP_ACCESS_KEY_ID?, R2_BACKUP_SECRET_ACCESS_KEY?
 */
import 'dotenv/config'
import { execFile } from 'child_process'
import { promisify } from 'util'
import readline from 'readline'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'

const execFileAsync = promisify(execFile)

function requerVar(nome: string): string {
  const v = process.env[nome]
  if (!v) { console.error(`variável ${nome} não configurada`); process.exit(2) }
  return v
}

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

function perguntar(rl: readline.Interface, q: string): Promise<string> {
  return new Promise((r) => rl.question(q, r))
}

async function main() {
  const bancoDest = process.argv[2]
  if (!bancoDest) {
    console.error('Uso: tsx scripts/restaurar.ts <nome-do-banco-destino>')
    process.exit(1)
  }

  const dbUrl = requerVar('DATABASE_URL')
  const r2Endpoint = requerVar('R2_ENDPOINT')
  const r2Region = process.env.R2_REGION ?? 'auto'
  const backupBucket = requerVar('R2_BACKUP_BUCKET')
  const accessKeyId = process.env.R2_BACKUP_ACCESS_KEY_ID ?? requerVar('R2_ACCESS_KEY_ID')
  const secretAccessKey = process.env.R2_BACKUP_SECRET_ACCESS_KEY ?? requerVar('R2_SECRET_ACCESS_KEY')

  const db = parseDatabaseUrl(dbUrl)

  // protege contra restaurar no banco em uso
  if (bancoDest === db.database) {
    console.error(`\n⛔ PROIBIDO: o banco destino não pode ser "${db.database}" (banco em uso).`)
    console.error('Informe um nome diferente.')
    process.exit(1)
  }

  const s3 = new S3Client({
    endpoint: r2Endpoint,
    region: r2Region,
    credentials: { accessKeyId, secretAccessKey },
  })

  // listar backups disponíveis
  const resp = await s3.send(new ListObjectsV2Command({ Bucket: backupBucket }))
  const objetos = (resp.Contents ?? [])
    .filter((o) => o.Key && o.Size)
    .sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0))

  if (objetos.length === 0) {
    console.error('Nenhum backup encontrado no bucket.')
    process.exit(1)
  }

  console.log('\nBackups disponíveis (mais recente primeiro):\n')
  objetos.forEach((o, i) => {
    const kb = ((o.Size ?? 0) / 1024).toFixed(1)
    console.log(`  [${i + 1}] ${o.Key}  (${kb} KB  —  ${o.LastModified?.toISOString()})`)
  })
  console.log()

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const escolhaStr = await perguntar(rl, 'Número do backup a restaurar: ')
  const escolha = parseInt(escolhaStr, 10)
  if (isNaN(escolha) || escolha < 1 || escolha > objetos.length) {
    console.error('Escolha inválida.')
    rl.close(); process.exit(1)
  }

  const selecionado = objetos[escolha - 1]!
  const kb = ((selecionado.Size ?? 0) / 1024).toFixed(1)

  console.log(`\nSelecionado: ${selecionado.Key}  (${kb} KB)`)
  console.log(`Banco destino: ${bancoDest}  (será CRIADO — se já existir, será APAGADO e recriado)`)

  const confirmacao = await perguntar(rl, '\nDigite "confirmo" para continuar: ')
  rl.close()

  if (confirmacao.trim().toLowerCase() !== 'confirmo') {
    console.log('Operação cancelada.')
    process.exit(0)
  }

  // download do backup
  const tmpPath = path.join(os.tmpdir(), selecionado.Key!)
  console.log('\nBaixando backup...')

  const get = await s3.send(new GetObjectCommand({ Bucket: backupBucket, Key: selecionado.Key! }))
  const chunks: Uint8Array[] = []
  for await (const chunk of get.Body as AsyncIterable<Uint8Array>) chunks.push(chunk)
  fs.writeFileSync(tmpPath, Buffer.concat(chunks))
  console.log(`Download concluído: ${(fs.statSync(tmpPath).size / 1024).toFixed(1)} KB`)

  const pgEnv: NodeJS.ProcessEnv = { ...process.env, PGPASSWORD: db.password }
  const psqlArgs = ['-h', db.host, '-p', db.port, '-U', db.user]

  try {
    // dropar e recriar banco destino
    console.log(`\nApagando banco "${bancoDest}" (se existir)...`)
    await execFileAsync('psql', [...psqlArgs, '-d', 'postgres', '-c',
      `DROP DATABASE IF EXISTS "${bancoDest}"`], { env: pgEnv })

    console.log(`Criando banco "${bancoDest}"...`)
    await execFileAsync('psql', [...psqlArgs, '-d', 'postgres', '-c',
      `CREATE DATABASE "${bancoDest}" OWNER "${db.user}"`], { env: pgEnv })

    // restaurar
    console.log('Restaurando...')
    await execFileAsync('pg_restore', [
      '-h', db.host, '-p', db.port, '-U', db.user,
      '-d', bancoDest,
      '--no-owner', '--no-privileges',
      tmpPath,
    ], { env: pgEnv })

    console.log(`\n✓ Restauração concluída no banco "${bancoDest}".`)
    console.log(`  Para conferir: psql -h ${db.host} -p ${db.port} -U ${db.user} -d ${bancoDest}`)
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e)
  console.error(`Erro: ${msg}`)
  process.exit(1)
})
