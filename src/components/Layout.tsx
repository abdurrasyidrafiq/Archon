import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ownerLinks = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/kasir', label: 'Kasir' },
  { to: '/produk', label: 'Produk' },
  { to: '/inventori', label: 'Inventori' },
  { to: '/pengeluaran', label: 'Pengeluaran' },
  { to: '/transaksi', label: 'Transaksi' },
  { to: '/karyawan', label: 'Karyawan' },
  { to: '/pengaturan', label: 'Pengaturan' },
]

const employeeLinks = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/kasir', label: 'Kasir' },
  { to: '/transaksi', label: 'Transaksi' },
]

export default function Layout() {
  const { profile, company, signOut } = useAuth()
  const links = profile?.role === 'owner' ? ownerLinks : employeeLinks

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 sm:flex">
        <div className="mb-6 px-2">
          <p className="text-lg font-semibold text-slate-900">Archon Kasir</p>
          <p className="truncate text-xs text-slate-500">{company?.name}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-3">
          <p className="truncate px-2 text-xs text-slate-500">{profile?.username}</p>
          <button
            onClick={signOut}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
          <p className="font-semibold text-slate-900">Archon Kasir</p>
          <button onClick={signOut} className="text-sm text-slate-500">
            Keluar
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
