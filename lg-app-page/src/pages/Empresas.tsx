import { useState } from 'react'
import { Layout } from '../components/Layout/Layout'
import { EmpresasTable } from '../components/EmpresasTable/EmpresasTable'
import { EmpresaModal } from '../components/EmpresaModal/EmpresaModal'
import type { Empresa } from '../services/api'

export default function Empresas() {
  const [modalAberto, setModalAberto] = useState(false)
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | undefined>(undefined)
  const [refresh, setRefresh] = useState(0)

  return (
    <Layout>
      <div className="page-header">
        <div className="page-header-titulo-grupo">
          <h1>Empresas</h1>
        </div>
        <button
          type="button"
          className="btn-primario"
          onClick={() => {
            setEmpresaEditando(undefined)
            setModalAberto(true)
          }}
        >
          Nova empresa
        </button>
      </div>

      <EmpresasTable 
        refresh={refresh}
        onEditar={(empresa) => {
          setEmpresaEditando(empresa)
          setModalAberto(true)
        }}
      />

      {modalAberto && (
        <EmpresaModal
          editando={empresaEditando}
          onFechar={() => setModalAberto(false)}
          onSalvo={() => {
            setModalAberto(false)
            setRefresh(r => r + 1)
          }}
        />
      )}
    </Layout>
  )
}
