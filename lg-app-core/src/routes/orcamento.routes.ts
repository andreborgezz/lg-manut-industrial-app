import { Router } from 'express'
import * as c from '../controllers/orcamento.controller'
import { asyncHandler as h } from '../utils/asyncHandler'

export const orcamentoRoutes = Router()

orcamentoRoutes.get('/', h(c.listar))
orcamentoRoutes.get('/:id', h(c.buscar))
orcamentoRoutes.post('/', h(c.criar))
orcamentoRoutes.patch('/:id', h(c.atualizar))
