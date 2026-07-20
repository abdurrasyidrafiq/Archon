import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatDateTime, formatRupiah } from '../lib/format'
import { Card, EmptyState, PageHeader, Spinner } from '../components/ui'
import type { Transaction } from '../types/database'

export default function Transactions() {
  const { company } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!company) return
      setLoading(true)
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', company.business_id)
        .order('sale_date', { ascending: false })
        .limit(100)
      setTransactions((data as Transaction[]) ?? [])
      setLoading(false)
    }
    load()
  }, [company?.business_id])

  return (
    <div>
      <PageHeader title="Transaksi" description="Riwayat penjualan." />

      {loading ? (
        <Spinner />
      ) : transactions.length === 0 ? (
        <EmptyState message="Belum ada transaksi." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Metode</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.sales_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/transaksi/${t.sales_id}`} className="text-brand-600 hover:underline">
                      {formatDateTime(t.sale_date)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 uppercase">{t.payment_method}</td>
                  <td className="px-4 py-3 font-medium">{formatRupiah(t.total)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.payment_status ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {t.payment_status ? 'Lunas' : 'Belum lunas'}
                    </span>
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
