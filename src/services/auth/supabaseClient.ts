/**
 * The Supabase client, or null when the app is built without Supabase settings
 * (then VerseVille simply stays in guest mode).
 * Only the publishable key is used — it is safe in the app because every table
 * is protected by Row Level Security (supabase/schema.sql).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null | undefined

export function isCloudConfigured(): boolean {
  return Boolean(url && key)
}

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client
  client = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null
  return client
}

/** For tests: use a fake client. */
export function setSupabaseForTests(fake: SupabaseClient | null): void {
  client = fake
}
