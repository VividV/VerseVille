import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { GardenBackdrop } from '../components/common/GardenBackdrop'
import { isCloudConfigured } from '../services/auth/supabaseClient'

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
            {isCloudConfigured() ? (
              <>
                <Button size="lg" variant="secondary" fullWidth onClick={() => navigate('/account?mode=sign-in')}>
                  Existing Player
                </Button>
                <p className="text-sm text-ink-soft">No account needed to start — you can create one later.</p>
              </>
            ) : (
              <>
                {/* Built without Supabase settings: accounts aren't available, so the button is honestly disabled. */}
                <Button size="lg" variant="secondary" fullWidth disabled aria-describedby="existing-player-note">
                  Existing Player
                </Button>
                <p id="existing-player-note" className="text-sm text-ink-soft">
                  Accounts aren't available in this version. You can play now without one.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
