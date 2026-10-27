import { useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Search, UserCheck, UserX } from 'lucide-react'
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
  const [trocandoId, setTrocandoId] = useState<number | null>(null)

  useEffect(() => {
    listarMecanicos(incluirInativos)
      .then((dados) => {
        setMecanicos(dados)
        setErro('')
      })
      .catch((e) => setErro(e.message))
  }, [incluirInativos, refresh])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  const linhas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return q ? mecanicos.filter((m) => m.nome.toLowerCase().includes(q)) : mecanicos
  }, [mecanicos, busca])

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

  async function salvarTelefone(m: Mecanico, telefone: string) {
    try {
      const novo = await atualizarMecanico(m.id, { telefone: telefone.trim() || null })
      setMecanicos((ls) => ls.map((l) => (l.id === novo.id ? novo : l)))
      setAviso('')
    } catch (e) {
      setAviso(`${m.nome}: ${e instanceof Error ? e.message : 'erro ao salvar'}`)
      throw e
    }
  }

  async function alternarAtivo(m: Mecanico) {
    setTrocandoId(m.id)
    try {
      const novo = await atualizarMecanico(m.id, { ativo: !m.ativo })
      setMecanicos((ls) =>
        incluirInativos
          ? ls.map((l) => (l.id === novo.id ? novo : l))
          : ls.filter((l) => l.id !== novo.id)
      )
      setAviso('')
    } catch (e) {
      setAviso(`${m.nome}: ${e instanceof Error ? e.message : 'erro ao alterar status'}`)
    } finally {
      setTrocandoId(null)
    }
  }

  return (
    <section className="tabela-container">
      <div className="tabela-filtros">
        <div className="tabela-busca-wrapper">
          <Search size={14} className="tabela-busca-icone" />
          <input
            type="text"
            className="tabela-input"
            placeholder="Buscar mecânico..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <label className="tabela-check">
          <input
            type="checkbox"
            checked={incluirInativos}
            onChange={(e) => setIncluirInativos(e.target.checked)}
          />
          <span>Mostrar inativos</span>
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
                <th>TELEFONE</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>AÇÕES</th>
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
                    <CelulaEditavel
                      tipo="texto"
                      rotulo={`Telefone de ${m.nome}`}
                      valor={m.telefone ?? ''}
                      onSalvar={(v) => salvarTelefone(m, v)}
                    />
                  </td>
                  <td>
                    <span className={`badge ${m.ativo ? 'badge-aprovado' : 'badge-aberto'}`}>
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2px' }}>
                      <button
                        type="button"
                        className="emp-acao-btn"
                        title="Editar mecânico"
                        aria-label={`Editar mecânico ${m.nome}`}
                        disabled={trocandoId !== null}
                        onClick={() => onEditar?.(m)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="emp-acao-btn"
                        title={m.ativo ? 'Desativar' : 'Reativar'}
                        aria-label={`${m.ativo ? 'Desativar' : 'Reativar'} mecânico ${m.nome}`}
                        disabled={trocandoId !== null}
                        onClick={() => alternarAtivo(m)}
                      >
                        {trocandoId === m.id ? (
                          <Loader2 size={15} className="orc-spin" />
                        ) : m.ativo ? (
                          <UserX size={15} />
                        ) : (
                          <UserCheck size={15} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {linhas.length === 0 && !erro && (
                <tr>
                  <td colSpan={4} className="tabela-vazio">
                    Nenhum mecânico encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="tabela-rodape">
          <span>{linhas.length} {linhas.length === 1 ? 'mecânico listado' : 'mecânicos listados'}</span>
        </div>
      </div>
    </section>
  )
}
