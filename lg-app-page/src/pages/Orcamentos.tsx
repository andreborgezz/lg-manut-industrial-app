import { useState } from 'react'
import { Layout } from '../components/Layout/Layout'
import { OrcamentosTable } from '../components/OrcamentosTable/OrcamentosTable'
import {
  NovoOrcamentoModal,
  type InicialOrcamento,
} from '../components/NovoOrcamentoModal/NovoOrcamentoModal'
import type { Orcamento } from '../services/api'

// modal fechado = null; cópia traz o número do original, edição traz id e número
type EstadoModal = {
  inicial?: InicialOrcamento
  copiaDe?: number
  editando?: { id: number; numero: number }
} | null

// só os campos do formulário: sem número, pedido, mecânico, datas, status nem pdf
const dadosIniciais = (o: Orcamento): InicialOrcamento => ({
  empresaId: o.empresaId,
  solicitanteId: o.solicitanteId,
  maquina: o.maquina,
  titulo: o.titulo,
  escopo: o.escopo,
  valor: o.valor,
  prazoDias: o.prazoDias,
  fimDeSemana: o.fimDeSemana,
})

export default function Orcamentos() {
  const [modal, setModal] = useState<EstadoModal>(null)
  const [refresh, setRefresh] = useState(0)

  return (
    <Layout>
      <div className="page-header">
        <h1>Orçamentos</h1>
        <button className="btn-primario" onClick={() => setModal({})}>
          Novo orçamento
        </button>
      </div>
      <OrcamentosTable
        refresh={refresh}
        onDuplicar={(o, numero) => setModal({ copiaDe: numero, inicial: dadosIniciais(o) })}
        onEditar={(o, numero) => setModal({ editando: { id: o.id, numero }, inicial: dadosIniciais(o) })}
      />
      {modal && (
        <NovoOrcamentoModal
          inicial={modal.inicial}
          copiaDe={modal.copiaDe}
          editando={modal.editando}
          onFechar={() => setModal(null)}
          onSalvo={() => {
            setModal(null)
            setRefresh((r) => r + 1)
          }}
        />
      )}
    </Layout>
  )
}
