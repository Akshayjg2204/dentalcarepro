import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing required Supabase environment variables")
}

// Enhanced user cache for better performance
const userCache = new Map<string, any>()
const cacheTimestamps = new Map<string, number>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes (increased from 30 seconds)

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>()

export const getCachedUser = (email: string) => {
  const cached = userCache.get(email)
  const timestamp = cacheTimestamps.get(email)

  if (cached && timestamp && Date.now() - timestamp < CACHE_DURATION) {
    return cached
  }

  return null
}

export const setCachedUser = (email: string, userData: any) => {
  userCache.set(email, userData)
  cacheTimestamps.set(email, Date.now())
}

export const clearUserCache = () => {
  userCache.clear()
  cacheTimestamps.clear()
  pendingRequests.clear()
}

// Request deduplication helper
export const deduplicateRequest = async (key: string, requestFn: () => Promise<any>): Promise<any> => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<any>
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, promise)
  return promise
}

// Create Supabase client with optimized settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable URL detection for better performance
    flowType: "pkce",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
  realtime: {
    params: {
      eventsPerSecond: 1, // Reduced from 2 for better performance
    },
  },
  global: {
    headers: {
      "x-application-name": "dental-clinic-app",
    },
  },
  db: {
    schema: "public",
  },
})

// Optimized session helper with caching
let sessionCache: { data: any; timestamp: number } | null = null
const SESSION_CACHE_DURATION = 30000 // 30 seconds

export const getSession = async () => {
  try {
    // Return cached session if valid
    if (sessionCache && Date.now() - sessionCache.timestamp < SESSION_CACHE_DURATION) {
      return sessionCache.data
    }

    const result = await deduplicateRequest("getSession", async () => {
      const { data, error } = await supabase.auth.getSession()
      return { data, error }
    })

    // Cache the result
    sessionCache = {
      data: result,
      timestamp: Date.now(),
    }

    return result
  } catch (error) {
    console.error("Session fetch error:", error)
    return { data: null, error }
  }
}

// Optimized user helper with caching
let userCache_session: { data: any; timestamp: number } | null = null

export const getUser = async () => {
  try {
    // Return cached user if valid
    if (userCache_session && Date.now() - userCache_session.timestamp < SESSION_CACHE_DURATION) {
      return userCache_session.data
    }

    const result = await deduplicateRequest("getUser", async () => {
      const { data, error } = await supabase.auth.getUser()
      return { data, error }
    })

    // Cache the result
    userCache_session = {
      data: result,
      timestamp: Date.now(),
    }

    return result
  } catch (error) {
    console.error("User fetch error:", error)
    return { data: null, error }
  }
}

// Clear all caches
export const clearAllCaches = () => {
  clearUserCache()
  sessionCache = null
  userCache_session = null
}
