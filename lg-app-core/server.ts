import 'dotenv/config';
import express from 'express';
import pool, { connect } from './database';

import { routes } from './src/routes';

const app = express();
const port = process.env.PORT || 3000;

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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro na requisição:', err);
  res.status(err.status || 400).json({ error: err.message || 'Erro interno no servidor' });
});

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