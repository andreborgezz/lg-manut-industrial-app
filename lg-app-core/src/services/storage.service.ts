import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// cliente R2 configurado por variáveis de ambiente — nunca expor credenciais em código
const s3 = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: process.env.R2_REGION ?? 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const bucket = () => {
  const b = process.env.R2_BUCKET
  if (!b) throw new Error('R2_BUCKET não configurado')
  return b
}

// envia um buffer como PDF ao R2
export async function enviarPdf(chave: string, buffer: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: chave,
      Body: buffer,
      ContentType: 'application/pdf',
    })
  )
}

// gera URL assinada para acesso temporário — bucket é privado, nunca expor URL direta
export async function urlAssinada(chave: string, segundos = 300): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket(), Key: chave }),
    { expiresIn: segundos }
  )
}
