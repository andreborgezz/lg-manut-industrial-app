import { NavLink } from 'react-router-dom'
import { FileText, Building2, Wrench } from 'lucide-react'
import './Sidebar.css'

const itens = [
  { to: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { to: '/empresas', label: 'Empresas', icon: Building2 },
  { to: '/mecanicos', label: 'Mecânicos', icon: Wrench },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">L.G. Manutenção</div>
      <nav>
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
