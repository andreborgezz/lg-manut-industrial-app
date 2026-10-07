import { Router } from 'express'
import * as c from '../controllers/mecanico.controller'
import { asyncHandler as h } from '../utils/asyncHandler'

export const mecanicoRoutes = Router()

mecanicoRoutes.get('/', h(c.listar))
mecanicoRoutes.post('/', h(c.criar))
mecanicoRoutes.put('/:id', h(c.atualizar))
mecanicoRoutes.patch('/:id', h(c.atualizarParcial))
