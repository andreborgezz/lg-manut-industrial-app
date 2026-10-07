import { z } from 'zod'

// '' (ou só espaços) vira null
const vazioParaNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)

// string numérica vira número (aceita vírgula decimal); o resto passa direto
const paraNumero = (v: unknown) => {
  const x = vazioParaNull(v)
  if (typeof x !== 'string') return x
  const n = Number(x.replace(',', '.'))
  return Number.isNaN(n) ? x : n
}

// formato AAAA-MM-DD e data que existe no calendário
const dataValida = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

const texto = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() || null : v),
  z.string().nullable().optional()
)

const idOpcional = z.preprocess(paraNumero, z.number().int().positive().nullable().optional())

const data = z.preprocess(
  vazioParaNull,
  z
    .string()
    .refine(dataValida, 'data inválida, use o formato AAAA-MM-DD')
    .nullable()
    .optional()
)

// numeric do pg trafega como string com 2 casas
const valor = z.preprocess(
  paraNumero,
  z
    .number()
    .min(0)
    .nullable()
    .optional()
    .transform((v) => (v == null ? v : v.toFixed(2)))
)

const prazoDias = z.preprocess(paraNumero, z.number().int().min(0).nullable().optional())

const campos = {
  solicitanteId: idOpcional,
  mecanicoId: idOpcional,
  maquina: texto,
  titulo: texto,
  escopo: texto,
  valor,
  prazoDias,
  fimDeSemana: z.boolean().optional(),
  numeroPedido: texto,
  entradaEm: data,
  inicioEm: data,
  entregaEm: data,
}

export const statusSchema = z.enum(['ABERTO', 'APROVADO', 'RECUSADO', 'ENTREGUE'])

type Datas = { inicioEm?: string | null; entregaEm?: string | null }

// entrega não pode ser antes do início (quando as duas vêm juntas)
const checarDatas = (d: Datas, ctx: z.RefinementCtx) => {
  if (d.inicioEm && d.entregaEm && d.entregaEm < d.inicioEm) {
    ctx.addIssue({
      code: 'custom',
      path: ['entregaEm'],
      message: 'a data de entrega não pode ser anterior ao início',
    })
  }
}

export const criarSchema = z
  .object({ empresaId: z.number().int().positive(), ...campos })
  .superRefine(checarDatas)

// só as chaves enviadas são alteradas (zod descarta o que não está no schema)
export const patchSchema = z
  .object({
    empresaId: z.number().int().positive().optional(),
    status: statusSchema.optional(),
    ...campos,
  })
  .superRefine(checarDatas)

export type CriarOrcamentoInput = z.output<typeof criarSchema>
export type PatchOrcamentoInput = z.output<typeof patchSchema>
