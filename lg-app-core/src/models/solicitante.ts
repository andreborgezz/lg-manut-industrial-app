export type Solicitante = {
  id: number
  empresaId: number
  nome: string
  cargo: string | null
  email: string | null
  telefone: string | null
}

export type NovoSolicitante = Omit<Solicitante, 'id'>
