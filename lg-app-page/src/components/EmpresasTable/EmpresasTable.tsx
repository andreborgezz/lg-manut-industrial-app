import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Loader2, Pencil, Search } from "lucide-react";
import { atualizarEmpresa, listarEmpresas, type Empresa } from "../../services/api";
import { CelulaEditavel } from "../CelulaEditavel/CelulaEditavel";
import { TelefonesSelect } from "./TelefonesSelect";
import "./EmpresasTable.css";

type Acao = 'editar';

type Coluna = { titulo: string; render: (e: Empresa) => React.ReactNode };

function montarColunas(
  salvar: (e: Empresa, patch: { nome?: string; email?: string | null; cnpj?: string | null; telefone?: string | null }) => Promise<void>,
  abrir: (e: Empresa, acao: Acao) => void,
  carregando: { id: number; acao: Acao } | null,
  navegar: (id: number) => void,
): Coluna[] {
  return [
    { titulo: 'ID', render: (e) => <span className="tabular-nums">#{e.id}</span> },
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
      titulo: 'CONTATOS',
      render: (e) => (
        <TelefonesSelect 
          empresaId={e.id} 
        />
      )
    },
    {
      titulo: 'AÇÕES',
      render: (e) => {
        const girando = (acao: Acao) => carregando?.id === e.id && carregando.acao === acao
        const qualquerCarregando = carregando !== null
        return (
          <div className="emp-acoes">
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
              className="emp-acao-btn"
              title="Ver detalhes da empresa"
              aria-label={`Ver detalhes da empresa ${e.nome}`}
              onClick={() => navegar(e.id)}
            >
              <ExternalLink size={15} />
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
  const [linhas, setLinhas] = useState<Empresa[]>([])
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  async function salvar(e: Empresa, patch: { nome?: string; email?: string | null; cnpj?: string | null; telefone?: string | null }) {
    try {
      const nova = await atualizarEmpresa(e.id, patch)
      setLinhas((ls) => ls.map((l) => (l.id === nova.id ? nova : l)))
      setAviso('')
    } catch (err) {
      setAviso(`Empresa ${e.id}: ${err instanceof Error ? err.message : 'erro ao salvar'}`)
      throw err
    }
  }

  const [carregando, setCarregando] = useState<{ id: number; acao: Acao } | null>(null)
  
  async function abrir(e: Empresa, acao: Acao) {
    setCarregando({ id: e.id, acao })
    try {
      if (acao === 'editar') onEditar?.(e)
    } finally {
      setCarregando(null)
    }
  }

  const colunas = montarColunas(salvar, abrir, carregando, (id) => navigate(`/empresas/${id}`))

  useEffect(() => {
    listarEmpresas()
      .then((dados) => {
        const filtrados = busca 
          ? dados.filter(d => d.nome.toLowerCase().includes(busca.toLowerCase()))
          : dados
        setLinhas(filtrados)
        setErro('')
      })
      .catch((err) => setErro(err.message))
  }, [refresh, busca])

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
                  <th key={c.titulo}>{c.titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((e) => (
                <tr key={e.id}>
                  {colunas.map((c) => (
                    <td key={c.titulo}>{c.render(e)}</td>
                  ))}
                </tr>
              ))}
              {linhas.length === 0 && !erro && (
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
    </section>
  )
}
