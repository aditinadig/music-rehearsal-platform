import { createClient } from '@supabase/supabase-js'

const AUTH_STORAGE_KEY = 'cue-auth-session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

function getCookie(name) {
  if (typeof document === 'undefined') return null

  const encodedName = `${encodeURIComponent(name)}=`
  const cookie = document.cookie
    .split('; ')
    .find(part => part.startsWith(encodedName))

  return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : null
}

function setCookie(name, value) {
  if (typeof document === 'undefined') return

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`
}

function deleteCookie(name) {
  if (typeof document === 'undefined') return

  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`
}

const authStorage = {
  getItem(key) {
    if (typeof window === 'undefined') return null

    return window.localStorage.getItem(key) ?? getCookie(key)
  },
  setItem(key, value) {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(key, value)
    setCookie(key, value)
  },
  removeItem(key) {
    if (typeof window === 'undefined') return

    window.localStorage.removeItem(key)
    deleteCookie(key)
  },
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storage: authStorage,
      storageKey: AUTH_STORAGE_KEY,
    },
  }
)
