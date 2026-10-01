import type { Request, Response } from 'express'
import * as service from '../services/solicitante.service'
import { idParam, idQuery } from '../utils/params'

export const listar = async (req: Request, res: Response): Promise<void> => {
  res.json(await service.listarPorEmpresa(idQuery(req.query.empresaId)))
}

export const criar = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(await service.criar(req.body))
}

export const atualizar = async (req: Request, res: Response): Promise<void> => {
  const item = await service.atualizar(idParam(req), req.body)
  if (!item) {
    res.status(404).json({ message: 'Solicitante não encontrado' })
    return
  }
  res.json(item)
}
