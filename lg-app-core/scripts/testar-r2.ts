import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();

const endpoint = process.env.R2_ENDPOINT;
const bucketName = process.env.R2_BUCKET;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey || !endpoint || !bucketName) {
  console.error('❌ ERRO: R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY precisam ser configurados no .env!');
  console.log('Exemplo no .env:');
  console.log('R2_ACCESS_KEY_ID=seu_token_access_key');
  console.log('R2_SECRET_ACCESS_KEY=seu_token_secret_key');
  process.exit(1);
}

const region = process.env.R2_REGION || 'auto';

const s3 = new S3Client({
  region,
  endpoint: endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function streamToString(stream: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

async function testarR2() {
  const fileName = `teste-r2-${Date.now()}.txt`;
  const fileContent = `Teste de conexão com Cloudflare R2 realizado em: ${new Date().toISOString()}`;

  console.log(`🚀 Iniciando teste com Cloudflare R2...`);
  console.log(`📦 Bucket: ${bucketName}`);
  console.log(`🔗 Endpoint: ${endpoint}`);

  try {
    // 1. Enviar arquivo
    console.log(`\n1️⃣ Enviando arquivo "${fileName}"...`);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: fileContent,
        ContentType: 'text/plain',
      })
    );
    console.log(`✅ Arquivo enviado com sucesso!`);

    // 2. Ler arquivo de volta
    console.log(`\n2️⃣ Lendo arquivo "${fileName}" de volta...`);
    const getResponse = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      })
    );
    const contentRead = await streamToString(getResponse.Body);
    console.log(`📄 Conteúdo recebido:\n"${contentRead}"`);

    // 3. Excluir arquivo de teste
    console.log(`\n3️⃣ Excluindo arquivo de teste "${fileName}"...`);
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      })
    );
    console.log(`✅ Arquivo excluído com sucesso!`);

    console.log(`\n🎉 Teste do Cloudflare R2 concluído com 100% de sucesso! Armazenamento validado.`);
  } catch (err: any) {
    console.error(`\n❌ Falha no teste do R2:`, err.message || err);
    process.exit(1);
  }
}

testarR2();
