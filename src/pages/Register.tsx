import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button, Card, ErrorText, Input, Label, Select } from '../components/ui'
import type { UserRole } from '../types/database'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('owner')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { needsEmailConfirmation } = await signUp(email, password, username, role)
      if (needsEmailConfirmation) {
        setDone(true)
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mendaftar')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Card className="w-full max-w-sm p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-slate-900">Cek email kamu</h1>
          <p className="mb-4 text-sm text-slate-500">
            Kami sudah mengirim link konfirmasi ke {email}. Setelah konfirmasi, silakan masuk.
          </p>
          <Button className="w-full" onClick={() => navigate('/login')}>
            Ke halaman masuk
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Buat akun</h1>
        <p className="mb-6 text-sm text-slate-500">Daftar sebagai pemilik bisnis atau karyawan</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Daftar sebagai</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="owner">Owner (pemilik bisnis)</option>
              <option value="employee">Employee (karyawan/kasir)</option>
            </Select>
          </div>
          <div>
            <Label>Username</Label>
            <Input required value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Memproses...' : 'Daftar'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Masuk
          </Link>
        </p>
      </Card>
    </div>
  )
}
