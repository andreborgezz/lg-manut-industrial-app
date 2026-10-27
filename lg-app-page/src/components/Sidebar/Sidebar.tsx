import { NavLink, useNavigate } from 'react-router-dom'
import { FileText, Building2, Wrench, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import './Sidebar.css'

const itens = [
  { to: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { to: '/empresas', label: 'Empresas', icon: Building2 },
  { to: '/mecanicos', label: 'Mecânicos', icon: Wrench },
]

export function Sidebar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  async function aoSair() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-topo">
        <div className="sidebar-logo-circulo">L.G.</div>
        <div className="sidebar-empresa">
          <span className="sidebar-nome">L.G. MANUTENÇÃO INDUSTRIAL</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {itens.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="sidebar-item">
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {usuario && (
        <div className="sidebar-rodape">
          <span className="sidebar-usuario">{usuario.nome}</span>
          <button className="sidebar-sair" onClick={aoSair} title="Sair">
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      )}
    </aside>
  )
}
