import { NavLink } from 'react-router-dom'
import { FileText, Building2, Wrench, X } from 'lucide-react'
import './Sidebar.css'

type SidebarProps = {
  aberta?: boolean
  onFechar?: () => void
}

export function Sidebar({ aberta = true, onFechar }: SidebarProps) {
  return (
    <aside className={`sidebar ${aberta ? 'sidebar-aberta' : 'sidebar-colapsada'}`}>
      <div className="sidebar-topo">
        <div className="sidebar-marca-grupo">
          <div className="sidebar-logo-badge" aria-hidden="true">
            <span className="sidebar-logo-lg">L.G.</span>
          </div>
          <div className="sidebar-marca">
            <span className="sidebar-titulo">L.G. MANUTENÇÃO</span>
            <span className="sidebar-subtitulo">GESTÃO INDUSTRIAL</span>
          </div>
        </div>

        {/* Botão de fechar visível no mobile */}
        {onFechar && (
          <button 
            type="button" 
            className="sidebar-btn-fechar" 
            onClick={onFechar}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-secao">
          <span className="sidebar-secao-rotulo">Operação</span>
          <NavLink 
            to="/orcamentos" 
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            title="Orçamentos"
          >
            <FileText size={16} />
            <span className="sidebar-item-texto">Orçamentos</span>
          </NavLink>
        </div>

        <div className="sidebar-secao">
          <span className="sidebar-secao-rotulo">Cadastros</span>
          <NavLink 
            to="/empresas" 
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            title="Empresas"
          >
            <Building2 size={16} />
            <span className="sidebar-item-texto">Empresas</span>
          </NavLink>
          <NavLink 
            to="/mecanicos" 
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            title="Mecânicos"
          >
            <Wrench size={16} />
            <span className="sidebar-item-texto">Mecânicos</span>
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
