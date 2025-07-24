import { supabase } from "./supabase"

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  // Get user profile from our users table
  const { data: userProfile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single()

  if (profileError) throw profileError

  return { user: data.user, profile: userProfile }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase.from("users").select("*").eq("email", user.email).single()

  if (error) throw error

  return { user, profile }
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
    // First, check if user already exists in our database
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("email")
      .eq("email", userData.email)
      .single()

    if (existingUser) {
      throw new Error("A user with this email already exists")
    }

    // If checkError is not "PGRST116" (no rows found), then it's a real error
    if (checkError && checkError.code !== "PGRST116") {
      throw checkError
    }

    // Create user profile first
    const { data: profileData, error: profileError } = await supabase
      .from("users")
      .insert({
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone || null,
        role: userData.role,
        date_of_birth: userData.dateOfBirth || null,
        address: userData.address || null,
        emergency_contact_name: userData.emergencyContactName || null,
        emergency_contact_phone: userData.emergencyContactPhone || null,
      })
      .select()
      .single()

    if (profileError) {
      throw profileError
    }

    // Then create the authentication user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: undefined, // No email confirmation needed
      },
    })

    if (authError) {
      // If auth creation fails, clean up the profile
      await supabase.from("users").delete().eq("email", userData.email)
      throw authError
    }

    if (!authData.user) {
      // If no auth user was created, clean up the profile
      await supabase.from("users").delete().eq("email", userData.email)
      throw new Error("Failed to create authentication user")
    }

    return { authUser: authData.user, profile: profileData }
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

export async function updateUserRole(userId: string, newRole: "doctor" | "staff" | "patient") {
  try {
    const { data, error } = await supabase.from("users").update({ role: newRole }).eq("id", userId).select().single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error updating user role:", error)
    throw error
  }
}

export async function deleteUser(userId: string) {
  try {
    // Get the user's email first
    const { data: user, error: getUserError } = await supabase.from("users").select("email").eq("id", userId).single()

    if (getUserError) throw getUserError

    // Delete from users table
    const { error: profileError } = await supabase.from("users").delete().eq("id", userId)
    if (profileError) throw profileError

    // Try to delete from auth.users (this might fail if the auth user doesn't exist, which is okay)
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const authUser = authUsers.users.find((u) => u.email === user.email)
      if (authUser) {
        await supabase.auth.admin.deleteUser(authUser.id)
      }
    } catch (authError) {
      console.warn("Could not delete auth user:", authError)
      // This is not critical - the profile is deleted which is most important
    }

    return true
  } catch (error) {
    console.error("Error deleting user:", error)
    throw error
  }
}

// Helper function to clean up orphaned auth users
export async function cleanupOrphanedAuthUsers() {
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const { data: profileUsers } = await supabase.from("users").select("email")

    const profileEmails = new Set(profileUsers?.map((u) => u.email) || [])

    for (const authUser of authUsers.users) {
      if (authUser.email && !profileEmails.has(authUser.email)) {
        console.log("Cleaning up orphaned auth user:", authUser.email)
        await supabase.auth.admin.deleteUser(authUser.id)
      }
    }
  } catch (error) {
    console.error("Error cleaning up orphaned users:", error)
  }
}
