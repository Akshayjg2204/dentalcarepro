import { supabase } from "./supabase"

export interface PatientRecord {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: string
  date_of_birth: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  medical_conditions: string | null
  allergies: string | null
  dental_history: string | null
  created_at: string
  updated_at: string | null
}

export async function getAllPatientRecords(): Promise<PatientRecord[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "patient")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching patient records:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Failed to fetch patient records:", error)
    throw error
  }
}

export async function getPatientRecord(patientId: string): Promise<PatientRecord> {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("id", patientId).eq("role", "patient").single()

    if (error) {
      console.error("Error fetching patient record:", error)
      throw error
    }

    if (!data) {
      throw new Error("Patient not found")
    }

    return data
  } catch (error) {
    console.error("Failed to fetch patient record:", error)
    throw error
  }
}

export async function updatePatientRecord(patientId: string, updates: Partial<PatientRecord>): Promise<PatientRecord> {
  try {
    const { data, error } = await supabase
      .from("users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", patientId)
      .eq("role", "patient")
      .select()
      .single()

    if (error) {
      console.error("Error updating patient record:", error)
      throw error
    }

    if (!data) {
      throw new Error("Failed to update patient record")
    }

    return data
  } catch (error) {
    console.error("Failed to update patient record:", error)
    throw error
  }
}

export async function searchPatientRecords(searchTerm: string): Promise<PatientRecord[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "patient")
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error searching patient records:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Failed to search patient records:", error)
    throw error
  }
}
