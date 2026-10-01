import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Orcamentos from './pages/Orcamentos'
import Empresas from './pages/Empresas'
import Mecanicos from './pages/Mecanicos'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/orcamentos" replace />} />
        <Route path="/orcamentos" element={<Orcamentos />} />
        <Route path="/empresas" element={<Empresas />} />
        <Route path="/mecanicos" element={<Mecanicos />} />
      </Routes>
    </BrowserRouter>
  )
}