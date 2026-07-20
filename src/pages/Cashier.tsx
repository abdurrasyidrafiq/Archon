import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatRupiah, PAYMENT_METHODS } from '../lib/format'
import { Button, Card, EmptyState, ErrorText, Select, Spinner } from '../components/ui'
import type { Product } from '../types/database'

interface CartLine {
  product: Product
  quantity: number
}

export default function Cashier() {
  const { company } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartLine[]>([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [taxPercent, setTaxPercent] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      if (!company) return
      setLoading(true)
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', company.business_id)
        .order('name')
      setProducts((data as Product[]) ?? [])
      setLoading(false)
    }
    load()
  }, [company?.business_id])

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.product.sell_price * line.quantity, 0),
    [cart],
  )
  const tax = useMemo(() => Math.round((subtotal * taxPercent) / 100), [subtotal, taxPercent])
  const total = subtotal + tax

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.product_id === product.product_id)
      if (existing) {
        return prev.map((l) =>
          l.product.product_id === product.product_id ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.product.product_id !== productId))
      return
    }
    setCart((prev) => prev.map((l) => (l.product.product_id === productId ? { ...l, quantity } : l)))
  }

  async function handleCheckout() {
    if (!company || cart.length === 0) return
    setError('')
    setSubmitting(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('checkout_transaction', {
        p_business_id: company.business_id,
        p_payment_method: paymentMethod,
        p_tax: tax,
        p_items: cart.map((l) => ({ product_id: l.product.product_id, quantity: l.quantity })),
      })
      if (rpcError) throw rpcError
      setCart([])
      navigate(`/transaksi/${data.sales_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses transaksi')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">Kasir</h1>
        {products.length === 0 ? (
          <EmptyState message="Belum ada produk. Tambahkan produk dulu di halaman Produk." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.product_id}
                onClick={() => addToCart(product)}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-400 hover:shadow"
              >
                <p className="font-medium text-slate-800">{product.name}</p>
                <p className="mt-1 text-sm text-slate-500">{formatRupiah(product.sell_price)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <Card className="sticky top-4 p-4">
          <h2 className="mb-3 font-semibold text-slate-800">Keranjang</h2>
          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Belum ada item</p>
          ) : (
            <ul className="mb-4 space-y-3">
              {cart.map((line) => (
                <li key={line.product.product_id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{line.product.name}</p>
                    <p className="text-slate-500">{formatRupiah(line.product.sell_price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="h-7 w-7 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
                      onClick={() => updateQuantity(line.product.product_id, line.quantity - 1)}
                    >
                      -
                    </button>
                    <span className="w-6 text-center">{line.quantity}</span>
                    <button
                      className="h-7 w-7 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
                      onClick={() => updateQuantity(line.product.product_id, line.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t border-slate-200 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Pajak (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={taxPercent}
                onChange={(e) => setTaxPercent(Number(e.target.value))}
                className="w-16 rounded border border-slate-300 px-2 py-1 text-right"
              />
            </div>
            <div className="flex justify-between font-semibold text-slate-900">
              <span>Total</span>
              <span>{formatRupiah(total)}</span>
            </div>
          </div>

          <div className="mt-4">
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>

          <ErrorText>{error}</ErrorText>

          <Button
            className="mt-4 w-full"
            disabled={cart.length === 0 || submitting}
            onClick={handleCheckout}
          >
            {submitting ? 'Memproses...' : 'Bayar'}
          </Button>
        </Card>
      </div>
    </div>
  )
}
