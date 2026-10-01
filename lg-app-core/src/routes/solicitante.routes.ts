import { Router } from 'express'
import * as c from '../controllers/solicitante.controller'
import { asyncHandler as h } from '../utils/asyncHandler'

export const solicitanteRoutes = Router()

solicitanteRoutes.get('/', h(c.listar))
solicitanteRoutes.post('/', h(c.criar))
solicitanteRoutes.put('/:id', h(c.atualizar))
