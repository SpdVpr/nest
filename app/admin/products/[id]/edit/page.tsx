'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Upload, Loader2, X } from 'lucide-react'
import { Product } from '@/types/database.types'
import { PRODUCT_CATEGORIES } from '@/lib/product-categories'

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [product, setProduct] = useState<Product | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    purchase_price: '',
    category: '',
    is_available: true,
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [keepOldImage, setKeepOldImage] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
      fetchProduct()
    }
  }, [router, productId])

  const fetchProduct = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Product not found')

      const data = await response.json()
      setProduct(data.product)
      setFormData({
        name: data.product.name,
        price: data.product.price.toString(),
        purchase_price: data.product.purchase_price ? data.product.purchase_price.toString() : '',
        category: data.product.category || '',
        is_available: data.product.is_available,
      })
      setImagePreview(data.product.image_url || '')
    } catch (err) {
      setError('Produkt nenalezen')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Musíš vybrat obrázek')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Obrázek je příliš velký (max 5MB)')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setKeepOldImage(false)
    setError('')
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview('')
    setKeepOldImage(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const token = localStorage.getItem('admin_token')

      let imageUrl = keepOldImage ? product?.image_url : null

      // Upload new image if exists
      if (imageFile) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', imageFile)

        const uploadRes = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataUpload,
        })

        if (!uploadRes.ok) throw new Error('Failed to upload image')

        const uploadData = await uploadRes.json()
        imageUrl = uploadData.url
      }

      // Update product
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
          category: formData.category || null,
          image_url: imageUrl,
          is_available: formData.is_available,
        }),
      })

      if (!response.ok) throw new Error('Failed to update product')

      router.push('/admin/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Něco se pokazilo')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Produkt nenalezen</h1>
          <Link href="/admin/products" className="text-blue-600 hover:text-blue-700">
            Zpět na produkty
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            href="/admin/products"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Zpět na produkty
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Upravit produkt
          </h1>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Price immutability info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
          <span className="text-lg mt-0.5">🔒</span>
          <div>
            <p className="text-sm font-semibold text-blue-900">Změna ceny neovlivní minulé akce</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Ceny jsou automaticky uloženy v okamžiku nákupu. Pokud změníš cenu, projeví se to
              jen u nových nákupů. Všechny dosavadní záznamy spotřeby zůstanou s původní cenou.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Název produktu *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Prodejní cena (Kč) *
              </label>
              <input
                type="number"
                id="price"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label htmlFor="purchase_price" className="block text-sm font-medium text-gray-700 mb-2">
                Nákupní cena (Kč)
              </label>
              <input
                type="number"
                id="purchase_price"
                min="0"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Kategorie
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">-- Vyber kategorii --</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Obrázek produktu
            </label>

            {imagePreview ? (
              <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Klikni nebo přetáhni obrázek</span>
                <span className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP (max 5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Availability */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_available"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_available" className="ml-2 text-sm text-gray-700">
              Produkt je dostupný
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ukládám...
                </>
              ) : (
                'Uložit změny'
              )}
            </button>

            <Link
              href="/admin/products"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
            >
              Zrušit
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}