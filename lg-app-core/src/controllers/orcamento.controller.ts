import type { Request, Response } from 'express'
import * as service from '../services/orcamento.service'
import { idParam, textoQuery } from '../utils/params'

export const listar = async (req: Request, res: Response): Promise<void> => {
  const empresaId = req.query.empresaId ? Number(req.query.empresaId) : null
  const recentes = req.query.recentes ? Number(req.query.recentes) : null
  if (empresaId && recentes) {
    res.json(await service.listarRecentes(empresaId, recentes))
    return
  }
  res.json(await service.listar(
    textoQuery(req.query.busca),
    textoQuery(req.query.status),
    textoQuery(req.query.dataInicio),
    textoQuery(req.query.dataFim),
  ))
}

export const buscar = async (req: Request, res: Response): Promise<void> => {
  const item = await service.buscarPorId(idParam(req))
  if (!item) {
    res.status(404).json({ message: 'Orçamento não encontrado' })
    return
  }
  res.json(item)
}

export const criar = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(await service.criar(req.body))
}

export const atualizar = async (req: Request, res: Response): Promise<void> => {
  const item = await service.atualizar(idParam(req), req.body)
  if (!item) {
    res.status(404).json({ message: 'Orçamento não encontrado' })
    return
  }
  res.json(item)
}
