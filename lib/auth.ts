import { supabase, getSession } from "./supabase-client"
import { clearUserCache } from "./supabase-client"

// Cache for user data to avoid repeated database calls
const userCache = new Map<string, any>()
const cacheTimestamps = new Map<string, number>()
const CACHE_DURATION = 60000 // 1 minute

const getCachedUser = (email: string) => {
  const cached = userCache.get(email)
  const timestamp = cacheTimestamps.get(email)

  if (cached && timestamp && Date.now() - timestamp < CACHE_DURATION) {
    return cached
  }

  return null
}

const setCachedUser = (email: string, userData: any) => {
  userCache.set(email, userData)
  cacheTimestamps.set(email, Date.now())
}

const clearCache = () => {
  userCache.clear()
  cacheTimestamps.clear()
  clearUserCache()
}

export async function signIn(email: string, password: string) {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    throw authError
  }

  if (!authData.user) {
    throw new Error("No user data returned")
  }

  // Get user profile - use maybeSingle() to handle multiple or no rows
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle()

  if (profileError) {
    console.error("Profile fetch error:", profileError)
    throw new Error("Failed to fetch user profile")
  }

  if (!profile) {
    throw new Error("User profile not found")
  }

  console.log("Sign in successful, profile role:", profile.role)
  return {
    user: authData.user,
    profile,
  }
}

export async function signOut() {
  clearCache()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  try {
    // Get session without timeout
    const { data: sessionData, error: sessionError } = await getSession()

    if (sessionError) {
      console.error("Session error:", sessionError)
      return null
    }

    if (!sessionData?.session?.user) {
      return null
    }

    const userEmail = sessionData.session.user.email
    if (!userEmail) {
      return null
    }

    // Check cache first
    const cachedUser = getCachedUser(userEmail)
    if (cachedUser) {
      return cachedUser
    }

    // Fetch from database
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .maybeSingle()

    if (profileError) {
      console.error("Profile fetch error:", profileError)
      return null
    }

    if (!profile) {
      console.log("No profile found for user:", userEmail)
      return null
    }

    const userData = {
      user: sessionData.session.user,
      profile,
    }

    // Cache the result
    setCachedUser(userEmail, userData)

    return userData
  } catch (error: any) {
    console.error("getCurrentUser error:", error)
    return null
  }
}

export async function createUser(userData: {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role: "doctor" | "staff" | "patient"
  dateOfBirth?: string
  address?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
}) {
  try {
    const normalizedEmail = userData.email.toLowerCase().trim()

    console.log("=== STARTING USER CREATION ===")
    console.log("Email:", normalizedEmail)
    console.log("Role:", userData.role)

    // Basic email validation
    if (!normalizedEmail || !normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
      throw new Error("Please enter a valid email address")
    }

    // Validate password
    if (!userData.password || userData.password.length < 6) {
      throw new Error("Password must be at least 6 characters long")
    }

    // First, check if user already exists in our database by email
    console.log("Checking for existing user in database...")
    const { data: existingUserByEmail, error: checkEmailError } = await supabase
      .from("users")
      .select("email, id")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (existingUserByEmail) {
      console.log("User already exists in database:", existingUserByEmail)
      throw new Error("A user with this email already exists")
    }

    // If checkEmailError is not "PGRST116" (no rows found), then it's a real error
    if (checkEmailError && checkEmailError.code !== "PGRST116") {
      console.error("Database check error:", checkEmailError)
      throw checkEmailError
    }

    console.log("No existing user found, proceeding with creation...")

    const response = await fetch("/api/users/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role,
        phone: userData.phone,
        address: userData.address,
        date_of_birth: userData.dateOfBirth,
        emergency_contact_name: userData.emergencyContactName,
        emergency_contact_phone: userData.emergencyContactPhone,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create user")
    }

    const result = await response.json()
    console.log("✅ USER CREATION COMPLETE via API")

    // Clear cache to ensure fresh data
    clearCache()

    return {
      authUser: { id: result.user.id, email: normalizedEmail },
      profile: result.user,
      method: "api_create",
    }
  } catch (error: any) {
    console.error("❌ ERROR CREATING USER:", error.message)
    clearCache()
    throw error
  }
}

export async function updateUserRole(userId: string, newRole: "doctor" | "staff" | "patient") {
  try {
    const { data, error } = await supabase.from("users").update({ role: newRole }).eq("id", userId).select().single()

    if (error) throw error

    // Clear cache to ensure fresh data
    clearCache()

    return data
  } catch (error) {
    console.error("Error updating user role:", error)
    clearCache()
    throw error
  }
}

export async function deleteUser(userId: string) {
  try {
    // Get the user's email first
    const { data: user, error: getUserError } = await supabase.from("users").select("email").eq("id", userId).single()

    if (getUserError) {
      console.error("Error getting user for deletion:", getUserError)
      throw getUserError
    }

    const userEmail = user.email.toLowerCase().trim()
    console.log("Deleting user:", { userId, email: userEmail })

    // Delete from users table first
    const { error: profileError } = await supabase.from("users").delete().eq("id", userId)
    if (profileError) {
      console.error("Error deleting user profile:", profileError)
      throw profileError
    }

    console.log("Profile deleted successfully")

    // Now try to delete from auth using our database function
    const { data: authDeleteResult, error: authDeleteError } = await supabase.rpc("force_delete_auth_user", {
      target_email: userEmail,
    })

    if (authDeleteError) {
      console.error("Error calling auth delete function:", authDeleteError)
      // Don't throw error here, as profile deletion succeeded
      console.warn(`Profile deleted but auth user deletion failed: ${authDeleteError.message}`)

      // Clear cache
      clearCache()

      return {
        success: true,
        authUserDeleted: false,
        warning: `Profile deleted but authentication user may still exist. Error: ${authDeleteError.message}`,
      }
    }

    console.log("Auth delete function result:", authDeleteResult)

    // Check the result from our database function
    let authUserDeleted = false
    if (authDeleteResult && typeof authDeleteResult === "object") {
      authUserDeleted = authDeleteResult.success === true
      if (!authUserDeleted) {
        console.warn("Auth user deletion failed:", authDeleteResult.error || authDeleteResult.message)
      } else {
        console.log("Auth user deleted successfully:", authDeleteResult.message)
      }
    }

    // Clear cache
    clearCache()

    return {
      success: true,
      authUserDeleted,
      message: authUserDeleted
        ? "User completely deleted from both profile and authentication"
        : "Profile deleted but authentication user may still exist. You may need to use the cleanup function.",
    }
  } catch (error) {
    console.error("Error deleting user:", error)
    clearCache()
    throw error
  }
}

// Enhanced cleanup function with better error handling
export async function cleanupOrphanedAuthUsers() {
  try {
    // First, run the orphaned profiles cleanup
    const { data: profileCleanupResult, error: profileCleanupError } = await supabase.rpc("cleanup_orphaned_profiles")

    if (profileCleanupError) {
      console.error("Failed to cleanup orphaned profiles:", profileCleanupError)
    } else {
      console.log("Profile cleanup result:", profileCleanupResult)
    }

    // Get all users from our database
    const { data: profileUsers, error: profileError } = await supabase.from("users").select("email")
    if (profileError) {
      console.error("Failed to list profile users:", profileError)
      return { success: false, error: profileError.message }
    }

    const profileEmails = new Set(profileUsers?.map((u) => u.email?.toLowerCase()) || [])
    let cleanedCount = 0
    const failedEmails: string[] = []

    // Get orphaned users using our database function
    const { data: orphanedData, error: orphanedError } = await supabase.rpc("list_orphaned_auth_users")

    if (orphanedError) {
      return { success: false, error: orphanedError.message }
    }

    // Parse the orphaned users data
    let orphanedUsers = []
    if (orphanedData) {
      if (Array.isArray(orphanedData)) {
        orphanedUsers = orphanedData
      } else if (typeof orphanedData === "object") {
        orphanedUsers = [orphanedData]
      } else {
        try {
          orphanedUsers = JSON.parse(orphanedData)
        } catch (parseError) {
          console.error("Error parsing orphaned users data:", parseError)
          orphanedUsers = []
        }
      }
    }

    for (const orphanedUser of orphanedUsers) {
      const email = orphanedUser.email
      if (email && !profileEmails.has(email.toLowerCase())) {
        const deleted = await forceDeleteAuthUser(email)
        if (deleted) {
          cleanedCount++
          console.log("Cleaned up orphaned auth user:", email)
        } else {
          failedEmails.push(email)
        }
      }
    }

    const profileCleanedCount = profileCleanupResult?.cleaned_profiles || 0
    const totalCleaned = cleanedCount + profileCleanedCount

    // Clear cache after cleanup
    clearCache()

    return {
      success: true,
      cleanedCount: totalCleaned,
      authUsersCleaned: cleanedCount,
      profilesCleaned: profileCleanedCount,
      failedCount: failedEmails.length,
      failedEmails,
      message: `Cleanup completed: ${totalCleaned} total cleaned (${cleanedCount} auth users, ${profileCleanedCount} profiles), ${failedEmails.length} failed. Failed emails: ${failedEmails.join(", ")}`,
    }
  } catch (error: any) {
    console.error("Error cleaning up orphaned users:", error)
    clearCache()
    return { success: false, error: error.message }
  }
}

// New function to check auth user status
export async function checkAuthUserStatus(email: string) {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    const result = await checkAuthUserExists(normalizedEmail)
    return { exists: result, authUser: null }
  } catch (error: any) {
    return { exists: null, error: error.message }
  }
}

// Function to force delete auth user (for admin use)
export async function forceDeleteAuthUser(email: string): Promise<boolean> {
  try {
    const normalizedEmail = email.toLowerCase().trim()

    console.log("Attempting to delete auth user:", normalizedEmail)

    // Use our database function to delete the auth user
    const { data, error } = await supabase.rpc("force_delete_auth_user", {
      target_email: normalizedEmail,
    })

    if (error) {
      console.error("RPC Error force deleting auth user:", error)
      return false
    }

    console.log("Delete auth user response:", data)

    // The function returns a jsonb object with success status
    if (data && typeof data === "object") {
      if (data.success) {
        console.log("Auth user deleted successfully:", data.message)
        return true
      } else {
        console.error("Failed to delete auth user:", data.error || data.message)
        return false
      }
    }

    console.error("Unexpected response format from delete function:", data)
    return false
  } catch (error) {
    console.error("Exception in forceDeleteAuthUser:", error)
    return false
  }
}

// Helper function to check if auth user exists
export async function checkAuthUserExists(email: string): Promise<boolean> {
  try {
    const normalizedEmail = email.toLowerCase().trim()

    // Use the list function to check if user exists
    const { data, error } = await supabase.rpc("list_orphaned_auth_users")

    if (error) {
      console.error("Error checking auth user existence:", error)
      // Fallback to the old method
      return await checkAuthUserExistsFallback(normalizedEmail)
    }

    // Parse the response
    let orphanedUsers = []
    if (data) {
      if (Array.isArray(data)) {
        orphanedUsers = data
      } else if (typeof data === "object") {
        orphanedUsers = [data]
      } else {
        try {
          orphanedUsers = JSON.parse(data)
        } catch (parseError) {
          console.error("Error parsing orphaned users data:", parseError)
          orphanedUsers = []
        }
      }
    }

    // Check if the email exists in orphaned users
    const emailExists = orphanedUsers.some(
      (user: any) => user.email && user.email.toLowerCase().trim() === normalizedEmail,
    )

    if (emailExists) {
      return true
    }

    // Also check if user exists in our users table (not orphaned)
    const { data: profileUser, error: profileError } = await supabase
      .from("users")
      .select("email")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (profileUser) {
      // User exists in both auth and profile, so auth user exists
      return true
    }

    // User doesn't exist in either place
    return false
  } catch (error) {
    console.error("Error checking auth user existence:", error)
    // Fallback to the old method
    return await checkAuthUserExistsFallback(email)
  }
}

// Fallback method for checking auth user existence
async function checkAuthUserExistsFallback(email: string): Promise<boolean> {
  try {
    // Try to get user by email using a sign-in attempt with wrong password
    // This will tell us if the user exists without actually signing them in
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: "dummy_password_check_12345", // This will fail but tell us if user exists
    })

    if (error) {
      if (error.message?.includes("Invalid login credentials") || error.message?.includes("Email not confirmed")) {
        // User exists but password is wrong or email not confirmed
        return true
      } else if (error.message?.includes("User not found") || error.message?.includes("Invalid email")) {
        // User doesn't exist
        return false
      } else {
        // Other error, assume user might exist to be safe
        console.warn("Unexpected auth check error:", error)
        return true
      }
    }

    // If no error, user exists and password was somehow correct (very unlikely)
    return true
  } catch (error) {
    console.error("Error checking auth user existence:", error)
    // Assume user exists to be safe
    return true
  }
}
