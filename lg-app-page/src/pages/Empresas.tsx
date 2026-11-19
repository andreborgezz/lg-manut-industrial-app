import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { EmpresasTable } from '../components/EmpresasTable/EmpresasTable'
import { EmpresaModal } from '../components/EmpresaModal/EmpresaModal'
import { NovoOrcamentoModal } from '../components/NovoOrcamentoModal/NovoOrcamentoModal'
import { ToastProvider, useToast } from '../components/Toast/Toast'
import type { Empresa } from '../services/api'

function PaginaEmpresas() {
  const toast = useToast()
  const navigate = useNavigate()
  const [modalAberto, setModalAberto] = useState(false)
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | undefined>(undefined)
  const [orcamentoEmpresaId, setOrcamentoEmpresaId] = useState<number | null>(null)
  const [refresh, setRefresh] = useState(0)

  function aoSalvarEmpresa(salva?: Empresa) {
    const eraEdicao = Boolean(empresaEditando)
    setModalAberto(false)
    setRefresh((r) => r + 1)

    if (!eraEdicao && salva) {
      toast.mostrar({
        tipo: 'sucesso',
        mensagem: `Empresa "${salva.nome}" cadastrada.`,
        acaoLabel: 'Novo orçamento',
        duracao: 7000,
        onAcao: () => setOrcamentoEmpresaId(salva.id),
      })
    } else if (salva) {
      toast.mostrar({
        tipo: 'sucesso',
        mensagem: `Empresa "${salva.nome}" atualizada.`,
      })
    }
  }

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
          onContatoAlterado={() => setRefresh((r) => r + 1)}
          onSalvo={aoSalvarEmpresa}
        />
      )}

      {orcamentoEmpresaId !== null && (
        <NovoOrcamentoModal
          inicial={{ empresaId: orcamentoEmpresaId }}
          onFechar={() => setOrcamentoEmpresaId(null)}
          onSalvo={(orc) => {
            setOrcamentoEmpresaId(null)
            toast.mostrar({
              tipo: 'sucesso',
              mensagem: `Orçamento nº ${orc.numero} criado.`,
              acaoLabel: 'Ver orçamentos',
              onAcao: () => navigate('/orcamentos'),
            })
          }}
        />
      )}
    </Layout>
  )
}

export default function Empresas() {
  return (
    <ToastProvider>
      <PaginaEmpresas />
    </ToastProvider>
  )
}
