import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { type ReactNode, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { registrarRedirecionamentoLogin } from './services/api'
import Orcamentos from './pages/Orcamentos'
import Empresas from './pages/Empresas'
import EmpresaDetalhe from './pages/EmpresaDetalhe'
import Mecanicos from './pages/Mecanicos'
import LoginPage from './pages/loginPage'

function RedireciomanetoLogin() {
  const navigate = useNavigate()
  useEffect(() => {
    registrarRedirecionamentoLogin(() => {
      navigate('/login', { state: { sessaoExpirada: true }, replace: true })
    })
  }, [navigate])
  return null
}

function Protegida({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth()
  const location = useLocation()

  if (carregando) return null

  if (!usuario) {
    return <Navigate to="/login" state={{ de: location.pathname }} replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RedireciomanetoLogin />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Protegida><Navigate to="/orcamentos" replace /></Protegida>} />
          <Route path="/orcamentos" element={<Protegida><Orcamentos /></Protegida>} />
          <Route path="/empresas" element={<Protegida><Empresas /></Protegida>} />
          <Route path="/empresas/:id" element={<Protegida><EmpresaDetalhe /></Protegida>} />
          <Route path="/mecanicos" element={<Protegida><Mecanicos /></Protegida>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
