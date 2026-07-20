const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatRupiah(value: number): string {
  return rupiah.format(value || 0)
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Tunai' },
  { value: 'debit', label: 'Kartu Debit' },
  { value: 'credit', label: 'Kartu Kredit' },
  { value: 'qris', label: 'QRIS' },
] as const
