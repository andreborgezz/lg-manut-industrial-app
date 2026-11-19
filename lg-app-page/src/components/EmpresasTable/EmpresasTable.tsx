import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { atualizarEmpresa, excluirEmpresa, listarEmpresas, type Empresa } from "../../services/api";
import { CelulaEditavel } from "../CelulaEditavel/CelulaEditavel";
import { useToast } from "../Toast/Toast";
import { normalizarTexto } from "../../utils/texto";
import "./EmpresasTable.css";

type Acao = 'editar' | 'detalhe';

type Coluna = { titulo: string; classeColuna?: string; render: (e: Empresa) => React.ReactNode };

function montarColunas(
  salvar: (e: Empresa, patch: { nome?: string; email?: string | null; cnpj?: string | null; telefone?: string | null }) => Promise<void>,
  abrir: (e: Empresa, acao: Acao) => void,
  carregando: { id: number; acao: Acao } | null,
  solicitarExclusao: (e: Empresa) => void,
): Coluna[] {
  return [
    {
      titulo: 'NOME',
      render: (e) => (
        <CelulaEditavel
          tipo="texto"
          rotulo={`Nome da empresa ${e.id}`}
          valor={e.nome}
          onSalvar={(v) => salvar(e, { nome: v.trim() || e.nome })}
        />
      ),
    },
    {
      titulo: 'CNPJ',
      render: (e) => (
        <CelulaEditavel
          tipo="texto"
          rotulo={`CNPJ da empresa ${e.id}`}
          valor={e.cnpj ?? ''}
          onSalvar={(v) => salvar(e, { cnpj: v.trim() || null })}
        />
      ),
    },
    {
      titulo: 'E-MAIL',
      render: (e) => (
        <CelulaEditavel
          tipo="texto"
          rotulo={`E-mail da empresa ${e.id}`}
          valor={e.email ?? ''}
          onSalvar={(v) => salvar(e, { email: v.trim() || null })}
        />
      ),
    },
    {
      titulo: 'TELEFONE',
      render: (e) => (
        <CelulaEditavel
          tipo="texto"
          rotulo={`Telefone da empresa ${e.id}`}
          valor={e.telefone ?? ''}
          onSalvar={(v) => salvar(e, { telefone: v.trim() || null })}
        />
      ),
    },
    {
      titulo: 'CONTATO',
      render: (e) => {
        const contatos = e.contatos ?? []
        if (contatos.length === 0) return <span className="emp-contato-vazio">-</span>
        return (
          <div className="emp-contatos-celula">
            {contatos.map((c) => (
              <span key={c.id} className="emp-contato-tag" title={[c.telefone, c.email].filter(Boolean).join(' · ')}>
                <strong>{c.nome}</strong>
                {c.cargo && <span className="emp-contato-cargo"> · {c.cargo}</span>}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      titulo: 'AÇÕES',
      classeColuna: 'emp-col-fixa-acoes',
      render: (e) => {
        const girando = (acao: Acao) => carregando?.id === e.id && carregando.acao === acao
        const qualquerCarregando = carregando !== null
        return (
          <div className="emp-acoes">
            <button
              type="button"
              className="emp-acao-btn"
              title="Ver ficha da empresa"
              aria-label={`Ver ficha da empresa ${e.nome}`}
              disabled={qualquerCarregando}
              onClick={() => abrir(e, 'detalhe')}
            >
              {girando('detalhe') ? <Loader2 size={15} className="orc-spin" /> : <ExternalLink size={15} />}
            </button>
            <button
              type="button"
              className="emp-acao-btn"
              title="Editar empresa no modal"
              aria-label={`Editar empresa ${e.nome}`}
              disabled={qualquerCarregando}
              onClick={() => abrir(e, 'editar')}
            >
              {girando('editar') ? <Loader2 size={15} className="orc-spin" /> : <Pencil size={15} />}
            </button>
            <button
              type="button"
              className="emp-acao-btn emp-acao-excluir"
              title="Excluir empresa"
              aria-label={`Excluir empresa ${e.nome}`}
              disabled={qualquerCarregando}
              onClick={() => solicitarExclusao(e)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        )
      },
    },
  ]
}

export function EmpresasTable({ 
  refresh = 0,
  onEditar 
}: { 
  refresh?: number;
  onEditar?: (e: Empresa) => void;
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const [todasEmpresas, setTodasEmpresas] = useState<Empresa[]>([])
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [empresaParaExcluir, setEmpresaParaExcluir] = useState<Empresa | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  async function salvar(e: Empresa, patch: { nome?: string; email?: string | null; cnpj?: string | null; telefone?: string | null }) {
    try {
      const nova = await atualizarEmpresa(e.id, patch)
      setTodasEmpresas((ls) => ls.map((l) => (l.id === nova.id ? { ...nova, contatos: l.contatos } : l)))
      setAviso('')
    } catch (err) {
      setAviso(`Empresa ${e.id}: ${err instanceof Error ? err.message : 'erro ao salvar'}`)
      throw err
    }
  }

  async function confirmarExclusao() {
    if (!empresaParaExcluir) return
    const alvo = empresaParaExcluir
    setExcluindo(true)
    try {
      await excluirEmpresa(alvo.id)
      setTodasEmpresas((ls) => ls.filter((l) => l.id !== alvo.id))
      setEmpresaParaExcluir(null)
      toast.mostrar({ tipo: 'sucesso', mensagem: `Empresa "${alvo.nome}" excluída.` })
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'Erro ao excluir empresa')
      setEmpresaParaExcluir(null)
    } finally {
      setExcluindo(false)
    }
  }

  const [carregando, setCarregando] = useState<{ id: number; acao: Acao } | null>(null)
  
  async function abrir(e: Empresa, acao: Acao) {
    if (acao === 'detalhe') {
      navigate(`/empresas/${e.id}`)
      return
    }
    setCarregando({ id: e.id, acao })
    try {
      if (acao === 'editar') onEditar?.(e)
    } finally {
      setCarregando(null)
    }
  }

  const colunas = montarColunas(
    salvar,
    abrir,
    carregando,
    (e) => setEmpresaParaExcluir(e),
  )

  useEffect(() => {
    let cancelado = false
    setCarregandoDados(true)
    listarEmpresas()
      .then((dados) => {
        if (cancelado) return
        setTodasEmpresas(dados)
        setErro('')
      })
      .catch((err) => !cancelado && setErro(err.message))
      .finally(() => !cancelado && setCarregandoDados(false))
    return () => { cancelado = true }
  }, [refresh])

  const linhas = useMemo(() => {
    const q = normalizarTexto(busca.trim())
    if (!q) return todasEmpresas
    return todasEmpresas.filter((d) =>
      normalizarTexto(d.nome).includes(q) ||
      normalizarTexto(d.cnpj).includes(q) ||
      normalizarTexto(d.email).includes(q) ||
      normalizarTexto(d.telefone).includes(q) ||
      (d.contatos ?? []).some((c) =>
        normalizarTexto(c.nome).includes(q) || normalizarTexto(c.cargo).includes(q)
      ) ||
      String(d.id).includes(q)
    )
  }, [todasEmpresas, busca])

  return (
    <section className="emp-table-container">
      <div className="emp-table-filtros">
        <div className="emp-busca-wrapper">
          <Search size={14} className="emp-busca-icone" />
          <input
            type="text"
            className="emp-input"
            placeholder="Buscar empresa por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {erro && <p className="emp-table-erro">{erro}</p>}
      {aviso && (
        <div className="emp-table-aviso" role="alert">
          <span>{aviso}</span>
          <button type="button" onClick={() => setAviso('')} aria-label="Fechar aviso">×</button>
        </div>
      )}

      <div className="emp-table-card">
        <div className="emp-table-scroll">
          <table>
            <thead>
              <tr>
                {colunas.map((c) => (
                  <th key={c.titulo} className={c.classeColuna}>{c.titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((e) => (
                <tr key={e.id}>
                  {colunas.map((c) => (
                    <td key={c.titulo} className={c.classeColuna}>{c.render(e)}</td>
                  ))}
                </tr>
              ))}
              {carregandoDados && linhas.length === 0 ? (
                <tr>
                  <td colSpan={colunas.length}>
                    <div className="tabela-carregando">
                      <Loader2 size={20} className="spinner" />
                      <span>Carregando empresas...</span>
                    </div>
                  </td>
                </tr>
              ) : linhas.length === 0 && !erro && (
                <tr>
                  <td colSpan={colunas.length} className="emp-table-vazio">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="emp-table-rodape">
          <span>{linhas.length} {linhas.length === 1 ? 'empresa listada' : 'empresas listadas'}</span>
        </div>
      </div>

      {empresaParaExcluir && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !excluindo) setEmpresaParaExcluir(null)
          }}
        >
          <div className="emp-modal-excluir" role="dialog" aria-modal="true" aria-labelledby="emp-excluir-titulo">
            <h3 id="emp-excluir-titulo">Excluir empresa "{empresaParaExcluir.nome}"?</h3>
            <p>Os contatos vinculados também serão removidos.</p>
            <div className="emp-modal-excluir-acoes">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setEmpresaParaExcluir(null)}
                disabled={excluindo}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="emp-btn-confirmar-excluir"
                onClick={confirmarExclusao}
                disabled={excluindo}
              >
                {excluindo ? 'Excluindo...' : 'Excluir empresa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
