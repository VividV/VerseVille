import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { GardenBackdrop } from '../components/common/GardenBackdrop'

export function WelcomeScreen() {
  const navigate = useNavigate()

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-paper">
      <GardenBackdrop fill className="absolute inset-x-0 top-0 h-[66dvh] w-full" />
      <div className="relative mt-auto mx-auto w-full max-w-md px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="rounded-3xl bg-cream/95 p-6 text-center shadow-soft animate-pop-in">
          <h1 className="text-4xl font-extrabold tracking-tight text-leaf-dark">VerseVille</h1>
          <p className="mt-2 text-lg font-semibold text-ink-soft">Grow your world. Remember His Word.</p>
          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" fullWidth onClick={() => navigate('/onboarding')}>
              Begin Your Journey
            </Button>
            {/* Cloud accounts arrive in Phase 8. Until then the button is honestly disabled. */}
            <Button size="lg" variant="secondary" fullWidth disabled aria-describedby="existing-player-note">
              Existing Player
            </Button>
            <p id="existing-player-note" className="text-sm text-ink-soft">
              Sign-in is coming soon. You can play now without an account.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
