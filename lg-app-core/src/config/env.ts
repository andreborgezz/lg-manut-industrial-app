import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  FRONT_URL: z.string().url('FRONT_URL deve ser uma URL válida').default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  R2_ENDPOINT: z.string().optional(),
  R2_REGION: z.string().default('auto'),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BACKUP_BUCKET: z.string().optional(),
  R2_BACKUP_ACCESS_KEY_ID: z.string().optional(),
  R2_BACKUP_SECRET_ACCESS_KEY: z.string().optional(),
  BACKUP_PING_URL: z.union([z.string().url(), z.literal(''), z.undefined()]).optional(),
})

function validarEnv() {
  const resultado = schema.safeParse(process.env)
  if (!resultado.success) {
    const erros = resultado.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    console.error(`Variáveis de ambiente inválidas:\n${erros}`)
    process.exit(1)
  }
  return resultado.data
}

export const env = validarEnv()
