import { Request } from 'express'

export function idParam(req: Request, paramName = 'id'): number {
  const valor = Number(req.params[paramName])
  if (isNaN(valor)) {
    throw new Error(`Parâmetro '${paramName}' inválido: esperava um número`)
  }
  return valor
}

export function idQuery(val: unknown): number {
  const valor = Number(val)
  if (isNaN(valor)) {
    throw new Error(`Query param inválido: esperava um número`)
  }
  return valor
}

export function textoQuery(val: unknown): string {
  if (typeof val === 'string') return val
  return ''
}
