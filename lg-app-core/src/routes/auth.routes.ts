import { Router, type Request, type Response, type NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { z } from 'zod'
import { buscarUsuarioPorEmail } from '../models/usuario'
import { autenticar, type UsuarioToken } from '../middlewares/autenticar'
import { AppError } from '../utils/errors'
import { env } from '../config/env'

export const authRoutes = Router()

const limitador = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const body = req.body as { email?: string }
    return `${ipKeyGenerator(req.ip ?? '')}:${(body.email ?? '').toLowerCase().trim()}`
  },
  handler: (_req, _res, next) => {
    next(new AppError('Muitas tentativas. Tente novamente em 15 minutos.', 429))
  },
  skipSuccessfulRequests: true,
})

const schemaLogin = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
})

const ERRO_GENERICO = 'E-mail ou senha inválidos'
const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

authRoutes.post('/login', limitador, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schemaLogin.safeParse(req.body)
    if (!parsed.success) {
      // tempo similar ao caminho de senha errada para não revelar o motivo
      await new Promise((r) => setTimeout(r, 300))
      return next(new AppError(ERRO_GENERICO, 401))
    }

    const { email, senha } = parsed.data
    const usuario = await buscarUsuarioPorEmail(email)

    // hash falso para comparação em tempo constante quando usuário não existe
    const hashFalso = '$2a$12$invalido.hash.para.timing.constante.aqui.mesmo'
    const hashComparar = usuario?.senhaHash ?? hashFalso

    const senhaOk = await bcrypt.compare(senha, hashComparar)

    if (!usuario || !senhaOk || !usuario.ativo) {
      return next(new AppError(ERRO_GENERICO, 401))
    }

    const payload: UsuarioToken = { sub: usuario.id, nome: usuario.nome, email: usuario.email }
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' })

    res.cookie('token', token, COOKIE_OPTS)
    res.json({ nome: usuario.nome, email: usuario.email })
  } catch (err) {
    next(err)
  }
})

authRoutes.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' })
  res.json({ ok: true })
})

authRoutes.get('/me', autenticar, (req: Request, res: Response) => {
  res.json({ nome: req.usuario!.nome, email: req.usuario!.email })
})
