import { useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, UserCheck, UserX } from 'lucide-react'
import { atualizarMecanico, listarMecanicos, type Mecanico } from '../../services/api'
import { CelulaEditavel } from '../CelulaEditavel/CelulaEditavel'
import '../Tabela/Tabela.css'

type Props = {
  refresh?: number
  onEditar?: (m: Mecanico) => void
}

export function MecanicosTable({ refresh = 0, onEditar }: Props) {
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])
  const [busca, setBusca] = useState('')
  const [incluirInativos, setIncluirInativos] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  // mecânico cujo ativo/inativo está sendo trocado
  const [trocandoId, setTrocandoId] = useState<number | null>(null)

  // recarrega ao mudar o filtro ou quando a página pede (refresh)
  useEffect(() => {
    listarMecanicos(incluirInativos)
      .then((dados) => {
        setMecanicos(dados)
        setErro('')
      })
      .catch((e) => setErro(e.message))
  }, [incluirInativos, refresh])

  // some sozinho depois de uns segundos
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  // busca por nome no front (a lista é pequena)
  const linhas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return q ? mecanicos.filter((m) => m.nome.toLowerCase().includes(q)) : mecanicos
  }, [mecanicos, busca])

  // envia o patch e troca a linha; em erro avisa e repassa pra célula voltar ao valor antigo
  async function salvarNome(m: Mecanico, nome: string) {
    if (!nome.trim()) {
      setAviso('O nome do mecânico não pode ficar vazio')
      throw new Error('nome vazio')
    }
    try {
      const novo = await atualizarMecanico(m.id, { nome: nome.trim() })
      setMecanicos((ls) => ls.map((l) => (l.id === novo.id ? novo : l)))
      setAviso('')
    } catch (e) {
      setAviso(`${m.nome}: ${e instanceof Error ? e.message : 'erro ao salvar'}`)
      throw e
    }
  }

  async function alternarAtivo(m: Mecanico) {
    if (m.ativo && !window.confirm(`Desativar ${m.nome}? Ele deixa de aparecer na escolha de mecânico dos orçamentos.`)) {
      return
    }
    setTrocandoId(m.id)
    try {
      const novo = await atualizarMecanico(m.id, { ativo: !m.ativo })
      // sem o filtro de inativos, quem foi desativado sai da lista
      setMecanicos((ls) =>
        ls.flatMap((l) => (l.id !== novo.id ? [l] : novo.ativo || incluirInativos ? [novo] : []))
      )
      setAviso('')
    } catch (e) {
      setAviso(`${m.nome}: ${e instanceof Error ? e.message : 'erro ao atualizar'}`)
    } finally {
      setTrocandoId(null)
    }
  }

  return (
    <section>
      <div className="tabela-filtros">
        <input
          type="text"
          className="tabela-input"
          placeholder="Buscar por nome..."
          aria-label="Buscar mecânico por nome"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <label className="tabela-check">
          <input
            type="checkbox"
            checked={incluirInativos}
            onChange={(e) => setIncluirInativos(e.target.checked)}
          />
          Mostrar inativos
        </label>
      </div>

      {erro && <p className="tabela-erro">{erro}</p>}
      {aviso && (
        <div className="tabela-aviso" role="alert">
          <span>{aviso}</span>
          <button type="button" onClick={() => setAviso('')} aria-label="Fechar aviso">×</button>
        </div>
      )}

      <div className="tabela-card">
        <div className="tabela-scroll">
          <table>
            <thead>
              <tr>
                <th>NOME</th>
                <th>STATUS</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((m) => (
                <tr key={m.id} className={m.ativo ? '' : 'tabela-inativa'}>
                  <td>
                    <CelulaEditavel
                      tipo="texto"
                      rotulo={`Nome do mecânico ${m.nome}`}
                      valor={m.nome}
                      onSalvar={(v) => salvarNome(m, v)}
                    />
                  </td>
                  <td>
                    <span className={`badge ${m.ativo ? 'badge-aprovado' : 'badge-aberto'}`}>
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="tabela-acoes">
                      <button
                        type="button"
                        className="tabela-acao-btn"
                        title="Editar"
                        aria-label={`Editar mecânico ${m.nome}`}
                        disabled={trocandoId !== null}
                        onClick={() => onEditar?.(m)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="tabela-acao-btn"
                        title={m.ativo ? 'Desativar' : 'Reativar'}
                        aria-label={`${m.ativo ? 'Desativar' : 'Reativar'} mecânico ${m.nome}`}
                        disabled={trocandoId !== null}
                        onClick={() => alternarAtivo(m)}
                      >
                        {trocandoId === m.id ? (
                          <Loader2 size={16} className="tabela-spin" />
                        ) : m.ativo ? (
                          <UserX size={16} />
                        ) : (
                          <UserCheck size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {linhas.length === 0 && !erro && (
                <tr>
                  <td colSpan={3} className="tabela-vazio">
                    Nenhum mecânico encontrado.
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
