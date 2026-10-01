export type Empresa = {
  id: number
  nome: string
  cnpj: string | null
  email: string | null
}

export type NovaEmpresa = Omit<Empresa, 'id'>
