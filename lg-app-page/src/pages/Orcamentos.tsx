import { useEffect, useRef, useState } from 'react'
import { Layout } from '../components/Layout/Layout'
import { OrcamentosTable } from '../components/OrcamentosTable/OrcamentosTable'
import {
  NovoOrcamentoModal,
  type InicialOrcamento,
} from '../components/NovoOrcamentoModal/NovoOrcamentoModal'
import { ToastProvider, useToast } from '../components/Toast/Toast'
import { gerarPdfOrcamento, type Orcamento } from '../services/api'

type EstadoModal = {
  inicial?: InicialOrcamento
  copiaDe?: number
  editando?: { id: number; numero: number }
} | null

const dadosIniciais = (o: Orcamento): InicialOrcamento => ({
  empresaId: o.empresaId,
  solicitanteId: o.solicitanteId,
  mecanicoId: o.mecanicoId,
  maquina: o.maquina,
  titulo: o.titulo,
  escopo: o.escopo,
  valor: o.valor,
  prazoDias: o.prazoDias,
  fimDeSemana: o.fimDeSemana,
})

function PaginaOrcamentos() {
  const toast = useToast()
  const [modal, setModal] = useState<EstadoModal>(null)
  const [refresh, setRefresh] = useState(0)
  const [novoId, setNovoId] = useState<number | null>(null)
  const btnNovoRef = useRef<HTMLButtonElement>(null)

  // atalho global N abre o modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const editavel = (e.target as HTMLElement).isContentEditable
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || editavel) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setModal({})
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function aoSalvar(orc: Orcamento, gerarPdf = false) {
    setModal(null)
    setRefresh((r) => r + 1)
    setNovoId(orc.id)
    setTimeout(() => setNovoId(null), 2500)

    if (gerarPdf) {
      // dispara PDF automaticamente e mostra toast
      gerarPdfToast(orc.id, orc.numero)
    } else {
      // toast normal com ação "Gerar PDF"
      toast.mostrar({
        tipo: 'sucesso',
        mensagem: `Orçamento nº ${orc.numero} criado.`,
        acaoLabel: 'Gerar PDF',
        onAcao: () => gerarPdfToast(orc.id, orc.numero),
      })
    }
  }

  async function gerarPdfToast(id: number, numero: number) {
    const toastId = toast.mostrar({ tipo: 'info', mensagem: 'Gerando PDF...', duracao: 30000 })
    try {
      const { url } = await gerarPdfOrcamento(id)
      toast.fechar(toastId)
      const janela = window.open(url, '_blank')
      if (!janela) {
        toast.mostrar({
          tipo: 'info',
          mensagem: `PDF do orçamento ${numero} gerado.`,
          acaoLabel: 'Abrir PDF',
          onAcao: () => window.open(url, '_blank'),
        })
      }
    } catch (e) {
      toast.fechar(toastId)
      toast.mostrar({
        tipo: 'erro',
        mensagem: 'Não foi possível gerar o PDF. Tente novamente.',
        acaoLabel: 'Tentar de novo',
        onAcao: () => gerarPdfToast(id, numero),
      })
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Orçamentos</h1>
        <button
          ref={btnNovoRef}
          className="btn-primario"
          onClick={() => setModal({})}
          title="Novo orçamento (N)"
          aria-keyshortcuts="n"
        >
          Novo orçamento
          <span className="btn-atalho" aria-hidden>N</span>
        </button>
      </div>
      <OrcamentosTable
        refresh={refresh}
        novoId={novoId}
        onDuplicar={(o, numero) => setModal({ copiaDe: numero, inicial: dadosIniciais(o) })}
        onEditar={(o, numero) => setModal({ editando: { id: o.id, numero }, inicial: dadosIniciais(o) })}
      />
      {modal && (
        <NovoOrcamentoModal
          inicial={modal.inicial}
          copiaDe={modal.copiaDe}
          editando={modal.editando}
          onFechar={() => { setModal(null); btnNovoRef.current?.focus() }}
          onSalvo={aoSalvar}
        />
      )}
    </Layout>
  )
}

export default function Orcamentos() {
  return (
    <ToastProvider>
      <PaginaOrcamentos />
    </ToastProvider>
  )
}
