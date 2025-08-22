import { supabase } from "./supabase-client"

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: "admin" | "doctor" | "staff"
  phone?: string
  created_at: string
  updated_at: string
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching users:", error)
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error("Error in getAllUsers:", error)
    throw error
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching user:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getUserById:", error)
    return null
  }
}

export async function getUsersByRole(role: "admin" | "doctor" | "staff"): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", role)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching users by role:", error)
      throw new Error(`Failed to fetch users by role: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error("Error in getUsersByRole:", error)
    throw error
  }
}
