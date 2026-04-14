import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy-initialized clients — only created when env vars are available
let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}
function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}
function getSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || getSupabaseAnonKey()
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = getSupabaseUrl()
    const key = getSupabaseAnonKey()
    if (!url || !key) throw new Error('Missing Supabase environment variables')
    _supabase = createClient(url, key)
  }
  return _supabase
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = getSupabaseUrl()
    const key = getSupabaseServiceKey()
    if (!url || !key) throw new Error('Missing Supabase environment variables')
    _supabaseAdmin = createClient(url, key)
  }
  return _supabaseAdmin
}

// Backward-compatible named exports (lazy getters)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop]
  },
})

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop]
  },
})

// Database types
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  archived: boolean
}

export interface UserPreferences {
  id: string
  user_id: string
  theme: 'light' | 'dark'
  notifications_enabled: boolean
  voice_enabled: boolean
  email_briefing: boolean
  briefing_time: string
  created_at: string
  updated_at: string
}

export interface IntegrationCredential {
  id: string
  user_id: string
  provider: 'google' | 'quickbooks' | 'twilio'
  access_token: string
  refresh_token?: string
  expires_at?: string
  created_at: string
  updated_at: string
}
