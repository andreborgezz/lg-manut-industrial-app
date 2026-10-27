import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { NovoOrcamentoModal, type InicialOrcamento } from '../components/NovoOrcamentoModal/NovoOrcamentoModal'
import { ToastProvider, useToast } from '../components/Toast/Toast'
import { buscarEmpresaDetalhe, type EmpresaDetalhe, type Orcamento } from '../services/api'
import './EmpresaDetalhe.css'

function dataBR(d: string | null) {
  if (!d) return '-'
  const [a, m, dia] = d.split('-')
  return `${dia}/${m}/${a}`
}

function moeda(v: string | null) {
  if (v == null) return '-'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const BADGE: Record<string, string> = {
  ABERTO: 'badge-aberto',
  APROVADO: 'badge-aprovado',
  RECUSADO: 'badge-recusado',
  ENTREGUE: 'badge-entregue',
}

function PaginaEmpresaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [detalhe, setDetalhe] = useState<EmpresaDetalhe | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)

  useEffect(() => {
    if (!id) return
    buscarEmpresaDetalhe(Number(id))
      .then((d) => { setDetalhe(d); setCarregando(false) })
      .catch((e) => { setErro(e.message); setCarregando(false) })
  }, [id])

  function aoSalvar(orc: Orcamento) {
    setModalAberto(false)
    toast.mostrar({ tipo: 'sucesso', mensagem: `Orçamento nº ${orc.numero} criado.` })
    // recarrega detalhe para atualizar a lista
    if (id) {
      buscarEmpresaDetalhe(Number(id))
        .then(setDetalhe)
        .catch(() => {/* silencia */})
    }
  }

  const inicialModal: InicialOrcamento | undefined = detalhe
    ? { empresaId: detalhe.empresa.id }
    : undefined

  if (carregando) return <Layout><p className="emp-detalhe-carregando">Carregando...</p></Layout>
  if (erro || !detalhe) return <Layout><p className="emp-detalhe-erro">{erro || 'Empresa não encontrada.'}</p></Layout>

  const { empresa, solicitantes, orcamentos, totalAcumulado } = detalhe

  return (
    <Layout>
      <div className="emp-detalhe-header">
        <button type="button" className="emp-detalhe-voltar" onClick={() => navigate('/empresas')}>
          ← Voltar
        </button>
        <div className="emp-detalhe-titulo">
          <h1>{empresa.nome}</h1>
          {empresa.cnpj && <span className="emp-detalhe-cnpj">{empresa.cnpj}</span>}
        </div>
        <button type="button" className="btn-primario" onClick={() => setModalAberto(true)}>
          Novo orçamento
        </button>
      </div>

      <div className="emp-detalhe-info">
        {empresa.email && <span>{empresa.email}</span>}
        {empresa.telefone && <span>{empresa.telefone}</span>}
      </div>

      <div className="emp-detalhe-grade">
        {/* solicitantes */}
        <section className="emp-detalhe-card">
          <h2>Solicitantes</h2>
          {solicitantes.length === 0 ? (
            <p className="emp-detalhe-vazio">Nenhum solicitante cadastrado.</p>
          ) : (
            <ul className="emp-sol-lista">
              {solicitantes.map((s) => (
                <li key={s.id} className="emp-sol-item">
                  <span className="emp-sol-nome">{s.nome}</span>
                  <span className="emp-sol-contato">
                    {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
                    {s.telefone && <span>{s.telefone}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* últimos 10 orçamentos */}
        <section className="emp-detalhe-card emp-detalhe-card-orc">
          <div className="emp-orc-cabecalho">
            <h2>Últimos orçamentos</h2>
            <span className="emp-orc-total">
              Total acumulado: <strong>{moeda(totalAcumulado)}</strong>
            </span>
          </div>
          {orcamentos.length === 0 ? (
            <p className="emp-detalhe-vazio">Nenhum orçamento registrado.</p>
          ) : (
            <div className="emp-orc-scroll">
              <table className="emp-orc-tabela">
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Título</th>
                    <th>Entrada</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orcamentos.map((o) => (
                    <tr key={o.id}>
                      <td>{o.numero}</td>
                      <td className="emp-orc-titulo">{o.titulo ?? '-'}</td>
                      <td>{dataBR(o.entradaEm)}</td>
                      <td>{moeda(o.valor)}</td>
                      <td>
                        <span className={`badge ${BADGE[o.status] ?? ''}`}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {modalAberto && (
        <NovoOrcamentoModal
          inicial={inicialModal}
          onFechar={() => setModalAberto(false)}
          onSalvo={aoSalvar}
        />
      )}
    </Layout>
  )
}

export default function EmpresaDetalhe() {
  return (
    <ToastProvider>
      <PaginaEmpresaDetalhe />
    </ToastProvider>
  )
}
