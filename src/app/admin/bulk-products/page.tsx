'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { adminFetch } from '@/lib/admin-fetch'

export default function BulkProductsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setResult(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await adminFetch('/api/admin/products/bulk', { method: 'POST', body: form })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ success: 0, errors: ['Network error'] })
    } finally {
      setUploading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-2 max-w-2xl">
      <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2">Bulk Upload Products</h1>
      <p className="text-[#6B7280] text-sm mb-8">Upload a CSV or Excel file to add multiple products at once.</p>

      <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm mb-6">
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Required Columns</h3>
        <div className="text-xs text-[#6B7280] space-y-1 mb-4">
          <p><span className="font-bold text-[#1A1A1A]">name</span> — Product name (required)</p>
          <p><span className="font-bold text-[#1A1A1A]">price</span> — Product price (required)</p>
          <p><span className="font-bold text-[#1A1A1A]">category</span> — Category (required: t-shirts, hoodies, jackets, pants, sweatshirts)</p>
          <p><span className="font-bold text-[#1A1A1A]">stock</span> — Stock quantity</p>
          <p><span className="font-bold text-[#1A1A1A]">main_image</span> — Image URL</p>
          <p><span className="font-bold text-[#1A1A1A]">sizes</span> — Comma-separated (e.g. S,M,L,XL)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-8 text-center hover:border-[#8BA4B8] transition-colors cursor-pointer">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="file-input" />
            <label htmlFor="file-input" className="cursor-pointer">
              <div className="text-4xl mb-3">📂</div>
              <p className="text-sm font-medium text-[#1A1A1A] mb-1">{file ? file.name : 'Click to select file'}</p>
              <p className="text-xs text-[#9CA3AF]">CSV or Excel (.xlsx, .xls)</p>
            </label>
          </div>

          <button type="submit" disabled={!file || uploading}
            className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {uploading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Uploading...</> : 'Upload & Import'}
          </button>
        </form>
      </div>

      {result && (
        <div className={`rounded-2xl p-6 border ${result.errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className={`text-lg font-bold mb-2 ${result.errors.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {result.success} products imported successfully
          </p>
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold text-rose-600 mb-2">{result.errors.length} errors:</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-rose-500">{err}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
