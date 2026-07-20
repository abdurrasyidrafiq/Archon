import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatDateTime, formatRupiah } from '../lib/format'
import { Button, Card, EmptyState, ErrorText, Input, Label, PageHeader, Select, Spinner } from '../components/ui'
import type { Expense, InventoryItem } from '../types/database'

type ExpenseRow = Expense & { inventory: { name: string } | null }

export default function Expenses() {
  const { company, profile } = useAuth()
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const [mode, setMode] = useState<'new' | 'restock'>('new')
  const [name, setName] = useState('')
  const [inventoryId, setInventoryId] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    if (!company) return
    setLoading(true)
    const [{ data: exp }, { data: inv }] = await Promise.all([
      supabase
        .from('expenses')
        .select('*, inventory(name)')
        .eq('business_id', company.business_id)
        .order('purchase_date', { ascending: false })
        .limit(50),
      supabase
        .from('inventory')
        .select('*, expenses!inner(business_id)')
        .eq('expenses.business_id', company.business_id)
        .order('name'),
    ])
    setExpenses((exp as unknown as ExpenseRow[]) ?? [])
    setInventory((inv as InventoryItem[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.business_id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!company || !profile) return
    setError('')
    setSubmitting(true)
    try {
      const amountNum = Number(amount)
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          business_id: company.business_id,
          user_id: profile.id,
          cost_price: Number(costPrice) || 0,
          amount: amountNum,
        })
        .select()
        .single()
      if (expenseError) throw expenseError

      if (mode === 'new') {
        const { error: invError } = await supabase.from('inventory').insert({
          expense_id: expense.expense_id,
          name,
          current_stock: amountNum,
        })
        if (invError) throw invError
      } else {
        const target = inventory.find((i) => i.inventory_id === inventoryId)
        if (!target) throw new Error('Pilih bahan yang mau di-restock')
        const { error: invError } = await supabase
          .from('inventory')
          .update({ expense_id: expense.expense_id, current_stock: target.current_stock + amountNum })
          .eq('inventory_id', inventoryId)
        if (invError) throw invError
      }

      setName('')
      setInventoryId('')
      setCostPrice('')
      setAmount('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengeluaran')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Pengeluaran" description="Catat pembelian bahan baku untuk menambah stok inventori." />

      <Card className="mb-6 p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} />
              Bahan baru
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === 'restock'} onChange={() => setMode('restock')} />
              Restock bahan lama
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {mode === 'new' ? (
              <div>
                <Label>Nama bahan baku</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            ) : (
              <div>
                <Label>Bahan baku</Label>
                <Select required value={inventoryId} onChange={(e) => setInventoryId(e.target.value)}>
                  <option value="">Pilih bahan</option>
                  {inventory.map((inv) => (
                    <option key={inv.inventory_id} value={inv.inventory_id}>
                      {inv.name} (stok: {inv.current_stock})
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Jumlah dibeli</Label>
              <Input type="number" min={1} required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Harga beli (Rp)</Label>
              <Input type="number" min={0} required value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </div>
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan pengeluaran'}
          </Button>
        </form>
      </Card>

      {loading ? (
        <Spinner />
      ) : expenses.length === 0 ? (
        <EmptyState message="Belum ada riwayat pengeluaran." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Bahan</th>
                <th className="px-4 py-3 font-medium">Jumlah</th>
                <th className="px-4 py-3 font-medium">Harga</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.expense_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{formatDateTime(exp.purchase_date)}</td>
                  <td className="px-4 py-3">{exp.inventory?.name ?? '-'}</td>
                  <td className="px-4 py-3">{exp.amount}</td>
                  <td className="px-4 py-3">{formatRupiah(exp.cost_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
