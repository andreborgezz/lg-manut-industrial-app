import { Router } from 'express'
import { empresaRoutes } from './empresa.routes'
import { mecanicoRoutes } from './mecanico.routes'
import { orcamentoRoutes } from './orcamento.routes'
import { solicitanteRoutes } from './solicitante.routes'
import { cttEmpresaRoutes } from './cttEmpresa.routes'
import { pdfRoutes } from './pdf.routes'
import { authRoutes } from './auth.routes'
import { autenticar } from '../middlewares/autenticar'

export const routes = Router()

// Auth: sem middleware de autenticação
routes.use('/auth', authRoutes)

// Todas as demais rotas requerem autenticação
routes.use(autenticar)

routes.use('/empresas', empresaRoutes)
routes.use('/solicitantes', solicitanteRoutes)
routes.use('/mecanicos', mecanicoRoutes)
routes.use('/orcamentos', orcamentoRoutes)
routes.use('/orcamentos', pdfRoutes)
routes.use('/ctt-empresas', cttEmpresaRoutes)
