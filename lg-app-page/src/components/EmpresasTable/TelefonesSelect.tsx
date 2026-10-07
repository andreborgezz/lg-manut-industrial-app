import { useEffect, useState } from "react";
import { listarCttEmpresas, type CttEmpresa } from "../../services/api";

export function TelefonesSelect({ empresaId }: { empresaId: number }) {
  const [contatos, setContatos] = useState<CttEmpresa[]>([])
  const [erro, setErro] = useState(false)

  useEffect(() => {
    listarCttEmpresas(empresaId)
      .then(setContatos)
      .catch(() => setErro(true))
  }, [empresaId])

  if (erro) return <span style={{ color: 'var(--cor-status-recusado-texto)' }}>Erro</span>
  if (contatos.length === 0) return <span style={{ color: 'var(--cor-texto-suave)' }}>-</span>

  // se só tiver 1, mostra o número direto
  if (contatos.length === 1 && contatos[0].telefone) {
    return <span>{contatos[0].telefone} ({contatos[0].nome})</span>
  }

  return (
    <select className="emp-select" defaultValue="">
      <option value="" disabled>Ver telefones ({contatos.length})</option>
      {contatos.map(c => (
        <option key={c.id} value={c.id}>
          {c.telefone || 'S/N'} - {c.nome}
        </option>
      ))}
    </select>
  )
}

