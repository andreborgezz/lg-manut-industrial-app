import { useState, type FormEvent } from 'react'
import { Wrench, Shield, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import './Login.css'

type Props = {
  aoLogar: () => void
  erroSessao?: boolean
}

export function Login({ aoLogar, erroSessao }: Props) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(erroSessao ? 'Sua sessão expirou. Faça login novamente.' : null)
  const [carregando, setCarregando] = useState(false)

  async function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      await login(email, senha)
      aoLogar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Credenciais inválidas. Verifique seu e-mail e senha.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-viewport">
      <div className="login-card-container">
        {/* Topo institucional com brasão industrial */}
        <header className="login-header">
          <div className="login-marca-insignia">
            <div className="login-icone-anel">
              <Wrench size={22} className="login-icone-ferramenta" />
            </div>
            <div className="login-titulos">
              <span className="login-sigla">L.G. MANUTENÇÃO</span>
              <span className="login-subsigla">SISTEMA INDUSTRIAL</span>
            </div>
          </div>
          <p className="login-boas-vindas">
            Acesse o painel de orçamentos e controle operacional
          </p>
        </header>

        {/* Formulário de autenticação direto */}
        <form className="login-formulario" onSubmit={aoSubmeter} noValidate>
          <div className="login-campo-grupo">
            <label htmlFor="login-email" className="login-rotulo">
              E-mail de acesso
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={carregando}
              autoFocus
              className="login-entrada"
            />
          </div>

          <div className="login-campo-grupo">
            <div className="login-rotulo-linha">
              <label htmlFor="login-senha" className="login-rotulo">
                Senha
              </label>
            </div>
            <div className="login-senha-container">
              <input
                id="login-senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={carregando}
                className="login-entrada login-entrada-senha"
              />
              <button
                type="button"
                className="login-botao-mostrar-senha"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {erro && (
            <div className="login-alerta-erro" role="alert">
              <span>{erro}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-botao-submeter"
            disabled={carregando || !email.trim() || !senha.trim()}
          >
            {carregando ? (
              <>
                <Loader2 size={16} className="login-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Rodapé institucional com aviso de segurança */}
        <footer className="login-footer">
          <div className="login-seguranca">
            <Shield size={13} className="login-seguranca-icone" />
            <span>Ambiente seguro e autenticado • Sorocaba - SP</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
