export type CttEmpresa = {
  id: number
  empresaId: number
  nome: string
  email: string | null
  cargo: string | null
  telefone: string | null
}

export type NovoCttEmpresa = Omit<CttEmpresa, 'id'>

