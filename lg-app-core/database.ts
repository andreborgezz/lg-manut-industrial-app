import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL ?? '';
const ehBancoLocal =
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('@postgres:');

const pool = new Pool({
  connectionString,
  ssl:
    !ehBancoLocal && !connectionString.includes('sslmode=')
      ? { rejectUnauthorized: false }
      : undefined,
});

export async function connect() {
  try {
    await pool.query('SELECT 1');
    await pool.query(
      'ALTER TABLE empresas ADD COLUMN IF NOT EXISTS endereco text, ADD COLUMN IF NOT EXISTS observacoes text'
    );
    await pool.query(
      'ALTER TABLE mecanicos ADD COLUMN IF NOT EXISTS descricao text'
    );
    await pool.query(
      "UPDATE orcamentos SET status = 'APROVADO' WHERE status = 'ENTREGUE'"
    );
    console.log('Banco de dados conectado');
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
    throw error;
  }
}

export default pool;