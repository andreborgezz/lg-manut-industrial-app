import type { Request, Response } from 'express'
import * as svc from '../services/cttEmpresa.service'
import { idParam, idQuery } from '../utils/params'

export const listar = async (req: Request, res: Response) => {
  if (!req.query.empresaId) {
    res.status(400).json({ message: 'empresaId é obrigatório' })
    return
  }
  const dados = await svc.listarPorEmpresa(idQuery(req.query.empresaId))
  res.json(dados)
}

export const criar = async (req: Request, res: Response) => {
  const novo = await svc.criar(req.body)
  res.status(201).json(novo)
}

export const atualizar = async (req: Request, res: Response) => {
  const id = idParam(req)
  const atualizado = await svc.atualizar(id, req.body)
  if (!atualizado) res.status(404).json({ message: 'contato não encontrado' })
  else res.json(atualizado)
}

