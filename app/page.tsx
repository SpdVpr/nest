'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

export default function HomePage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password.trim()) {
      setError('Zadej heslo eventu')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Neplatné heslo')
        setLoading(false)
        return
      }

      // Redirect to the event page
      router.push(`/event/${data.slug}`)
    } catch (err) {
      setError('Chyba připojení. Zkus to znovu.')
      setLoading(false)
    }
  }

  const siteUrl = 'https://nest-rust.vercel.app/'

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--nest-bg)' }}>
      <div className="w-full max-w-md flex flex-col items-center gap-10">

        {/* Title */}
        <div className="text-center">
          <h1
            className="text-5xl md:text-7xl font-bold tracking-tight"
            style={{ color: 'var(--nest-text-primary)' }}
          >
            The Nest
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--nest-text-tertiary)' }}>
            LAN Party Hub
          </p>
        </div>

        {/* Password Form */}
        <div
          className="w-full rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--nest-surface)',
            border: '1px solid var(--nest-border)',
          }}
        >
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--nest-text-primary)' }}>
            🔑 Přístup k eventu
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--nest-text-tertiary)' }}>
            Zadej heslo, které jsi dostal od organizátora
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Heslo eventu..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-base font-medium transition-all"
                style={{
                  backgroundColor: 'var(--nest-bg)',
                  border: `2px solid ${error ? 'var(--nest-error)' : 'var(--nest-border)'}`,
                  color: 'var(--nest-text-primary)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  if (!error) e.currentTarget.style.borderColor = 'var(--nest-yellow)'
                }}
                onBlur={(e) => {
                  if (!error) e.currentTarget.style.borderColor = 'var(--nest-border)'
                }}
              />
              {error && (
                <p className="mt-2 text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--nest-error)' }}>
                  <span>⚠️</span> {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-base transition-all"
              style={{
                backgroundColor: loading ? 'var(--nest-border)' : 'var(--nest-yellow)',
                color: 'var(--nest-bg)',
                cursor: loading ? 'wait' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = 'var(--nest-yellow-light)'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = 'var(--nest-yellow)'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="nest-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Ověřuji...
                </span>
              ) : (
                'Vstoupit →'
              )}
            </button>
          </form>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="p-4 rounded-2xl"
            style={{
              backgroundColor: '#ffffff',
            }}
          >
            <QRCodeSVG
              value={siteUrl}
              size={160}
              bgColor="#ffffff"
              fgColor="#222831"
              level="M"
            />
          </div>
          <p className="text-xs text-center" style={{ color: 'var(--nest-text-tertiary)' }}>
            Naskenuj QR kód pro rychlý přístup
          </p>
        </div>

      </div>
    </div>
  )
}
