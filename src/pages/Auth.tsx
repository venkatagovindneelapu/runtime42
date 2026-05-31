import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { authClient } from '../lib/neonAuth'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export default function Auth() {
  const { isAuthenticated, isLoading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isLoading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        })
        if (result.error) {
          setError(result.error.message ?? 'Sign up failed')
          setLoading(false)
          return
        }

        const signInResult = await authClient.signIn.email({
          email,
          password,
        })
        if (signInResult.error) {
          setError(signInResult.error.message ?? 'Account created, but sign in failed')
          setLoading(false)
          return
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        })
        if (result.error) {
          setError('No account exists with this email. Create a new account.')
          setLoading(false)
          return
        }
      }

      // Get the token and sync user to our DB
      const sessionResult = await authClient.getSession()
      const token = sessionResult?.data?.session?.token ??
                    sessionResult?.data?.session?.access_token ??
                    null

      if (token) {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_URL}/api/auth/sync`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                name: name || email.split('@')[0],
                avatarUrl: null,
                githubUsername: null,
              }),
            }
          )
          if (!res.ok) {
            console.warn('Sync failed with status:', res.status)
          }
        } catch (syncErr) {
          console.warn('Sync failed:', syncErr)
        }
      }

      await refreshUser()
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img
            src="/src/assets/runtime42-logo.png"
            alt="Runtime42"
            className="mx-auto h-14 w-auto animate-pulse"
          />
          <p className="text-muted-foreground text-sm">
            {isSignUp ? 'Creating your account...' : 'Signing you in...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        
        <div className="text-center space-y-2">
          <img
            src="/src/assets/runtime42-logo.png"
            alt="Runtime42"
            className="mx-auto h-12 w-auto"
          />
          <h1 className="text-2xl font-bold">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isSignUp
              ? 'Start generating landing pages'
              : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          )}
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={8}
          />
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : isSignUp
              ? 'Create account'
              : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            className="text-primary underline-offset-4 hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>

      </div>
    </div>
  )
}
