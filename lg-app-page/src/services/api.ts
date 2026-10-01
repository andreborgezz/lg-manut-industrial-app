const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type Status = 'ABERTO' | 'APROVADO' | 'RECUSADO' | 'ENTREGUE'

export type OrcamentoLinha = {
  id: number
  empresa: string
  solicitante: string | null
  entradaEm: string
  numero: number
  numeroPedido: string | null
  maquina: string | null
  mecanico: string | null
  inicioEm: string | null
  entregaEm: string | null
  valor: string | null
  status: Status
}

export async function listarOrcamentos(busca: string, status: string): Promise<OrcamentoLinha[]> {
  const params = new URLSearchParams()
  if (busca) params.set('busca', busca)
  if (status) params.set('status', status)
  const res = await fetch(`${API}/orcamentos?${params}`)
  if (!res.ok) throw new Error('erro ao listar orçamentos')
  return res.json()
}
