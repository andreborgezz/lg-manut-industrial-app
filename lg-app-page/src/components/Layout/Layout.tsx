import type { ReactNode } from 'react'
import { Sidebar } from '../Sidebar/Sidebar'
import './Layout.css'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-conteudo">{children}</main>
    </div>
  )
}
