"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "./supabase-client"
import type { UserProfile } from "@/types"

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Cache for user profiles to avoid repeated fetches
const profileCache = new Map<string, { profile: UserProfile; timestamp: number }>()
const PROFILE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const mountedRef = useRef(true)
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const lastRefreshRef = useRef<number>(0)

  const clearAuthState = useCallback(() => {
    if (!mountedRef.current) return
    setUser(null)
    setProfile(null)
  }, [])

  const getCachedProfile = useCallback((email: string): UserProfile | null => {
    const cached = profileCache.get(email)
    if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
      return cached.profile
    }
    return null
  }, [])

  const setCachedProfile = useCallback((email: string, profile: UserProfile) => {
    profileCache.set(email, { profile, timestamp: Date.now() })
  }, [])

  const refreshUser = useCallback(async () => {
    if (!mountedRef.current) return

    // Debounce rapid refresh calls
    const now = Date.now()
    if (now - lastRefreshRef.current < 1000) {
      return
    }
    lastRefreshRef.current = now

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Session error:", sessionError)
        clearAuthState()
        return
      }

      const currentUser = sessionData.session?.user || null

      if (!currentUser) {
        clearAuthState()
        return
      }

      if (!mountedRef.current) return

      setUser(currentUser)

      // Check cache first
      const cachedProfile = getCachedProfile(currentUser.email!)
      if (cachedProfile) {
        setProfile(cachedProfile)
        return
      }

      // Fetch profile if not cached
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("email", currentUser.email)
          .maybeSingle()

        if (!mountedRef.current) return

        if (profileError) {
          console.error("Profile fetch error:", profileError)
          setProfile(null)
          return
        }

        if (profileData) {
          setCachedProfile(currentUser.email!, profileData)
          setProfile(profileData)
        } else {
          setProfile(null)
        }
      } catch (profileError) {
        console.warn("Profile fetch failed:", profileError)
        if (mountedRef.current) {
          setProfile(null)
        }
      }
    } catch (error: any) {
      console.error("Error refreshing user:", error.message)
      if (mountedRef.current) {
        clearAuthState()
      }
    }
  }, [clearAuthState, getCachedProfile, setCachedProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (!data.user) {
          throw new Error("No user data returned")
        }

        // Check cache first
        const normalizedEmail = email.toLowerCase().trim()
        const cachedProfile = getCachedProfile(normalizedEmail)

        if (cachedProfile) {
          if (mountedRef.current) {
            setUser(data.user)
            setProfile(cachedProfile)
          }
          return
        }

        // Get user profile if not cached
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("email", normalizedEmail)
          .maybeSingle()

        if (profileError) {
          console.error("Profile fetch error:", profileError)
          throw new Error("Failed to fetch user profile")
        }

        if (!profile) {
          throw new Error("User profile not found")
        }

        setCachedProfile(normalizedEmail, profile)

        if (mountedRef.current) {
          setUser(data.user)
          setProfile(profile)
        }
      } catch (error) {
        console.error("Sign in error:", error)
        throw error
      }
    },
    [getCachedProfile, setCachedProfile],
  )

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // Clear cache on sign out
      profileCache.clear()

      if (mountedRef.current) {
        clearAuthState()
      }
    } catch (error) {
      console.error("Sign out error:", error)
      throw error
    }
  }, [clearAuthState])

  useEffect(() => {
    mountedRef.current = true

    const initializeAuth = async () => {
      if (!mountedRef.current) return

      try {
        await refreshUser()
      } catch (error) {
        console.error("Auth initialization error:", error)
      } finally {
        if (mountedRef.current) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    // Set up auth state listener with debouncing
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return

      // Clear any pending refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      // Debounce auth state changes
      refreshTimeoutRef.current = setTimeout(async () => {
        if (!mountedRef.current) return

        console.log("Auth state changed:", event)

        if (event === "SIGNED_OUT" || !session) {
          clearAuthState()
          if (mountedRef.current) {
            setLoading(false)
          }
          return
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          try {
            await refreshUser()
          } catch (error) {
            console.error("Error handling auth state change:", error)
            clearAuthState()
          } finally {
            if (mountedRef.current) {
              setLoading(false)
            }
          }
        }
      }, 100) // 100ms debounce
    })

    return () => {
      mountedRef.current = false
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      subscription.unsubscribe()
    }
  }, [refreshUser, clearAuthState])

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      profile,
      loading: loading || !initialized,
      signIn,
      signOut,
      refreshUser,
    }),
    [user, profile, loading, initialized, signIn, signOut, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
