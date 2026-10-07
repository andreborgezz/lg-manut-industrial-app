import type { Request, Response, NextFunction } from 'express'
import { ZodError, type ZodIssue } from 'zod'
import { AppError } from '../utils/errors'

const tipos: Record<string, string> = {
  number: 'um número',
  string: 'um texto',
  boolean: 'verdadeiro ou falso',
}

// mensagem curta em português pros casos simples; senão usa a do zod
function mensagemZod(i: ZodIssue): string {
  switch (i.code) {
    case 'invalid_type':
      if (i.message.includes('received undefined')) return 'campo obrigatório'
      if (i.expected === 'int') return 'deve ser um número inteiro'
      return `deve ser ${tipos[i.expected] ?? 'do tipo ' + i.expected}`
    case 'too_small':
      if (i.origin === 'string') return i.minimum === 1 ? 'campo obrigatório' : `mínimo de ${i.minimum} caracteres`
      return `deve ser no mínimo ${i.minimum}`
    case 'too_big':
      return i.origin === 'string' ? `máximo de ${i.maximum} caracteres` : `deve ser no máximo ${i.maximum}`
    case 'invalid_format':
      if (i.format === 'email') return 'e-mail inválido'
      if (i.format === 'safeint') return 'deve ser um número inteiro'
      return i.message // regex com mensagem própria
    case 'invalid_value':
      return 'valor não permitido'
    default:
      return i.message // custom: já vem em português dos schemas
  }
}

// erros do pg por código sqlstate -> status e mensagem
const errosPg: Record<string, [number, string]> = {
  '23503': [400, 'registro relacionado não existe ou está em uso'],
  '23505': [409, 'já existe um registro com esses dados'],
  '23514': [400, 'algum valor informado não é permitido'],
}

// 4 parâmetros: o express só reconhece como handler de erro assim
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const campos = err.issues.map(i => ({ campo: i.path.join('.'), mensagem: mensagemZod(i) }))
    res.status(400).json({ error: 'validação', campos })
    return
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message })
    return
  }

  const code = (err as { code?: unknown } | null)?.code
  if (typeof code === 'string' && errosPg[code]) {
    const [status, error] = errosPg[code]
    res.status(status).json({ error })
    return
  }

  // não vaza detalhe interno
  console.error(err)
  res.status(500).json({ error: 'erro interno do servidor' })
}
