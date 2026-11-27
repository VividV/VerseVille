/** Email + password accounts through Supabase Auth (spec §15). */
import { getSupabase } from './supabaseClient'

export interface AccountUser {
  id: string
  email: string
}

export type SignUpResult = { status: 'signed-in'; user: AccountUser } | { status: 'confirm-email' }

function requireClient() {
  const sb = getSupabase()
  if (!sb) throw new Error('Accounts are not set up in this version of VerseVille.')
  return sb
}

/** Turns Supabase's technical messages into friendly ones. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'That email and password don’t match an account.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Try signing in.'
  if (m.includes('password') && (m.includes('at least') || m.includes('short'))) return 'Please use a password of at least 8 characters.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for a link.'
  if (m.includes('invalid') && m.includes('email')) return 'Please enter a valid email address.'
  if (m.includes('fetch') || m.includes('network')) return 'You seem to be offline. Please try again when connected.'
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.'
  return message
}

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await requireClient().auth.signUp({ email: email.trim(), password })
  if (error) throw new Error(friendlyAuthError(error.message))
  if (!data.session || !data.user) return { status: 'confirm-email' }
  return { status: 'signed-in', user: { id: data.user.id, email: data.user.email ?? email } }
}

export async function signIn(email: string, password: string): Promise<AccountUser> {
  const { data, error } = await requireClient().auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(friendlyAuthError(error.message))
  return { id: data.user.id, email: data.user.email ?? email }
}

export async function signOut(): Promise<void> {
  const sb = getSupabase()
  if (sb) await sb.auth.signOut()
}

/** The signed-in user saved on this device, if any (works offline). */
export async function currentUser(): Promise<AccountUser | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  const user = data.session?.user
  return user ? { id: user.id, email: user.email ?? '' } : null
}
