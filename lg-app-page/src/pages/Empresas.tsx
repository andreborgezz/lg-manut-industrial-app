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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Empresas</h1>
        <button
          className="btn-primario"
          onClick={() => {
            setEmpresaEditando(undefined)
            setModalAberto(true)
          }}
        >
          Nova Empresa
        </button>
      </header>
      
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
