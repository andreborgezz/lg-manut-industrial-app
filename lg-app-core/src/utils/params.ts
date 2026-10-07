import { Request } from 'express'
import { AppError } from './errors'

export function idParam(req: Request, paramName = 'id'): number {
  const valor = Number(req.params[paramName])
  if (isNaN(valor)) {
    throw new AppError(`parâmetro '${paramName}' inválido: esperava um número`, 400)
  }
  return valor
}

export function idQuery(val: unknown): number {
  const valor = Number(val)
  if (isNaN(valor)) {
    throw new AppError('parâmetro de busca inválido: esperava um número', 400)
  }
  return valor
}

export function textoQuery(val: unknown): string {
  if (typeof val === 'string') return val
  return ''
}
