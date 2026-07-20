import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button, Card, EmptyState, ErrorText, Input, Label, PageHeader, Spinner } from '../components/ui'
import type { AppUser, CompanyWorker } from '../types/database'

type WorkerRow = CompanyWorker & { employee: AppUser | null }

export default function Employees() {
  const { company } = useAuth()
  const [workers, setWorkers] = useState<WorkerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    if (!company) return
    setLoading(true)
    const { data } = await supabase
      .from('company_worker')
      .select('*, employee:users!company_worker_employee_id_fkey(*)')
      .eq('work_at', company.business_id)
    setWorkers((data as unknown as WorkerRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.business_id])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!company) return
    setError('')
    setSubmitting(true)
    try {
      const { data: found, error: findError } = await supabase.rpc('find_user_by_email', { p_email: email })
      if (findError) throw findError
      if (!found || found.length === 0) {
        throw new Error('User dengan email tersebut tidak ditemukan atau bukan akun Employee')
      }
      const { error: insertError } = await supabase.from('company_worker').insert({
        employee_id: found[0].id,
        work_at: company.business_id,
      })
      if (insertError) throw insertError
      setEmail('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan karyawan')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(worker: WorkerRow) {
    if (!confirm(`Keluarkan ${worker.employee?.username ?? 'karyawan ini'} dari bisnis?`)) return
    await supabase.from('company_worker').delete().eq('worker_id', worker.worker_id)
    load()
  }

  return (
    <div>
      <PageHeader title="Karyawan" description="Kelola karyawan yang bisa mengakses kasir." />

      <Card className="mb-6 p-5">
        <form onSubmit={handleAdd} className="flex items-end gap-2">
          <div className="flex-1">
            <Label>Email karyawan (harus sudah punya akun Employee)</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Menambahkan...' : 'Tambah'}
          </Button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>

      {loading ? (
        <Spinner />
      ) : workers.length === 0 ? (
        <EmptyState message="Belum ada karyawan." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.worker_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{w.employee?.username ?? '-'}</td>
                  <td className="px-4 py-3">{w.employee?.email ?? '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="danger" onClick={() => handleRemove(w)}>
                      Keluarkan
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
