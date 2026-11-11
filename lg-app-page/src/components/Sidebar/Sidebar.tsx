import { NavLink } from 'react-router-dom'
import { FileText, Building2, Wrench } from 'lucide-react'
import './Sidebar.css'

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-topo">
        <div className="sidebar-logo-badge">
          <Wrench size={14} className="sidebar-logo-icone" />
        </div>
        <div className="sidebar-marca">
          <span className="sidebar-titulo">L.G. MANUTENÇÃO</span>
          <span className="sidebar-subtitulo">GESTÃO INDUSTRIAL</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-secao">
          <span className="sidebar-secao-rotulo">Operação</span>
          <NavLink to="/orcamentos" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <FileText size={16} />
            <span>Orçamentos</span>
          </NavLink>
        </div>

        <div className="sidebar-secao">
          <span className="sidebar-secao-rotulo">Cadastros</span>
          <NavLink to="/empresas" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <Building2 size={16} />
            <span>Empresas</span>
          </NavLink>
          <NavLink to="/mecanicos" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <Wrench size={16} />
            <span>Mecânicos</span>
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-rodape">
        <div className="sidebar-rodape-card">
          <span className="sidebar-rodape-empresa">L.G. Manutenção</span>
          <span className="sidebar-rodape-cidade">Sorocaba • SP</span>
        </div>
      </div>
    </aside>
  )
}
