export type EmpresaContato = {
  id: number
  nome: string
  cargo: string | null
  telefone: string | null
  email: string | null
}

export type Empresa = {
  id: number
  nome: string
  cnpj: string | null
  email: string | null
  telefone: string | null
  contatos?: EmpresaContato[]
}

export type NovaEmpresa = Omit<Empresa, 'id'>
