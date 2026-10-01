import { Router } from 'express'
import { empresaRoutes } from './empresa.routes'
import { mecanicoRoutes } from './mecanico.routes'
import { orcamentoRoutes } from './orcamento.routes'
import { solicitanteRoutes } from './solicitante.routes'

export const routes = Router()

routes.use('/empresas', empresaRoutes)
routes.use('/solicitantes', solicitanteRoutes)
routes.use('/mecanicos', mecanicoRoutes)
routes.use('/orcamentos', orcamentoRoutes)
