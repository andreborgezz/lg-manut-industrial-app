export type Solicitante = {
  id: number
  empresaId: number
  nome: string
  email: string | null
  telefone: string | null
}

export type NovoSolicitante = Omit<Solicitante, 'id'>
