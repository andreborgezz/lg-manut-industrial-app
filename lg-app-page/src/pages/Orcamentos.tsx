import { Layout } from '../components/Layout/Layout'
import { OrcamentosTable } from '../components/OrcamentosTable/OrcamentosTable'

export default function Orcamentos() {
  return (
    <Layout>
      <div className="page-header">
        <h1>Orçamentos</h1>
        <button className="btn-primario">+ Novo orçamento</button>
      </div>
      <OrcamentosTable />
    </Layout>
  )
}
