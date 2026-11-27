import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../common/Button'
import { Card } from '../common/Card'
import { Modal } from '../common/Modal'
import { UnsyncedChangesError, useAccountStore } from '../../store/accountStore'

function timeAgo(iso: string | null): string {
  if (!iso) return 'not yet'
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(iso).toLocaleDateString()
}

const STATUS_TEXT = {
  idle: '✓ Saved to your account',
  syncing: 'Syncing…',
  error: 'Sync problem — will retry',
  offline: 'Offline — will sync when you reconnect',
}

/** Profile → Account & privacy (spec Screen 15). */
export function AccountCard() {
  const navigate = useNavigate()
  const { configured, user, syncStatus, lastSyncedAt, lastError, lastRejected, syncNow, signOut } = useAccountStore()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [unsynced, setUnsynced] = useState(false)
  const [busy, setBusy] = useState(false)

  const doSignOut = async (force: boolean) => {
    setBusy(true)
    try {
      await signOut(force)
      navigate('/welcome', { replace: true })
    } catch (e) {
      if (e instanceof UnsyncedChangesError) setUnsynced(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-leaf-dark">Account &amp; privacy</h2>
      {!user ? (
        <>
          <p className="mt-1 text-ink-soft">
            You're playing as a guest. Your progress is saved only on this device.
            {configured && ' Create a free account to keep it safe and play on other devices.'}
          </p>
          {configured && (
            <div className="mt-3 flex flex-col gap-2">
              <Link
                to="/account?mode=create"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-leaf px-5 font-bold text-white shadow-soft"
              >
                Create an account
              </Link>
              <Link to="/account?mode=sign-in" className="inline-flex min-h-11 items-center justify-center font-bold text-leaf-dark underline">
                I already have an account
              </Link>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-ink">
            Signed in as <strong>{user.email}</strong>
          </p>
          <p role="status" className="mt-1 text-sm font-bold text-ink-soft">
            {STATUS_TEXT[syncStatus]} · last synced {timeAgo(lastSyncedAt)}
          </p>
          {syncStatus === 'error' && lastError && <p className="mt-1 text-xs text-ink-soft">{lastError}</p>}
          {lastRejected > 0 && (
            <p className="mt-1 text-sm text-ink-soft">
              {lastRejected} change{lastRejected === 1 ? " wasn't" : "s weren't"} accepted by the server and {lastRejected === 1 ? 'was' : 'were'} undone.
            </p>
          )}
          <p className="mt-2 text-sm text-ink-soft">
            We store your progress (verses, garden, rewards) and email only. Learning statistics stay on this device.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => void syncNow()} disabled={syncStatus === 'syncing'}>
              Sync now
            </Button>
            <Button variant="ghost" onClick={() => setConfirmSignOut(true)}>
              Sign out
            </Button>
          </div>
        </>
      )}

      <Modal
        open={confirmSignOut}
        title={unsynced ? 'Not everything is saved yet' : 'Sign out?'}
        onClose={() => {
          setConfirmSignOut(false)
          setUnsynced(false)
        }}
        footer={
          <>
            <Button variant={unsynced ? 'danger' : 'primary'} fullWidth disabled={busy} onClick={() => doSignOut(unsynced)}>
              {busy ? 'Signing out…' : unsynced ? 'Sign out anyway' : 'Sign out'}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setConfirmSignOut(false)
                setUnsynced(false)
              }}
            >
              Stay signed in
            </Button>
          </>
        }
      >
        {unsynced
          ? "Some recent progress hasn't reached your account (you may be offline). If you sign out now, that progress will be lost from this device."
          : 'Your progress is saved in your account. Signing out removes it from this device — sign in again any time to get it back.'}
      </Modal>
    </Card>
  )
}
