import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button, Card, Spinner } from './ui'
import OnboardingCompany from '../pages/OnboardingCompany'
import WaitingForCompany from '../pages/WaitingForCompany'

function ProfileProblem({ message }: { message: string }) {
  const { signOut, retryProfile } = useAuth()
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <h1 className="mb-2 text-lg font-semibold text-slate-900">Gagal memuat akun</h1>
        <p className="mb-6 text-sm text-slate-500">{message}</p>
        <div className="flex flex-col gap-2">
          <Button onClick={retryProfile}>Coba lagi</Button>
          <Button variant="secondary" onClick={signOut}>
            Keluar
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function ProtectedRoute() {
  const { session, profile, company, loading, authError } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />

  if (authError) return <ProfileProblem message={authError} />

  if (!profile) {
    return (
      <ProfileProblem message="Profil akun tidak ditemukan di database. Ini biasanya terjadi kalau akun dibuat sebelum schema database di-apply. Coba keluar lalu daftar ulang." />
    )
  }

  if (!company) {
    return profile.role === 'owner' ? <OnboardingCompany /> : <WaitingForCompany />
  }

  return <Outlet />
}

export function RequireOwner() {
  const { profile } = useAuth()
  if (profile?.role !== 'owner') return <Navigate to="/" replace />
  return <Outlet />
}
