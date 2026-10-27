import { useNavigate, useLocation } from 'react-router-dom'
import { Login } from '../components/Login/Login'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const erroSessao = (location.state as { sessaoExpirada?: boolean } | null)?.sessaoExpirada ?? false
  const destino = (location.state as { de?: string } | null)?.de ?? '/'

  function aoLogar() {
    navigate(destino, { replace: true })
  }

  return <Login aoLogar={aoLogar} erroSessao={erroSessao} />
}
