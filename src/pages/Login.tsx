import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button, Card, ErrorText, Input, Label } from '../components/ui'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Archon Kasir</h1>
        <p className="mb-6 text-sm text-slate-500">Masuk ke akun kamu</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Belum punya akun?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Daftar
          </Link>
        </p>
      </Card>
    </div>
  )
}
