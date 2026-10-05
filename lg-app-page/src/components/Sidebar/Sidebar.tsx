import { NavLink } from 'react-router-dom'
import { FileText, Building2, Wrench } from 'lucide-react'
import './Sidebar.css'

// itens do menu de navegação da sidebar
const itens = [
  { to: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { to: '/empresas', label: 'Empresas', icon: Building2 },
  { to: '/mecanicos', label: 'Mecânicos', icon: Wrench },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-topo">
        <div className="sidebar-logo-circulo">L.G.</div>
        <div className="sidebar-empresa">
          <span className="sidebar-nome">L.G. MANUTENÇÃO INDUSTRIAL</span>
          <span className="sidebar-cnpj">CNPJ 00.000.000/0001-00</span>
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
    </aside>
  )
}
