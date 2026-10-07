import { Router } from 'express'
import * as c from '../controllers/cttEmpresa.controller'
import { asyncHandler } from '../utils/asyncHandler'

const r = Router()

r.get('/', asyncHandler(c.listar))
r.post('/', asyncHandler(c.criar))
r.patch('/:id', asyncHandler(c.atualizar))

export { r as cttEmpresaRoutes }
