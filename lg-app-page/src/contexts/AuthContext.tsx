import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { loginApi, logoutApi, meApi } from '../services/api'

type UsuarioAutenticado = { nome: string; email: string }

type AuthContextType = {
  usuario: UsuarioAutenticado | null
  carregando: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    meApi()
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false))
  }, [])

  async function login(email: string, senha: string) {
    const u = await loginApi(email, senha)
    setUsuario(u)
  }

  async function logout() {
    await logoutApi()
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
