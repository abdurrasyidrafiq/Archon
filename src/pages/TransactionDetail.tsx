import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateTime, formatRupiah } from '../lib/format'
import { Card, PageHeader, Spinner } from '../components/ui'
import type { ReceiptDetail, Transaction } from '../types/database'

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [details, setDetails] = useState<ReceiptDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      const [{ data: t }, { data: d }] = await Promise.all([
        supabase.from('transactions').select('*').eq('sales_id', id).maybeSingle(),
        supabase.from('receipt_details').select('*').eq('sales_id', id),
      ])
      setTransaction(t as Transaction | null)
      setDetails((d as ReceiptDetail[]) ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <Spinner />
  if (!transaction) return <p className="text-sm text-slate-500">Transaksi tidak ditemukan.</p>

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Struk transaksi"
        action={
          <Link to="/transaksi" className="text-sm text-brand-600 hover:underline">
            ← Kembali
          </Link>
        }
      />
      <Card className="p-5">
        <p className="text-sm text-slate-500">{formatDateTime(transaction.sale_date)}</p>
        <p className="mb-4 text-xs uppercase text-slate-400">{transaction.payment_method}</p>

        <ul className="divide-y divide-slate-100 border-y border-slate-100">
          {details.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {d.name} <span className="text-slate-400">x{d.quantity}</span>
              </span>
              <span>{formatRupiah(d.subtotal)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatRupiah(transaction.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Pajak</span>
            <span>{formatRupiah(transaction.tax)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatRupiah(transaction.total)}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
