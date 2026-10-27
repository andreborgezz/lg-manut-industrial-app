import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from '../utils/errors'

export type UsuarioToken = { sub: number; nome: string; email: string }

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken
    }
  }
}

export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined
  if (!token) return next(new AppError('não autenticado', 401))

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as unknown as UsuarioToken
    req.usuario = payload
    next()
  } catch {
    next(new AppError('não autenticado', 401))
  }
}
