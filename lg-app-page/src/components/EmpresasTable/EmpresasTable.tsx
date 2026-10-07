import { useEffect, useState } from "react";
import { Copy, Loader2, Pencil } from "lucide-react";
import { atualizarEmpresa, listarEmpresas, type Empresa } from "../../services/api";
import { CelulaEditavel } from "../CelulaEditavel/CelulaEditavel";
import { TelefonesSelect } from "./TelefonesSelect";
import "./EmpresasTable.css";

type Acao = 'editar';

type Coluna = { titulo: string; render: (e: Empresa) => React.ReactNode };

function montarColunas(
  salvar: (e: Empresa, patch: { nome?: string; email?: string | null; cnpj?: string | null }) => Promise<void>,
  abrir: (e: Empresa, acao: Acao) => void,
  carregando: { id: number; acao: Acao } | null
): Coluna[] {
  return [
    { titulo: 'ID', render: (e) => String(e.id) },
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
    { titulo: 'TELEFONES', render: (e) => <TelefonesSelect empresaId={e.id} /> },
    {
      titulo: 'AÇÕES',
      render: (e) => {
        const girando = (acao: Acao) => carregando?.id === e.id && carregando.acao === acao
        return (
          <div className="emp-acoes">
            <button
              type="button"
              className="emp-acao-btn"
              title="Editar"
              aria-label={`Editar empresa ${e.nome}`}
              disabled={carregando !== null}
              onClick={() => abrir(e, 'editar')}
            >
              {girando('editar') ? <Loader2 size={16} className="emp-spin" /> : <Pencil size={16} />}
            </button>
            {e.email && (
              <button
                type="button"
                className="emp-acao-btn"
                title="Copiar E-mail"
                aria-label={`Copiar e-mail de ${e.nome}`}
                disabled={carregando !== null}
                onClick={() => navigator.clipboard.writeText(e.email!)}
              >
                <Copy size={16} />
              </button>
            )}
          </div>
        )
      },
    },
  ]
}

export function EmpresasTable({
  refresh = 0,
  onEditar,
}: {
  refresh?: number
  onEditar?: (original: Empresa) => void
}) {
  const [linhas, setLinhas] = useState<Empresa[]>([])
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  // some sozinho depois de uns segundos
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  // envia o patch e atualiza a linha
  async function salvar(e: Empresa, patch: { nome?: string; email?: string | null; cnpj?: string | null }) {
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
  
  // simula um carregamento se precisar, mas a empresa já tem os dados
  async function abrir(e: Empresa, acao: Acao) {
    setCarregando({ id: e.id, acao })
    try {
      if (acao === 'editar') onEditar?.(e)
    } finally {
      setCarregando(null)
    }
  }

  const colunas = montarColunas(salvar, abrir, carregando)

  useEffect(() => {
    listarEmpresas()
      .then((dados) => {
        // filtro de busca simplificado no frontend, ou poderia ser backend
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
        <input
          type="text"
          className="emp-input"
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
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
      </div>
    </section>
  )
}