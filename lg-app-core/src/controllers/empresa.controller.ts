import type { Request, Response } from 'express'
import * as service from '../services/empresa.service'
import { idParam, textoQuery } from '../utils/params'

export const listar = async (req: Request, res: Response): Promise<void> => {
  res.json(await service.listar(textoQuery(req.query.busca)))
}

export const buscar = async (req: Request, res: Response): Promise<void> => {
  const item = await service.buscarPorId(idParam(req))
  if (!item) {
    res.status(404).json({ message: 'Empresa não encontrada' })
    return
  }
  res.json(item)
}

export const criar = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(await service.criar(req.body))
}

export const atualizarParcial = async (req: Request, res: Response): Promise<void> => {
  const item = await service.atualizarParcial(idParam(req), req.body)
  if (!item) {
    res.status(404).json({ message: 'Empresa não encontrada' })
    return
  }
  res.json(item)
}

export const atualizar = async (req: Request, res: Response): Promise<void> => {
  const item = await service.atualizar(idParam(req), req.body)
  if (!item) {
    res.status(404).json({ message: 'Empresa não encontrada' })
    return
  }
  res.json(item)
}
