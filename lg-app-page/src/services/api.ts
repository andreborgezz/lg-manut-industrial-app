const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type Status = 'ABERTO' | 'APROVADO' | 'RECUSADO' | 'ENTREGUE'

export type OrcamentoLinha = {
  id: number
  empresa: string
  empresaEmail?: string | null
  solicitante: string | null
  solicitanteTelefone: string | null
  solicitanteEmail?: string | null
  entradaEm: string
  numero: number
  numeroPedido: string | null
  maquina: string | null
  mecanico: string | null
  mecanicoId: number | null
  inicioEm: string | null
  entregaEm: string | null
  valor: string | null
  status: Status
  temPdf?: boolean
}

export type FiltroPeriodo = {
  busca?: string
  status?: string
  dataInicio?: string
  dataFim?: string
}

export async function listarOrcamentos(filtro: FiltroPeriodo): Promise<OrcamentoLinha[]> {
  const params = new URLSearchParams()
  if (filtro.busca) params.set('busca', filtro.busca)
  if (filtro.status) params.set('status', filtro.status)
  if (filtro.dataInicio) params.set('dataInicio', filtro.dataInicio)
  if (filtro.dataFim) params.set('dataFim', filtro.dataFim)
  const res = await fetch(`${API}/orcamentos?${params}`, { credentials: 'include' })
  if (!res.ok) throw new Error('erro ao listar orçamentos')
  return res.json()
}

export type Empresa = { id: number; nome: string; cnpj: string | null; email: string | null; telefone: string | null }
export type Solicitante = { id: number; empresaId: number; nome: string; email: string | null; telefone: string | null }
export type Mecanico = { id: number; nome: string; telefone: string | null; ativo: boolean }

export type Orcamento = {
  id: number
  numero: number
  empresaId: number
  solicitanteId: number | null
  mecanicoId: number | null
  maquina: string | null
  titulo: string | null
  escopo: string | null
  valor: string | null
  prazoDias: number | null
  fimDeSemana: boolean
  status: Status
  entradaEm: string
  numeroPedido: string | null
  inicioEm: string | null
  entregaEm: string | null
}

// corpo aceito pelo post /orcamentos
export type NovoOrcamentoBody = {
  empresaId: number
  solicitanteId?: number | null
  mecanicoId?: number | null
  maquina?: string | null
  titulo?: string | null
  escopo?: string | null
  valor?: number | null
  prazoDias?: number | null
  fimDeSemana?: boolean
  entradaEm?: string
}

export type AtualizarOrcamentoBody = Partial<NovoOrcamentoBody> & {
  status?: Status
  numeroPedido?: string | null
  entradaEm?: string
  inicioEm?: string | null
  entregaEm?: string | null
}

export type UsuarioAutenticado = { nome: string; email: string }

export const loginApi = (email: string, senha: string) =>
  chamar<UsuarioAutenticado>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) })

export const logoutApi = () =>
  chamar<{ ok: boolean }>('/auth/logout', { method: 'POST' })

export const meApi = () => chamar<UsuarioAutenticado>('/auth/me')

let _redirecionarParaLogin: (() => void) | null = null

export function registrarRedirecionamentoLogin(fn: () => void) {
  _redirecionarParaLogin = fn
}

// faz o fetch e transforma qualquer erro em Error com mensagem legível
async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API}${caminho}`, {
      ...init,
      credentials: 'include',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    })
  } catch {
    throw new Error('não foi possível conectar ao servidor')
  }

  if (res.status === 401 && caminho !== '/auth/login' && caminho !== '/auth/me') {
    _redirecionarParaLogin?.()
    throw new Error('Sua sessão expirou. Faça login novamente.')
  }

  const dados = await res.json().catch(() => null)
  if (!res.ok) throw new Error(mensagemErro(dados, res.status))
  return dados as T
}

// o back responde { error, campos? } ou { message }
function mensagemErro(dados: unknown, status: number): string {
  const d = dados as { error?: string; message?: string; campos?: { campo: string; mensagem: string }[] } | null
  if (d?.campos?.length) return d.campos.map((c) => `${c.campo}: ${c.mensagem}`).join('; ')
  return d?.error ?? d?.message ?? `erro ${status} no servidor`
}

export const listarEmpresas = () => chamar<Empresa[]>('/empresas')

export const criarEmpresa = (body: { nome: string; email?: string | null; cnpj?: string | null; telefone?: string | null }) =>
  chamar<Empresa>('/empresas', { method: 'POST', body: JSON.stringify(body) })

export const atualizarEmpresa = (id: number, patch: { nome?: string; email?: string | null; cnpj?: string | null; telefone?: string | null }) =>
  chamar<Empresa>(`/empresas/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const listarSolicitantes = (empresaId: number) =>
  chamar<Solicitante[]>(`/solicitantes?empresaId=${empresaId}`)

export const criarSolicitante = (body: {
  empresaId: number
  nome: string
  email: string | null
  telefone: string | null
}) => chamar<Solicitante>('/solicitantes', { method: 'POST', body: JSON.stringify(body) })

export type CttEmpresa = { id: number; empresaId: number; nome: string; email: string | null; cargo: string | null; telefone: string | null }

export type EmpresaDetalhe = {
  empresa: Empresa
  solicitantes: Solicitante[]
  orcamentos: { id: number; numero: number; titulo: string | null; status: Status; valor: string | null; entradaEm: string }[]
  totalAcumulado: string
}

export const buscarEmpresaDetalhe = (id: number) =>
  chamar<EmpresaDetalhe>(`/empresas/${id}?detalhe=1`)

export const listarCttEmpresas = (empresaId: number) =>
  chamar<CttEmpresa[]>(`/ctt-empresas?empresaId=${empresaId}`)

export const criarCttEmpresa = (body: Omit<CttEmpresa, 'id'>) =>
  chamar<CttEmpresa>('/ctt-empresas', { method: 'POST', body: JSON.stringify(body) })

export const atualizarCttEmpresa = (id: number, patch: Partial<Omit<CttEmpresa, 'id' | 'empresaId'>>) =>
  chamar<CttEmpresa>(`/ctt-empresas/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const buscarOrcamento = (id: number) => chamar<Orcamento>(`/orcamentos/${id}`)

// por padrão só ativos; incluirInativos traz todos
export const listarMecanicos = (incluirInativos = false) =>
  chamar<Mecanico[]>(`/mecanicos${incluirInativos ? '?inativos=true' : ''}`)

export const criarMecanico = (body: { nome: string; telefone?: string | null }) =>
  chamar<Mecanico>('/mecanicos', { method: 'POST', body: JSON.stringify(body) })

export const atualizarMecanico = (id: number, patch: { nome?: string; telefone?: string | null; ativo?: boolean }) =>
  chamar<Mecanico>(`/mecanicos/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const criarOrcamento = (body: NovoOrcamentoBody) =>
  chamar<Orcamento>('/orcamentos', { method: 'POST', body: JSON.stringify(body) })

// devolve a linha já no formato da tabela
export const atualizarOrcamento = (id: number, patch: AtualizarOrcamentoBody) =>
  chamar<OrcamentoLinha>(`/orcamentos/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })

export const gerarPdfOrcamento = (id: number) =>
  chamar<{ url: string }>(`/orcamentos/${id}/pdf`, { method: 'POST' })

export const buscarUrlPdfOrcamento = (id: number) =>
  chamar<{ url: string }>(`/orcamentos/${id}/pdf`)

export type EnviarEmailOrcamentoBody = {
  destinatario?: string
  mensagemPersonalizada?: string
}

export type EnviarEmailOrcamentoResposta = {
  sucesso: boolean
  emailId: string
  destinatario: string
  numero: number
}

export const enviarEmailOrcamento = (id: number, body?: EnviarEmailOrcamentoBody) =>
  chamar<EnviarEmailOrcamentoResposta>(`/orcamentos/${id}/email`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })

export type OrcamentoRecente = { id: number; numero: number; titulo: string | null; escopo: string | null; valor: string | null }

export const listarOrcamentosRecentes = (empresaId: number) =>
  chamar<OrcamentoRecente[]>(`/orcamentos?empresaId=${empresaId}&recentes=5`)
