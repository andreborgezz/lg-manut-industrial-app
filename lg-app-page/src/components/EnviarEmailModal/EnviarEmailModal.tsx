import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Mail, Loader2, AlertCircle } from 'lucide-react'
import { enviarEmailOrcamento, type OrcamentoLinha } from '../../services/api'
import '../NovoOrcamentoModal/NovoOrcamentoModal.css'
import './EnviarEmailModal.css'

type Props = {
  orcamento: OrcamentoLinha
  onFechar: () => void
  onEnviado: (destinatario: string) => void
}

export function EnviarEmailModal({ orcamento, onFechar, onEnviado }: Props) {
  const emailInicial = orcamento.solicitanteEmail || orcamento.empresaEmail || 'borges01andre@gmail.com'
  const [destinatario, setDestinatario] = useState(emailInicial)
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
    emailRef.current?.select()
  }, [])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !enviando) onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar, enviando])

  async function submeter(ev: FormEvent) {
    ev.preventDefault()
    const emailLimpo = destinatario.trim()
    if (!emailLimpo || !emailLimpo.includes('@')) {
      setErro('Por favor, informe um endereço de e-mail válido.')
      return
    }

    setEnviando(true)
    setErro('')
    try {
      await enviarEmailOrcamento(orcamento.id, {
        destinatario: emailLimpo,
        mensagemPersonalizada: mensagemPersonalizada.trim() || undefined,
      })
      onEnviado(emailLimpo)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao enviar e-mail com o orçamento')
      setEnviando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !enviando) onFechar() }}>
      <div className="modal email-modal" role="dialog" aria-modal="true" aria-labelledby="email-modal-titulo">
        <header className="modal-header">
          <div className="email-modal-topo">
            <Mail size={20} className="email-modal-icone" />
            <h2 id="email-modal-titulo">Enviar Orçamento nº {orcamento.numero} por E-mail</h2>
          </div>
          <button type="button" className="modal-fechar" onClick={onFechar} disabled={enviando} aria-label="Fechar">
            ×
          </button>
        </header>

        <form onSubmit={submeter} className="modal-form">
          <div className="modal-corpo">
            <div className="email-detalhes-orcamento">
              <div className="email-detalhe-item">
                <span className="email-detalhe-rotulo">Empresa:</span>
                <strong>{orcamento.empresa}</strong>
              </div>
              {orcamento.solicitante && (
                <div className="email-detalhe-item">
                  <span className="email-detalhe-rotulo">Solicitante:</span>
                  <span>{orcamento.solicitante}</span>
                </div>
              )}
              {orcamento.maquina && (
                <div className="email-detalhe-item">
                  <span className="email-detalhe-rotulo">Máquina:</span>
                  <span>{orcamento.maquina}</span>
                </div>
              )}
            </div>

            <div className="modal-campo">
              <label htmlFor="email-destinatario">
                E-mail do destinatário <span className="modal-obrigatorio">*</span>
              </label>
              <input
                ref={emailRef}
                id="email-destinatario"
                type="email"
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                placeholder="exemplo@empresa.com.br"
                disabled={enviando}
                required
              />
              <span className="email-dica">
                O arquivo <strong>orcamento-{orcamento.numero}.pdf</strong> será gerado e enviado anexado.
              </span>
            </div>

            <div className="modal-campo">
              <label htmlFor="email-mensagem">Mensagem / Observação adicional (opcional)</label>
              <textarea
                id="email-mensagem"
                rows={3}
                value={mensagemPersonalizada}
                onChange={(e) => setMensagemPersonalizada(e.target.value)}
                placeholder="Ex: Segue conforme alinhado em nossa reunião. Validade de 10 dias."
                disabled={enviando}
              />
            </div>

            <div className="email-aviso-resend">
              <AlertCircle size={15} className="email-aviso-icone" />
              <span>
                <strong>Ambiente Resend:</strong> no modo de teste com <code>onboarding@resend.dev</code>,
                envios para <code>borges01andre@gmail.com</code> são entregues na hora. Para outros domínios de clientes,
                basta verificar seu domínio no painel da Resend.
              </span>
            </div>

            {erro && <div className="modal-erro-geral">{erro}</div>}
          </div>

          <footer className="modal-acoes">
            <button type="button" className="btn-secundario" onClick={onFechar} disabled={enviando}>
              Cancelar
            </button>
            <button type="submit" className="btn-primario" disabled={enviando}>
              {enviando ? (
                <>
                  <Loader2 size={16} className="orc-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Mail size={16} />
                  <span>Enviar E-mail com PDF</span>
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
