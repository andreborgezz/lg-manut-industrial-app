/**
 * Backup do banco para o R2.
 *
 * Uso:
 *   tsx scripts/backup.ts          (requer DATABASE_URL, R2_BACKUP_BUCKET e credenciais R2)
 *   node dist/scripts/backup.js    (se compilado)
 *
 * Variáveis de ambiente (via .env ou .env.prod):
 *   DATABASE_URL            — connection string do Postgres
 *   R2_ENDPOINT             — endpoint do R2 (https://<id>.r2.cloudflarestorage.com)
 *   R2_REGION               — default: auto
 *   R2_BACKUP_BUCKET        — bucket separado dos PDFs
 *   R2_BACKUP_ACCESS_KEY_ID — opcional; se ausente, usa R2_ACCESS_KEY_ID
 *   R2_BACKUP_SECRET_ACCESS_KEY — opcional; se ausente, usa R2_SECRET_ACCESS_KEY
 *   BACKUP_PING_URL         — URL base do healthchecks.io (opcional)
 */
import 'dotenv/config'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'

const execFileAsync = promisify(execFile)

// ── helpers ──────────────────────────────────────────────────────────────────

function requerVar(nome: string): string {
  const v = process.env[nome]
  if (!v) { console.error(`[backup] variável ${nome} não configurada`); process.exit(2) }
  return v
}

function log(msg: string) {
  console.log(`[backup ${new Date().toISOString()}] ${msg}`)
}

async function ping(sufixo: '' | '/fail') {
  const base = process.env.BACKUP_PING_URL
  if (!base) return
  try {
    await fetch(`${base}${sufixo}`)
  } catch {
    // falha silenciosa — o ping é best-effort
  }
}

// ── parse DATABASE_URL ────────────────────────────────────────────────────────

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

// ── retenção ─────────────────────────────────────────────────────────────────

type Objeto = { Key: string; LastModified: Date; Size: number }

function isDomingo(nome: string): boolean {
  // formato: AAAA-MM-DD_HHMM.dump
  const m = nome.match(/^(\d{4}-\d{2}-\d{2})/)
  if (!m) return false
  return new Date(m[1]).getDay() === 0
}

async function aplicarRetencao(s3: S3Client, bucket: string) {
  const resp = await s3.send(new ListObjectsV2Command({ Bucket: bucket }))
  const objetos: Objeto[] = (resp.Contents ?? [])
    .filter((o) => o.Key && o.LastModified && o.Size !== undefined)
    .map((o) => ({ Key: o.Key!, LastModified: o.LastModified!, Size: o.Size! }))
    .sort((a, b) => b.LastModified.getTime() - a.LastModified.getTime()) // mais recente primeiro

  const diarios = objetos.filter((o) => !isDomingo(path.basename(o.Key)))
  const semanais = objetos.filter((o) => isDomingo(path.basename(o.Key)))

  const manter = new Set<string>([
    ...diarios.slice(0, 14).map((o) => o.Key),
    ...semanais.slice(0, 8).map((o) => o.Key),
  ])

  const apagar = objetos.filter((o) => !manter.has(o.Key))

  if (apagar.length === 0) {
    log('retenção: nada a apagar')
    return
  }

  log(`retenção: apagando ${apagar.length} objeto(s):`)
  for (const o of apagar) {
    log(`  - ${o.Key} (${(o.Size / 1024).toFixed(1)} KB, ${o.LastModified.toISOString()})`)
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: o.Key }))
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dbUrl = requerVar('DATABASE_URL')
  const r2Endpoint = requerVar('R2_ENDPOINT')
  const r2Region = process.env.R2_REGION ?? 'auto'
  const backupBucket = requerVar('R2_BACKUP_BUCKET')
  const accessKeyId = process.env.R2_BACKUP_ACCESS_KEY_ID ?? requerVar('R2_ACCESS_KEY_ID')
  const secretAccessKey = process.env.R2_BACKUP_SECRET_ACCESS_KEY ?? requerVar('R2_SECRET_ACCESS_KEY')

  const db = parseDatabaseUrl(dbUrl)

  // nome do arquivo: AAAA-MM-DD_HHMM.dump
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const pad = (n: number) => String(n).padStart(2, '0')
  const datePart = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`
  const timePart = `${pad(agora.getHours())}${pad(agora.getMinutes())}`
  const nome = `${datePart}_${timePart}.dump`

  const tmpDir = os.tmpdir()
  const tmpPath = path.join(tmpDir, nome)

  const s3 = new S3Client({
    endpoint: r2Endpoint,
    region: r2Region,
    credentials: { accessKeyId, secretAccessKey },
  })

  try {
    log(`iniciando backup → ${nome}`)

    // pg_dump em formato custom (comprimido)
    const env: NodeJS.ProcessEnv = { ...process.env, PGPASSWORD: db.password }
    await execFileAsync(
      'pg_dump',
      ['-Fc', '-h', db.host, '-p', db.port, '-U', db.user, '-d', db.database, '-f', tmpPath],
      { env }
    )

    const stats = fs.statSync(tmpPath)
    log(`dump gerado: ${(stats.size / 1024).toFixed(1)} KB`)

    // envio ao R2
    const buffer = fs.readFileSync(tmpPath)
    await s3.send(new PutObjectCommand({
      Bucket: backupBucket,
      Key: nome,
      Body: buffer,
      ContentType: 'application/octet-stream',
    }))
    log('upload concluído')

    // teste de integridade
    const head = await s3.send(new HeadObjectCommand({ Bucket: backupBucket, Key: nome }))
    const tamanhoRemoto = head.ContentLength ?? 0
    if (tamanhoRemoto === 0) throw new Error('objeto enviado tem tamanho zero no R2')
    log(`integridade ok: ${(tamanhoRemoto / 1024).toFixed(1)} KB no R2`)

    // retenção
    await aplicarRetencao(s3, backupBucket)

    await ping('')
    log('backup concluído com sucesso')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // nunca imprimir o stack que pode conter env vars
    log(`ERRO: ${msg}`)
    await ping('/fail')
    process.exit(1)
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
  }
}

main()
