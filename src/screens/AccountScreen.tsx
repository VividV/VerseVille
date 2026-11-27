import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { useAccountStore } from '../store/accountStore'
import { useGameStore } from '../store/gameStore'

type Mode = 'sign-in' | 'create'
export const MIN_PASSWORD = 8

/** Sign in or create an account (spec §15). Works for guests and for new devices. */
export function AccountScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const mode: Mode = params.get('mode') === 'create' ? 'create' : 'sign-in'
  const { configured, user, signIn, signUp } = useAccountStore()
  const profile = useGameStore((s) => s.profile)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmSent, setConfirmSent] = useState(false)

  const back = profile ? '/profile' : '/welcome'

  const goOn = () => navigate(useGameStore.getState().profile ? '/garden' : '/onboarding', { replace: true })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Please enter a valid email address.')
    if (password.length < MIN_PASSWORD) return setError(`Please use a password of at least ${MIN_PASSWORD} characters.`)
    setBusy(true)
    try {
      if (mode === 'create') {
        const result = await signUp(email, password)
        if (result === 'confirm-email') {
          setConfirmSent(true)
          return
        }
      } else {
        await signIn(email, password)
      }
      goOn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 bg-paper px-5 py-8">
      <Link to={back} className="-ml-1 inline-flex min-h-11 items-center gap-1 font-bold text-leaf-dark">
        <span aria-hidden="true">←</span> Back
      </Link>
      <header className="text-center">
        <span className="text-5xl" aria-hidden="true">
          ☁️
        </span>
        <h1 className="mt-2 text-3xl font-extrabold text-leaf-dark">{mode === 'create' ? 'Create an account' : 'Welcome back'}</h1>
        <p className="mt-1 text-ink-soft">
          {mode === 'create'
            ? profile
              ? 'Save your garden and verses to your account, and continue on any device.'
              : 'Save your progress and play on any device.'
            : 'Sign in to bring your garden and verses to this device.'}
        </p>
      </header>

      {!configured ? (
        <Card>
          <p className="text-ink-soft">Accounts aren't available in this version of VerseVille. You can keep playing as a guest.</p>
        </Card>
      ) : user ? (
        <Card className="text-center">
          <p className="font-bold text-ink">You're signed in as {user.email}.</p>
          <Button className="mt-3" onClick={goOn}>
            Continue
          </Button>
        </Card>
      ) : confirmSent ? (
        <Card role="status">
          <h2 className="text-lg font-extrabold text-leaf-dark">Check your email</h2>
          <p className="mt-1 text-ink-soft">
            We sent a confirmation link to <strong>{email}</strong>. Open it, then come back here and sign in. Your progress
            stays safe on this device until then.
          </p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => {
              setConfirmSent(false)
              setParams({ mode: 'sign-in' }, { replace: true })
            }}
          >
            Go to sign in
          </Button>
        </Card>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <div>
              <label htmlFor="email" className="block font-bold text-leaf-dark">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 min-h-12 w-full rounded-2xl border-2 border-leaf-light bg-white px-4 text-lg focus:border-leaf focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="password" className="block font-bold text-leaf-dark">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="password-hint"
                className="mt-1 min-h-12 w-full rounded-2xl border-2 border-leaf-light bg-white px-4 text-lg focus:border-leaf focus:outline-none"
              />
              <p id="password-hint" className="mt-1 text-sm text-ink-soft">
                At least {MIN_PASSWORD} characters.
              </p>
            </div>
          </Card>

          {mode === 'sign-in' && profile && (
            <p className="text-sm text-ink-soft">
              Your progress on this device will be combined with your account — nothing is lost.
            </p>
          )}
          {error && (
            <p role="alert" className="text-center font-bold text-[#b64b3c]">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" fullWidth disabled={busy}>
            {busy ? 'Please wait…' : mode === 'create' ? 'Create account' : 'Sign in'}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setError(null)
              setParams({ mode: mode === 'create' ? 'sign-in' : 'create' }, { replace: true })
            }}
          >
            {mode === 'create' ? 'I already have an account' : 'Create a new account instead'}
          </Button>
        </form>
      )}
    </main>
  )
}
