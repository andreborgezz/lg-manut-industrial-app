import 'dotenv/config';
import express from 'express';
import pool, { connect } from './database';

import cors from 'cors';
import { routes } from './src/routes';
import { errorHandler } from './src/middlewares/errorHandler';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Rotas da aplicação
app.use(routes);

// Rota de saúde: consulta o banco para garantir disponibilidade
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ message: 'Aplicação rodando na porta ' + port });
  } catch (error) {
    console.error('Falha no healthcheck:', error);
    res.status(500).json({ message: 'Falha na conexão com o banco' });
  }
});

// Alias mantendo compatibilidade com /saude
app.get('/saude', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Falha na conexão com o banco' });
  }
});
// Middleware global para tratamento de erros
app.use(errorHandler);

async function bootstrap() {
  try {
    await connect();
    app.listen(port, () => {
      console.log(`Server rodando na porta: ${port}`);
    });
  } catch (error) {
    console.error('Erro fatal: banco de dados inacessível. Encerrando processo...');
    process.exit(1);
  }
}

bootstrap();