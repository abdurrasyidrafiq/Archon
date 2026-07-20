import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../lib/format'
import { Button, Card, EmptyState, ErrorText, Input, Label, Modal, PageHeader, Spinner } from '../components/ui'
import type { Ingredient, InventoryItem, Product } from '../types/database'

export default function Products() {
  const { company } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [recipeFor, setRecipeFor] = useState<Product | null>(null)

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

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.business_id])

  async function handleDelete(product: Product) {
    if (!confirm(`Hapus produk "${product.name}"?`)) return
    await supabase.from('products').delete().eq('product_id', product.product_id)
    load()
  }

  return (
    <div>
      <PageHeader
        title="Produk"
        description="Kelola daftar produk dan resep bahan baku."
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            + Tambah produk
          </Button>
        }
      />

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <EmptyState message="Belum ada produk. Tambahkan produk pertama kamu." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Harga jual</th>
                <th className="px-4 py-3 font-medium">Biaya produksi</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.product_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3">{formatRupiah(p.sell_price)}</td>
                  <td className="px-4 py-3">{formatRupiah(p.production_cost)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setRecipeFor(p)}>
                        Resep
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditing(p)
                          setModalOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(p)}>
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        product={editing}
        businessId={company?.business_id ?? ''}
      />

      {recipeFor && (
        <RecipeModal product={recipeFor} onClose={() => setRecipeFor(null)} businessId={company?.business_id ?? ''} />
      )}
    </div>
  )
}

function ProductFormModal({
  open,
  onClose,
  onSaved,
  product,
  businessId,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  product: Product | null
  businessId: string
}) {
  const [name, setName] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [productionCost, setProductionCost] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(product?.name ?? '')
      setSellPrice(product ? String(product.sell_price) : '')
      setProductionCost(product ? String(product.production_cost) : '')
      setError('')
    }
  }, [open, product])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        name,
        sell_price: Number(sellPrice) || 0,
        production_cost: Number(productionCost) || 0,
      }
      if (product) {
        const { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('product_id', product.product_id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert({ ...payload, business_id: businessId })
        if (insertError) throw insertError
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan produk')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Edit produk' : 'Tambah produk'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nama produk</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Harga jual (Rp)</Label>
          <Input type="number" min={0} required value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
        </div>
        <div>
          <Label>Biaya produksi (Rp)</Label>
          <Input type="number" min={0} value={productionCost} onChange={(e) => setProductionCost(e.target.value)} />
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </form>
    </Modal>
  )
}

function RecipeModal({ product, onClose, businessId }: { product: Product; onClose: () => void; businessId: string }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedInventoryId, setSelectedInventoryId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const [{ data: ing }, { data: inv }] = await Promise.all([
      supabase.from('ingredients').select('*').eq('product_id', product.product_id),
      supabase
        .from('inventory')
        .select('*, expenses!inner(business_id)')
        .eq('expenses.business_id', businessId),
    ])
    setIngredients((ing as Ingredient[]) ?? [])
    setInventory((inv as InventoryItem[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.product_id])

  function inventoryName(id: string) {
    return inventory.find((i) => i.inventory_id === id)?.name ?? 'Item tidak ditemukan'
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!selectedInventoryId || !quantity) return
    const { error: insertError } = await supabase.from('ingredients').insert({
      product_id: product.product_id,
      inventory_id: selectedInventoryId,
      quantity: Number(quantity),
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setSelectedInventoryId('')
    setQuantity('')
    load()
  }

  async function handleRemove(inventoryId: string) {
    await supabase
      .from('ingredients')
      .delete()
      .eq('product_id', product.product_id)
      .eq('inventory_id', inventoryId)
    load()
  }

  return (
    <Modal open onClose={onClose} title={`Resep — ${product.name}`}>
      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {ingredients.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada bahan baku untuk produk ini.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {ingredients.map((ing) => (
                <li key={ing.inventory_id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    {inventoryName(ing.inventory_id)} — {ing.quantity}
                  </span>
                  <button onClick={() => handleRemove(ing.inventory_id)} className="text-red-500 hover:underline">
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          )}

          {inventory.length === 0 ? (
            <p className="text-sm text-slate-400">
              Belum ada item inventori. Tambahkan bahan baku lewat halaman Pengeluaran/Inventori dulu.
            </p>
          ) : (
            <form onSubmit={handleAdd} className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Bahan baku</Label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                >
                  <option value="">Pilih bahan</option>
                  {inventory.map((inv) => (
                    <option key={inv.inventory_id} value={inv.inventory_id}>
                      {inv.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <Label>Qty</Label>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <Button type="submit">Tambah</Button>
            </form>
          )}
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </Modal>
  )
}
