import { useState } from 'react'
import { Layout } from '../components/Layout/Layout'
import { MecanicosTable } from '../components/MecanicosTable/MecanicosTable'
import { MecanicoModal } from '../components/MecanicoModal/MecanicoModal'
import { ToastProvider, useToast } from '../components/Toast/Toast'
import type { Mecanico } from '../services/api'

type EstadoModal = { editando?: Mecanico } | null

function PaginaMecanicos() {
  const toast = useToast()
  const [modal, setModal] = useState<EstadoModal>(null)
  const [refresh, setRefresh] = useState(0)

  return (
    <Layout>
      <div className="page-header">
        <div className="page-header-titulo-grupo">
          <h1>Mecânicos</h1>
        </div>
        <button
          type="button"
          className="btn-primario"
          onClick={() => setModal({})}
        >
          Novo mecânico
        </button>
      </div>
      <MecanicosTable refresh={refresh} onEditar={(m) => setModal({ editando: m })} />
      {modal && (
        <MecanicoModal
          editando={modal.editando}
          onFechar={() => setModal(null)}
          onSalvo={(salvo) => {
            const eraEdicao = Boolean(modal.editando)
            setModal(null)
            setRefresh((r) => r + 1)
            toast.mostrar({
              tipo: 'sucesso',
              mensagem: `Mecânico "${salvo.nome}" ${eraEdicao ? 'atualizado' : 'cadastrado'}.`,
            })
          }}
        />
      )}
    </Layout>
  )
}

export default function Mecanicos() {
  return (
    <ToastProvider>
      <PaginaMecanicos />
    </ToastProvider>
  )
}
