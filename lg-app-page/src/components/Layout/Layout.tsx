import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HelpCircle, LogOut, X } from 'lucide-react'
import { Sidebar } from '../Sidebar/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import './Layout.css'

function obterBreadcrumb(pathname: string): string {
  if (pathname.startsWith('/orcamentos')) return 'Orçamentos'
  if (pathname.startsWith('/empresas')) return 'Empresas'
  if (pathname.startsWith('/mecanicos')) return 'Mecânicos'
  return 'Painel'
}

function ModalAtalhos({ onFechar }: { onFechar: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onFechar])

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar()
      }}
    >
      <div className="modal-atalhos" role="dialog" aria-modal="true" aria-labelledby="atalhos-titulo">
        <header className="modal-header">
          <h2 id="atalhos-titulo">Atalhos de teclado</h2>
          <button type="button" className="modal-fechar" onClick={onFechar} aria-label="Fechar">
            <X size={16} />
          </button>
        </header>
        <div className="atalhos-lista">
          <div className="atalho-item"><kbd>N</kbd><span>Novo orçamento</span></div>
          <div className="atalho-item"><kbd>?</kbd><span>Abrir este painel de atalhos</span></div>
          <div className="atalho-item"><kbd>Esc</kbd><span>Fechar modal ou aviso</span></div>
          <div className="atalho-item"><kbd>Ctrl</kbd>+<kbd>Enter</kbd><span>Salvar no modal</span></div>
          <div className="atalho-item"><kbd>Enter</kbd><span>Avançar para próximo campo</span></div>
        </div>
      </div>
    </div>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mostrarAtalhos, setMostrarAtalhos] = useState(false)

  const breadcrumb = obterBreadcrumb(location.pathname)

  // Tecla '?' abre os atalhos
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === '?') {
        e.preventDefault()
        setMostrarAtalhos((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function aoSair() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-corpo">
        <header className="topbar">
          <div className="topbar-esquerda">
            <span className="topbar-breadcrumb">{breadcrumb}</span>
          </div>
          <div className="topbar-direita">
            <button
              type="button"
              className="topbar-btn-ajuda"
              onClick={() => setMostrarAtalhos(true)}
              title="Atalhos de teclado (?)"
              aria-label="Atalhos de teclado"
            >
              <HelpCircle size={16} />
            </button>
            <div className="topbar-divisor" />
            {usuario && (
              <div className="topbar-usuario-info">
                <span className="topbar-usuario-nome">{usuario.nome}</span>
                <button
                  type="button"
                  className="topbar-btn-sair"
                  onClick={aoSair}
                  title="Sair do sistema"
                  aria-label="Sair do sistema"
                >
                  <LogOut size={14} />
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="layout-conteudo">{children}</main>
      </div>

      {mostrarAtalhos && <ModalAtalhos onFechar={() => setMostrarAtalhos(false)} />}
    </div>
  )
}
