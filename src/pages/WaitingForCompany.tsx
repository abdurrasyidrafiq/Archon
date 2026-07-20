import { useAuth } from '../contexts/AuthContext'
import { Button, Card } from '../components/ui'

export default function WaitingForCompany() {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <h1 className="mb-2 text-lg font-semibold text-slate-900">Menunggu ditambahkan ke bisnis</h1>
        <p className="mb-1 text-sm text-slate-500">
          Akun kamu belum terdaftar di bisnis manapun. Minta pemilik bisnis menambahkan kamu
          sebagai karyawan menggunakan email berikut:
        </p>
        <p className="mb-6 rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">
          {profile?.email}
        </p>
        <Button variant="secondary" className="w-full" onClick={() => window.location.reload()}>
          Cek lagi
        </Button>
        <button onClick={signOut} className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-600">
          Keluar
        </button>
      </Card>
    </div>
  )
}
