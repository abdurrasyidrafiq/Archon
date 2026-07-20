import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatDateTime, formatRupiah } from '../lib/format'
import { Card, EmptyState, PageHeader, Spinner } from '../components/ui'
import type { InventoryItem, Transaction } from '../types/database'

const LOW_STOCK_THRESHOLD = 5

export default function Dashboard() {
  const { profile, company } = useAuth()
  const [loading, setLoading] = useState(true)
  const [todayTotal, setTodayTotal] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [recent, setRecent] = useState<Transaction[]>([])
  const [lowStock, setLowStock] = useState<InventoryItem[]>([])

  useEffect(() => {
    async function load() {
      if (!company) return
      setLoading(true)
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const [{ data: today }, { data: recentTx }, { data: inventory }] = await Promise.all([
        supabase
          .from('transactions')
          .select('total')
          .eq('business_id', company.business_id)
          .gte('sale_date', startOfDay.toISOString()),
        supabase
          .from('transactions')
          .select('*')
          .eq('business_id', company.business_id)
          .order('sale_date', { ascending: false })
          .limit(5),
        supabase
          .from('inventory')
          .select('*, expenses!inner(business_id)')
          .eq('expenses.business_id', company.business_id)
          .lte('current_stock', LOW_STOCK_THRESHOLD),
      ])

      setTodayTotal((today ?? []).reduce((sum, t) => sum + Number(t.total), 0))
      setTodayCount((today ?? []).length)
      setRecent((recentTx as Transaction[]) ?? [])
      setLowStock((inventory as InventoryItem[]) ?? [])
      setLoading(false)
    }
    load()
  }, [company?.business_id])

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title={`Halo, ${profile?.username}`} description={company?.name} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-slate-500">Penjualan hari ini</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatRupiah(todayTotal)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Jumlah transaksi hari ini</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{todayCount}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold text-slate-800">Transaksi terbaru</h2>
          {recent.length === 0 ? (
            <EmptyState message="Belum ada transaksi." />
          ) : (
            <Card className="divide-y divide-slate-100">
              {recent.map((t) => (
                <Link
                  key={t.sales_id}
                  to={`/transaksi/${t.sales_id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50"
                >
                  <span className="text-slate-500">{formatDateTime(t.sale_date)}</span>
                  <span className="font-medium text-slate-800">{formatRupiah(t.total)}</span>
                </Link>
              ))}
            </Card>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-semibold text-slate-800">Stok menipis</h2>
          {lowStock.length === 0 ? (
            <EmptyState message="Semua stok aman." />
          ) : (
            <Card className="divide-y divide-slate-100">
              {lowStock.map((item) => (
                <div key={item.inventory_id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="font-semibold text-red-600">{item.current_stock}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
