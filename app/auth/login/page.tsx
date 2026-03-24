'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Mail, User, ArrowLeft, LogIn, Loader2 } from 'lucide-react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase/client'

type Mode = 'login' | 'register' | 'forgot_password'

export default function AuthLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nest-bg, #0f1117)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--nest-yellow)' }} />
      </div>
    }>
      <AuthLoginContent />
    </Suspense>
  )
}

function AuthLoginContent() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const registerUserProfile = async (token: string, displayName: string, provider: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ display_name: displayName, auth_provider: provider }),
    })
    return res.ok
  }

  // Decide where to go after login: claim page (if no guests) or redirect (if already has guests)
  const resolvePostLoginRedirect = async (token: string, isNewUser: boolean): Promise<string> => {
    if (isNewUser) {
      // New registration — always show claim page
      return `/auth/claim?redirect=${encodeURIComponent(redirect)}`
    }

    // Existing user — check if they already have claimed guests
    try {
      const meRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (meRes.ok) {
        const data = await meRes.json()
        if (data.guests && data.guests.length > 0) {
          // Already has claimed guests — skip claim, go to redirect
          return redirect
        }
      }
    } catch { }

    // No claimed guests — show claim page
    return `/auth/claim?redirect=${encodeURIComponent(redirect)}`
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const auth = getFirebaseAuth()
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const token = await credential.user.getIdToken()

      // Check if user profile exists, if not create it
      const meRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      let isNewUser = false
      if (meRes.status === 404) {
        await registerUserProfile(token, credential.user.displayName || email.split('@')[0], 'email')
        isNewUser = true
      }

      const destination = await resolvePostLoginRedirect(token, isNewUser)
      router.push(destination)
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

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!name.trim()) {
      setError('Zadej své jméno.')
      setLoading(false)
      return
    }

    try {
      const auth = getFirebaseAuth()
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      const token = await credential.user.getIdToken()

      await registerUserProfile(token, name.trim(), 'email')
      const destination = await resolvePostLoginRedirect(token, true)
      router.push(destination)
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Tento email je již registrován. Zkus se přihlásit.')
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

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const auth = getFirebaseAuth()
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const token = await result.user.getIdToken()

      // Create or get user profile
      await registerUserProfile(
        token,
        result.user.displayName || result.user.email?.split('@')[0] || 'User',
        'google'
      )
      const destination = await resolvePostLoginRedirect(token, false)
      router.push(destination)
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup, not an error
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup byl zablokován. Povol vyskakovací okna v prohlížeči.')
      } else {
        setError(err.message || 'Přihlášení přes Google selhalo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const auth = getFirebaseAuth()
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')
      const result = await signInWithPopup(auth, provider)
      const token = await result.user.getIdToken()

      await registerUserProfile(
        token,
        result.user.displayName || result.user.email?.split('@')[0] || 'User',
        'apple'
      )
      const destination = await resolvePostLoginRedirect(token, false)
      router.push(destination)
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup
      } else {
        setError(err.message || 'Přihlášení přes Apple selhalo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const auth = getFirebaseAuth()
      await sendPasswordResetEmail(auth, resetEmail)
      setSuccess('Email pro obnovení hesla byl odeslán!')
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('Účet s tímto emailem neexistuje.')
      } else {
        setError('Odeslání selhalo. Zkus to znovu.')
      }
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
              <LogIn className="w-12 h-12" style={{ color: 'var(--nest-yellow, #f59e0b)' }} />
            </div>
          </div>

          {/* Login */}
          {mode === 'login' && (
            <>
              <h1 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--nest-text-primary, #fff)' }}>
                Přihlášení
              </h1>
              <p className="text-center mb-8" style={{ color: 'var(--nest-text-secondary, #888)' }}>
                Přihlas se ke svému účtu
              </p>

              {/* Social logins */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#fff', color: '#1f2937' }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Pokračovat přes Google
                </button>

                <button
                  onClick={handleAppleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#000', color: '#fff', border: '1px solid #333' }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Pokračovat přes Apple
                </button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full" style={{ borderTop: '1px solid var(--nest-border)' }} />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4" style={{ backgroundColor: 'var(--nest-surface)', color: 'var(--nest-text-tertiary)' }}>nebo emailem</span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nest-text-tertiary, #555)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                      placeholder="Email"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nest-text-tertiary)' }} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                      placeholder="Heslo"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot_password'); setError(''); setResetEmail(email) }}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--nest-text-tertiary)' }}
                  >
                    Zapomenuté heslo?
                  </button>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                    {error}
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

              <div className="mt-6 text-center">
                <button
                  onClick={() => { setMode('register'); setError(''); setSuccess('') }}
                  className="text-sm hover:underline"
                  style={{ color: 'var(--nest-text-secondary)' }}
                >
                  Nemáš účet? <span style={{ color: 'var(--nest-yellow)' }}>Zaregistruj se</span>
                </button>
              </div>
            </>
          )}

          {/* Register */}
          {mode === 'register' && (
            <>
              <h1 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--nest-text-primary)' }}>
                Registrace
              </h1>
              <p className="text-center mb-8" style={{ color: 'var(--nest-text-secondary)' }}>
                Vytvoř si účet
              </p>

              {/* Social logins */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#fff', color: '#1f2937' }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Registrace přes Google
                </button>

                <button
                  onClick={handleAppleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#000', color: '#fff', border: '1px solid #333' }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Registrace přes Apple
                </button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full" style={{ borderTop: '1px solid var(--nest-border)' }} />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4" style={{ backgroundColor: 'var(--nest-surface)', color: 'var(--nest-text-tertiary)' }}>nebo emailem</span>
                </div>
              </div>

              <form onSubmit={handleEmailRegister} className="space-y-4">
                <div>
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
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nest-text-tertiary)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                      placeholder="Email"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
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
                      placeholder="Heslo (min. 6 znaků)"
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
                  className="flex items-center justify-center gap-2 text-sm mx-auto hover:underline"
                  style={{ color: 'var(--nest-text-secondary)' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Zpět na přihlášení
                </button>
              </div>
            </>
          )}

          {/* Forgot password */}
          {mode === 'forgot_password' && (
            <>
              <h1 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--nest-text-primary)' }}>
                Obnovení hesla
              </h1>
              <p className="text-center mb-8" style={{ color: 'var(--nest-text-secondary)' }}>
                Pošleme ti odkaz pro obnovení
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nest-text-tertiary)' }} />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                    style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                    placeholder="Email"
                    disabled={loading}
                  />
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
                  disabled={loading || !resetEmail}
                  className="w-full font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--nest-yellow)', color: 'var(--nest-bg)' }}
                >
                  {loading ? 'Odesílám...' : 'Odeslat odkaz'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                  className="flex items-center justify-center gap-2 text-sm mx-auto hover:underline"
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
