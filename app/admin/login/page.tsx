'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Shield, UserPlus, Mail, User, ArrowLeft } from 'lucide-react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase/client'

type Mode = 'login' | 'register' | 'admin_password'

export default function AdminLoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleFirebaseLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const auth = getFirebaseAuth()
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const token = await credential.user.getIdToken()

      // Check if user exists in admin_users
      const res = await fetch('/api/admin/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        if (!data.user.approved) {
          setError('Tvůj účet čeká na schválení adminem.')
          await auth.signOut()
          return
        }
        localStorage.setItem('admin_token', token)
        router.push('/admin/dashboard')
      } else if (res.status === 404) {
        setError('Účet není registrován v admin systému. Zaregistruj se nejdříve.')
        await auth.signOut()
      } else {
        setError('Přihlášení selhalo.')
        await auth.signOut()
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Nesprávný email nebo heslo.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Příliš mnoho pokusů. Zkus to později.')
      } else {
        setError(err.message || 'Přihlášení selhalo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!name.trim()) {
      setError('Zadej své jméno.')
      setLoading(false)
      return
    }

    try {
      const auth = getFirebaseAuth()
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      const token = await credential.user.getIdToken()

      // Register in admin_users
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (res.ok) {
        setSuccess('Registrace proběhla úspěšně! Tvůj účet musí být nejdříve schválen adminem.')
        await auth.signOut()
        setMode('login')
        setEmail('')
        setPassword('')
        setName('')
      } else {
        const data = await res.json()
        setError(data.error || 'Registrace selhala.')
        await auth.signOut()
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Tento email je již registrován.')
      } else if (err.code === 'auth/weak-password') {
        setError('Heslo musí mít alespoň 6 znaků.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Neplatný email.')
      } else {
        setError(err.message || 'Registrace selhala.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAdminPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      })

      if (!response.ok) {
        throw new Error('Nesprávné heslo')
      }

      const { token } = await response.json()
      localStorage.setItem('admin_token', token)
      router.push('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Přihlášení selhalo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--nest-bg, #0f1117)' }}>
      <div className="max-w-md w-full">
        <div className="rounded-2xl shadow-2xl p-8" style={{ backgroundColor: 'var(--nest-surface, #1a1d27)', border: '1px solid var(--nest-border, #2a2d37)' }}>
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <Shield className="w-12 h-12" style={{ color: 'var(--nest-yellow, #f59e0b)' }} />
            </div>
          </div>

          {/* Login with email */}
          {mode === 'login' && (
            <>
              <h1 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--nest-text-primary, #fff)' }}>
                Admin přihlášení
              </h1>
              <p className="text-center mb-8" style={{ color: 'var(--nest-text-secondary, #888)' }}>
                Přihlas se svým účtem
              </p>

              <form onSubmit={handleFirebaseLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nest-text-tertiary, #555)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)', '--tw-ring-color': 'var(--nest-yellow)' } as any}
                      placeholder="email@example.com"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Heslo</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nest-text-tertiary)' }} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                      placeholder="••••••••"
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                    {error}
                  </div>
                )}

                {success && (
                  <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e' }}>
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--nest-yellow)', color: 'var(--nest-bg)' }}
                >
                  {loading ? 'Přihlašuji...' : 'Přihlásit se'}
                </button>
              </form>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => { setMode('register'); setError(''); setSuccess('') }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--nest-border)', color: 'var(--nest-text-secondary)' }}
                >
                  <UserPlus className="w-4 h-4" />
                  Registrace brigádníka
                </button>

                <div className="text-center">
                  <button
                    onClick={() => { setMode('admin_password'); setError(''); setSuccess('') }}
                    className="text-xs transition-colors hover:underline"
                    style={{ color: 'var(--nest-text-tertiary)' }}
                  >
                    Přihlásit master heslem
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Registration */}
          {mode === 'register' && (
            <>
              <h1 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--nest-text-primary)' }}>
                Registrace
              </h1>
              <p className="text-center mb-8" style={{ color: 'var(--nest-text-secondary)' }}>
                Vytvoř si účet brigádníka
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Jméno</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nest-text-tertiary)' }} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                      placeholder="Tvoje jméno"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nest-text-tertiary)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                      placeholder="email@example.com"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Heslo</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nest-text-tertiary)' }} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                      placeholder="Min. 6 znaků"
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                    {error}
                  </div>
                )}

                {success && (
                  <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e' }}>
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || !password || !name}
                  className="w-full font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--nest-yellow)', color: 'var(--nest-bg)' }}
                >
                  {loading ? 'Registruji...' : 'Zaregistrovat se'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                  className="flex items-center justify-center gap-2 text-sm mx-auto transition-colors hover:underline"
                  style={{ color: 'var(--nest-text-secondary)' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Zpět na přihlášení
                </button>
              </div>
            </>
          )}

          {/* Legacy admin password login */}
          {mode === 'admin_password' && (
            <>
              <h1 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--nest-text-primary)' }}>
                Admin heslo
              </h1>
              <p className="text-center mb-8" style={{ color: 'var(--nest-text-secondary)' }}>
                Přihlášení master heslem
              </p>

              <form onSubmit={handleAdminPasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Heslo</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nest-text-tertiary)' }} />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                      placeholder="••••••••"
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !adminPassword}
                  className="w-full font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--nest-yellow)', color: 'var(--nest-bg)' }}
                >
                  {loading ? 'Přihlašuji...' : 'Přihlásit se'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                  className="flex items-center justify-center gap-2 text-sm mx-auto transition-colors hover:underline"
                  style={{ color: 'var(--nest-text-secondary)' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Zpět na přihlášení
                </button>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm hover:underline"
              style={{ color: 'var(--nest-text-tertiary)' }}
            >
              ← Zpět na hlavní stránku
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}