import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/format'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Spinner } from '../components/ui'
import type { InventoryItem } from '../types/database'

export default function Inventory() {
  const { company } = useAuth()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null)

  async function load() {
    if (!company) return
    setLoading(true)
    const { data } = await supabase
      .from('inventory')
      .select('*, expenses!inner(business_id)')
      .eq('expenses.business_id', company.business_id)
      .order('name')
    setItems((data as InventoryItem[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.business_id])

  return (
    <div>
      <PageHeader title="Inventori" description="Pantau stok bahan baku saat ini." />

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState message="Belum ada data inventori. Catat pembelian di halaman Pengeluaran." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nama bahan</th>
                <th className="px-4 py-3 font-medium">Stok saat ini</th>
                <th className="px-4 py-3 font-medium">Terakhir diperbarui</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.inventory_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className={item.current_stock <= 0 ? 'font-semibold text-red-600' : ''}>
                      {item.current_stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(item.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" onClick={() => setAdjusting(item)}>
                      Sesuaikan stok
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {adjusting && (
        <AdjustModal item={adjusting} onClose={() => setAdjusting(null)} onSaved={load} />
      )}
    </div>
  )
}

function AdjustModal({ item, onClose, onSaved }: { item: InventoryItem; onClose: () => void; onSaved: () => void }) {
  const [stock, setStock] = useState(String(item.current_stock))
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    await supabase.from('inventory').update({ current_stock: Number(stock) }).eq('inventory_id', item.inventory_id)
    setSubmitting(false)
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Sesuaikan stok — ${item.name}`}>
      <div className="space-y-4">
        <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </Modal>
  )
}
