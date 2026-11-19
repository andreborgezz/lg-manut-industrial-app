import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Mail, Pencil, Phone, Users } from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { EmpresaModal } from '../components/EmpresaModal/EmpresaModal'
import { NovoOrcamentoModal, type InicialOrcamento } from '../components/NovoOrcamentoModal/NovoOrcamentoModal'
import { ToastProvider, useToast } from '../components/Toast/Toast'
import { buscarEmpresaDetalhe, gerarPdfOrcamento, type EmpresaDetalhe, type Orcamento } from '../services/api'
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
}

function PaginaEmpresaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [detalhe, setDetalhe] = useState<EmpresaDetalhe | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalEditarAberto, setModalEditarAberto] = useState(false)

  function recarregar() {
    if (!id) return
    buscarEmpresaDetalhe(Number(id))
      .then((d) => { setDetalhe(d); setCarregando(false) })
      .catch((e) => { setErro(e.message); setCarregando(false) })
  }

  useEffect(() => {
    recarregar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function aoSalvar(orc: Orcamento, gerarPdf = false) {
    setModalAberto(false)
    recarregar()
    if (gerarPdf) {
      const toastId = toast.mostrar({ tipo: 'info', mensagem: 'Gerando PDF...', duracao: 30000 })
      try {
        const { url } = await gerarPdfOrcamento(orc.id)
        toast.fechar(toastId)
        toast.mostrar({
          tipo: 'sucesso',
          mensagem: `PDF do orçamento nº ${orc.numero} gerado.`,
          acaoLabel: 'Visualizar PDF',
          duracao: 10000,
          onAcao: () => window.open(url, '_blank'),
        })
      } catch {
        toast.fechar(toastId)
        toast.mostrar({ tipo: 'erro', mensagem: 'Não foi possível gerar o PDF.' })
      }
    } else {
      toast.mostrar({ tipo: 'sucesso', mensagem: `Orçamento nº ${orc.numero} criado.` })
    }
  }

  const inicialModal: InicialOrcamento | undefined = detalhe
    ? { empresaId: detalhe.empresa.id }
    : undefined

  if (carregando) return <Layout><p className="emp-detalhe-carregando">Carregando ficha da empresa...</p></Layout>
  if (erro || !detalhe) return <Layout><p className="emp-detalhe-erro">{erro || 'Empresa não encontrada.'}</p></Layout>

  const { empresa, contatos = [], orcamentos, totalAcumulado } = detalhe

  return (
    <Layout>
      <div className="emp-detalhe-header">
        <div className="emp-detalhe-esq">
          <button type="button" className="btn-secundario emp-detalhe-voltar" onClick={() => navigate('/empresas')}>
            <ArrowLeft size={15} />
            <span>Voltar</span>
          </button>
          <div className="emp-detalhe-titulo">
            <h1>{empresa.nome}</h1>
          </div>
        </div>
        <div className="emp-detalhe-acoes">
          <button type="button" className="btn-secundario" onClick={() => setModalEditarAberto(true)}>
            <Pencil size={14} />
            <span>Editar ficha</span>
          </button>
          <button type="button" className="btn-primario" onClick={() => setModalAberto(true)}>
            Novo orçamento
          </button>
        </div>
      </div>

      {/* Ficha cadastral cinza da empresa */}
      <section className="emp-ficha-card">
        <div className="emp-card-topo">
          <span className="emp-card-topo-titulo">
            <Building2 size={14} />
            <span>Ficha da Empresa</span>
          </span>
        </div>
        <div className="emp-ficha-grade">
          <div className="emp-ficha-campo">
            <span className="emp-ficha-rotulo">CNPJ</span>
            <span className="emp-ficha-valor tabular-nums">{empresa.cnpj || '-'}</span>
          </div>
          <div className="emp-ficha-campo">
            <span className="emp-ficha-rotulo">Telefone</span>
            <span className="emp-ficha-valor tabular-nums">{empresa.telefone || '-'}</span>
          </div>
          <div className="emp-ficha-campo">
            <span className="emp-ficha-rotulo">E-mail</span>
            <span className="emp-ficha-valor">
              {empresa.email ? <a href={`mailto:${empresa.email}`}>{empresa.email}</a> : '-'}
            </span>
          </div>
        </div>
      </section>

      <div className="emp-detalhe-grade">
        {/* Coluna esquerda: Contatos */}
        <div className="emp-detalhe-lateral">
          <section className="emp-detalhe-card">
            <div className="emp-card-topo">
              <span className="emp-card-topo-titulo">
                <Users size={14} />
                <span>Contatos ({contatos.length})</span>
              </span>
            </div>
            {contatos.length === 0 ? (
              <p className="emp-detalhe-vazio">Nenhum contato cadastrado.</p>
            ) : (
              <ul className="emp-sol-lista">
                {contatos.map((c) => (
                  <li key={c.id} className="emp-sol-item">
                    <div className="emp-sol-cabecalho">
                      <span className="emp-sol-nome">{c.nome}</span>
                      {c.cargo && <span className="emp-sol-cargo">{c.cargo}</span>}
                    </div>
                    {(c.telefone || c.email) && (
                      <div className="emp-sol-contato">
                        {c.telefone && (
                          <span className="emp-sol-dado">
                            <Phone size={12} />
                            <span className="tabular-nums">{c.telefone}</span>
                          </span>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="emp-sol-dado">
                            <Mail size={12} />
                            <span>{c.email}</span>
                          </a>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Coluna direita: Últimos orçamentos */}
        <section className="emp-detalhe-card emp-detalhe-card-orc">
          <div className="emp-card-topo emp-orc-cabecalho">
            <span className="emp-card-topo-titulo">
              <span>Últimos orçamentos</span>
            </span>
            <span className="emp-orc-total">
              Total acumulado: <strong className="tabular-nums">{moeda(totalAcumulado)}</strong>
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
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orcamentos.map((o) => (
                    <tr key={o.id}>
                      <td className="tabular-nums emp-orc-num">#{o.numero}</td>
                      <td className="emp-orc-titulo">{o.titulo ?? '-'}</td>
                      <td className="tabular-nums">{dataBR(o.entradaEm)}</td>
                      <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>{moeda(o.valor)}</td>
                      <td style={{ textAlign: 'center' }}>
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

      {modalEditarAberto && (
        <EmpresaModal
          editando={{ ...empresa, contatos }}
          onFechar={() => setModalEditarAberto(false)}
          onSalvo={() => {
            setModalEditarAberto(false)
            recarregar()
            toast.mostrar({ tipo: 'sucesso', mensagem: 'Ficha da empresa atualizada.' })
          }}
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
