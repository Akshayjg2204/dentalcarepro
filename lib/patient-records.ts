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
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        role,
        date_of_birth,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        medical_conditions,
        allergies,
        dental_history,
        created_at,
        updated_at
      `)
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
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        role,
        date_of_birth,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        medical_conditions,
        allergies,
        dental_history,
        created_at,
        updated_at
      `)
      .eq("id", patientId)
      .eq("role", "patient")
      .single()

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
    // Filter out any undefined values and only include valid columns
    const validUpdates: any = {}

    // Basic fields
    if (updates.first_name !== undefined) validUpdates.first_name = updates.first_name
    if (updates.last_name !== undefined) validUpdates.last_name = updates.last_name
    if (updates.email !== undefined) validUpdates.email = updates.email
    if (updates.phone !== undefined) validUpdates.phone = updates.phone
    if (updates.date_of_birth !== undefined) validUpdates.date_of_birth = updates.date_of_birth
    if (updates.address !== undefined) validUpdates.address = updates.address

    // Emergency contact fields
    if (updates.emergency_contact_name !== undefined)
      validUpdates.emergency_contact_name = updates.emergency_contact_name
    if (updates.emergency_contact_phone !== undefined)
      validUpdates.emergency_contact_phone = updates.emergency_contact_phone

    // Medical fields - ensure they exist in the database
    if (updates.medical_conditions !== undefined) validUpdates.medical_conditions = updates.medical_conditions
    if (updates.allergies !== undefined) validUpdates.allergies = updates.allergies
    if (updates.dental_history !== undefined) validUpdates.dental_history = updates.dental_history

    // Always update the timestamp
    validUpdates.updated_at = new Date().toISOString()

    console.log("Updating patient with data:", validUpdates)

    const { data, error } = await supabase
      .from("users")
      .update(validUpdates)
      .eq("id", patientId)
      .eq("role", "patient")
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        role,
        date_of_birth,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        medical_conditions,
        allergies,
        dental_history,
        created_at,
        updated_at
      `)
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
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        role,
        date_of_birth,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        medical_conditions,
        allergies,
        dental_history,
        created_at,
        updated_at
      `)
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
