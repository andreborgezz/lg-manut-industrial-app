import { Router } from 'express'
import * as c from '../controllers/empresa.controller'
import { asyncHandler as h } from '../utils/asyncHandler'

export const empresaRoutes = Router()

empresaRoutes.get('/', h(c.listar))
empresaRoutes.get('/:id', h(c.buscar))
empresaRoutes.post('/', h(c.criar))
empresaRoutes.put('/:id', h(c.atualizar))
empresaRoutes.patch('/:id', h(c.atualizarParcial))
