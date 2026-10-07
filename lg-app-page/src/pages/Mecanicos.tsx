import { useState } from 'react'
import { Layout } from '../components/Layout/Layout'
import { MecanicosTable } from '../components/MecanicosTable/MecanicosTable'
import { MecanicoModal } from '../components/MecanicoModal/MecanicoModal'
import type { Mecanico } from '../services/api'

// modal fechado = null; vazio = novo; com mecânico = edição
type EstadoModal = { editando?: Mecanico } | null

export default function Mecanicos() {
  const [modal, setModal] = useState<EstadoModal>(null)
  const [refresh, setRefresh] = useState(0)

  return (
    <Layout>
      <div className="page-header">
        <h1>Mecânicos</h1>
        <button className="btn-primario" onClick={() => setModal({})}>
          Novo mecânico
        </button>
      </div>
      <MecanicosTable refresh={refresh} onEditar={(m) => setModal({ editando: m })} />
      {modal && (
        <MecanicoModal
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
