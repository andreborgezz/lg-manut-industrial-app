export type Status = 'ABERTO' | 'APROVADO' | 'RECUSADO' | 'ENTREGUE'

// datas como 'YYYY-MM-DD', valor como string (numeric do pg)
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
  pdfPath?: string | null
}

// linha da tabela interativa (com nomes já juntados)
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

export type NovoOrcamento = Omit<Orcamento, 'id' | 'numero'>
