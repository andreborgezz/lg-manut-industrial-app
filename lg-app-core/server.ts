import 'dotenv/config'
import './src/config/env' // valida variáveis de ambiente na inicialização
import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import pool, { connect } from './database'
import { routes } from './src/routes'
import { errorHandler } from './src/middlewares/errorHandler'
import { env } from './src/config/env'

const app = express()

// confia no proxy reverso (Caddy) para headers X-Forwarded-For, X-Real-IP etc.
app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({
  origin: env.FRONT_URL,
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json())

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.status(200).json({ ok: true })
  } catch {
    // 503 sem detalhes internos — o UptimeRobot monitora este endpoint
    res.status(503).json({ ok: false })
  }
})

app.use(routes)
app.use(errorHandler)

async function bootstrap() {
  try {
    await connect()
    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`Server rodando na porta: ${env.PORT}`)
    })
  } catch {
    console.error('Erro fatal: banco de dados inacessível. Encerrando processo...')
    process.exit(1)
  }
}

bootstrap()
