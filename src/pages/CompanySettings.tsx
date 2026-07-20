import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button, Card, ErrorText, Input, Label, PageHeader } from '../components/ui'

export default function CompanySettings() {
  const { company, refreshCompany } = useAuth()
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (company) {
      setName(company.name)
      setIndustry(company.industry ?? '')
      setAddress(company.address ?? '')
      setPhone(company.phone ?? '')
    }
  }, [company])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!company) return
    setError('')
    setSuccess(false)
    setSubmitting(true)
    try {
      const { error: updateError } = await supabase
        .from('company')
        .update({ name, industry: industry || null, address: address || null, phone: phone || null })
        .eq('business_id', company.business_id)
      if (updateError) throw updateError
      await refreshCompany()
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="Pengaturan bisnis" />
      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nama bisnis</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Industri</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
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
          {success && <p className="text-sm text-green-600">Tersimpan.</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan perubahan'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
