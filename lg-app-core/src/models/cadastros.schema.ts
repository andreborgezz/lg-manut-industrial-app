import { z } from 'zod'

// '' vira null; o resto passa direto
const vazioParaNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)

const nome = z.string().trim().min(1)

const email = z.preprocess(vazioParaNull, z.email().nullable().optional())

const textoOpcional = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() || null : v),
  z.string().nullable().optional()
)

export const empresaSchema = z.object({ nome, cnpj: textoOpcional, email })

// patch: todos os campos opcionais, só o que vier é alterado
export const empresaPatchSchema = empresaSchema.partial()

export const solicitanteCriarSchema = z.object({
  empresaId: z.number().int().positive(),
  nome,
  email,
  telefone: textoOpcional,
})

export const solicitanteAtualizarSchema = solicitanteCriarSchema.omit({ empresaId: true })

export const mecanicoCriarSchema = z.object({ nome })

export const mecanicoAtualizarSchema = z.object({ nome, ativo: z.boolean() })

// patch: nome e/ou ativo
export const mecanicoPatchSchema = mecanicoAtualizarSchema.partial()

export const cttEmpresaCriarSchema = z.object({
  empresaId: z.number().int().positive(),
  nome,
  email,
  cargo: textoOpcional,
  telefone: textoOpcional,
})

export const cttEmpresaAtualizarSchema = cttEmpresaCriarSchema.omit({ empresaId: true }).partial()
