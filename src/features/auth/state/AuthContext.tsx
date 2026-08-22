import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthSnapshot, UserProfile } from '../types'
import { defaultCurrency } from '../types'
import {
  type AuthResult,
  type PasswordResetDelivery,
  AuthError,
  changePassword as changePasswordService,
  confirmPasswordReset as confirmPasswordResetService,
  deleteAccount as deleteAccountService,
  login as loginService,
  logout as logoutService,
  readSessionUser,
  register as registerService,
  requestPasswordReset as requestPasswordResetService,
  setSession,
  updateProfile as updateProfileService,
} from '../services/authService'
import { clearPersistedState } from '../../../lib/storageService'

export type AuthStatus = 'checking' | 'guest' | 'user'

export interface RegisterInput {
  email: string
  name: string
  password: string
}

export interface ProfilePatch {
  name?: string
  avatar?: string
  currency?: string
}

export interface AuthValue {
  status: AuthStatus
  user: UserProfile | null
  currency: string
  register: (input: RegisterInput) => Promise<AuthResult<UserProfile>>
  login: (email: string, password: string) => Promise<AuthResult<UserProfile>>
  logout: () => Promise<void>
  updateProfile: (patch: ProfilePatch) => Promise<AuthResult<UserProfile>>
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<AuthResult<null>>
  requestPasswordReset: (
    email: string,
  ) => Promise<AuthResult<PasswordResetDelivery>>
  confirmPasswordReset: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<AuthResult<null>>
  /** Removes the account, the session and all on-device financial data. */
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)
const AppCurrencyContext = createContext<string | null>(null)

function userFromSnapshot(snapshot: AuthSnapshot): UserProfile | null {
  const session = snapshot.session
  if (!session) return null
  return snapshot.users.find((u) => u.id === session.userId) ?? null
}

interface AuthProviderProps {
  children: ReactNode
  /** When provided the session is resolved synchronously (no boot timer). */
  initialSnapshot?: AuthSnapshot
}

export function AuthProvider({ children, initialSnapshot }: AuthProviderProps) {
  const initialUser = initialSnapshot ? userFromSnapshot(initialSnapshot) : null
  const [user, setUser] = useState<UserProfile | null>(initialUser)
  const [status, setStatus] = useState<AuthStatus>(() =>
    initialSnapshot ? (initialUser ? 'user' : 'guest') : 'checking',
  )
  const userIdRef = useRef<string | null>(initialUser?.id ?? null)

  // Keep a ref of the current user id so callbacks never go stale.
  useEffect(() => {
    userIdRef.current = user?.id ?? null
  }, [user])

  // Boot: hydrate the persisted session after the first paint so the shell can
  // render a first frame, mirroring the AppState boot skeleton.
  useEffect(() => {
    if (initialSnapshot) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      const sessionUser = readSessionUser()
      setUser(sessionUser)
      setStatus(sessionUser ? 'user' : 'guest')
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [initialSnapshot])

  const value = useMemo<AuthValue>(() => {
    const sessionUser = user

    return {
      status,
      user: sessionUser,
      currency: sessionUser?.currency ?? defaultCurrency(),
      register: async (input) => {
        const result = await registerService(input)
        if (result.ok) {
          await setSession(result.data.id)
          setUser(result.data)
          setStatus('user')
        }
        return result
      },
      login: async (email, password) => {
        const result = await loginService(email, password)
        if (result.ok) {
          await setSession(result.data.id)
          setUser(result.data)
          setStatus('user')
        }
        return result
      },
      logout: async () => {
        await logoutService()
        setUser(null)
        setStatus('guest')
      },
      updateProfile: async (patch) => {
        const id = userIdRef.current
        if (!id) return noSessionResult<UserProfile>()
        const result = await updateProfileService(id, patch)
        if (result.ok) setUser(result.data)
        return result
      },
      changePassword: async (currentPassword, newPassword) => {
        const id = userIdRef.current
        if (!id) return noSessionResult<null>()
        return changePasswordService(id, currentPassword, newPassword)
      },
      requestPasswordReset: (email) => requestPasswordResetService(email),
      confirmPasswordReset: (email, code, newPassword) =>
        confirmPasswordResetService(email, code, newPassword),
      deleteAccount: async () => {
        const id = userIdRef.current
        if (!id) return
        await deleteAccountService(id)
        clearPersistedState()
        setUser(null)
        setStatus('guest')
      },
    }
  }, [status, user])

  return (
    <AuthContext.Provider value={value}>
      <AppCurrencyContext.Provider value={value.currency}>
        {children}
      </AppCurrencyContext.Provider>
    </AuthContext.Provider>
  )
}

function noSessionResult<T>(): AuthResult<T> {
  return { ok: false, error: new AuthError('not-found', 'Sin sesión activa.') }
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/**
 * Primary currency of the signed-in user. Readable anywhere inside the app;
 * defaults to EUR when used outside an authenticated session (isolated
 * component tests, pre-login screens) so it never throws.
 */
export function useAppCurrency(): string {
  const ctx = useContext(AppCurrencyContext)
  return ctx ?? defaultCurrency()
}