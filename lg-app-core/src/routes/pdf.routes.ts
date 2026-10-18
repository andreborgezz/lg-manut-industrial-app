import { Router } from 'express'
import { asyncHandler as h } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { buscarPorId } from '../services/orcamento.service'
import { gerarPdfOrcamento } from '../services/pdf.service'
import { enviarPdf, urlAssinada } from '../services/storage.service'
import pool from '../../database'

export const pdfRoutes = Router()

// gera o PDF, salva no R2 e devolve URL assinada
pdfRoutes.post('/:id/pdf', h(async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) throw new AppError('id inválido', 400)

  const orc = await buscarPorId(id)
  if (!orc) throw new AppError('orçamento não encontrado', 404)

  const buffer = await gerarPdfOrcamento({
    numero: orc.numero,
    titulo: orc.titulo,
    escopo: orc.escopo,
    valor: orc.valor,
    prazoDias: orc.prazoDias,
    fimDeSemana: orc.fimDeSemana,
  })

  const chave = `orcamentos/${orc.numero}.pdf`
  await enviarPdf(chave, buffer)

  // grava o caminho no banco
  await pool.query('UPDATE orcamentos SET pdf_path = $2 WHERE id = $1', [id, chave])

  const url = await urlAssinada(chave, 300)
  res.json({ url })
}))

// devolve URL assinada se já existir um PDF gerado
pdfRoutes.get('/:id/pdf', h(async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) throw new AppError('id inválido', 400)

  const orc = await buscarPorId(id)
  if (!orc) throw new AppError('orçamento não encontrado', 404)

  if (!orc.pdfPath) throw new AppError('PDF ainda não gerado para este orçamento', 404)

  const url = await urlAssinada(orc.pdfPath, 300)
  res.json({ url })
}))
