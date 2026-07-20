import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button, Card, ErrorText, Input, Label } from '../components/ui'

export default function OnboardingCompany() {
  const { profile, refreshCompany, signOut } = useAuth()
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setError('')
    setSubmitting(true)
    try {
      const { error: insertError } = await supabase.from('company').insert({
        owner_id: profile.id,
        name,
        industry: industry || null,
        address: address || null,
        phone: phone || null,
      })
      if (insertError) throw insertError
      await refreshCompany()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat bisnis')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Buat data bisnis</h1>
        <p className="mb-6 text-sm text-slate-500">
          Lengkapi data bisnis kamu sebelum mulai memakai Archon Kasir.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nama bisnis</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Industri</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Kuliner, retail, dll" />
          </div>
          <div>
            <Label>Alamat</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <Label>Telepon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan & lanjutkan'}
          </Button>
        </form>
        <button onClick={signOut} className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-600">
          Keluar
        </button>
      </Card>
    </div>
  )
}
