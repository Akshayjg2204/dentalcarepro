import { supabase } from "./supabase"

export interface Lead {
  id: string
  first_name: string
  last_name: string
  phone: string
  assigned_to?: string // Keep for backward compatibility
  assigned_doctor?: string
  assigned_staff?: string
  consultation_reason: string
  status: "pending" | "in_consultation" | "completed" | "converted" | "not_interested" | "cancelled"
  notes?: string
  consultation_date?: string
  consultation_time?: string
  created_at: string
  updated_at: string
  assigned_user?: {
    id: string
    first_name: string
    last_name: string
    role: string
  }
  assigned_doctor_user?: {
    id: string
    first_name: string
    last_name: string
    role: string
  }
  assigned_staff_user?: {
    id: string
    first_name: string
    last_name: string
    role: string
  }
}

export async function getAllLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select(`
      *,
      assigned_user:assigned_to(
        id,
        first_name,
        last_name,
        role
      ),
      assigned_doctor_user:assigned_doctor(
        id,
        first_name,
        last_name,
        role
      ),
      assigned_staff_user:assigned_staff(
        id,
        first_name,
        last_name,
        role
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching leads:", error)
    throw error
  }

  return data || []
}

export async function createLead(leadData: {
  first_name: string
  last_name: string
  phone: string
  assigned_doctor?: string
  assigned_staff?: string
  consultation_reason: string
  consultation_date?: string
  consultation_time?: string
  notes?: string
}): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert([leadData])
    .select(`
      *,
      assigned_doctor_user:assigned_doctor(
        id,
        first_name,
        last_name,
        role
      ),
      assigned_staff_user:assigned_staff(
        id,
        first_name,
        last_name,
        role
      )
    `)
    .single()

  if (error) {
    console.error("Error creating lead:", error)
    throw error
  }

  return data
}

export async function updateLeadStatus(
  leadId: string,
  status: "pending" | "in_consultation" | "completed" | "converted" | "not_interested" | "cancelled",
  notes?: string
): Promise<void> {
  const updateData: any = { status, updated_at: new Date().toISOString() }
  if (notes !== undefined) {
    updateData.notes = notes
  }

  const { error } = await supabase
    .from("leads")
    .update(updateData)
    .eq("id", leadId)

  if (error) {
    console.error("Error updating lead status:", error)
    throw error
  }
}

export async function updateLead(leadId: string, leadData: Partial<Lead>): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ ...leadData, updated_at: new Date().toISOString() })
    .eq("id", leadId)

  if (error) {
    console.error("Error updating lead:", error)
    throw error
  }
}

export async function deleteLead(leadId: string): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)

  if (error) {
    console.error("Error deleting lead:", error)
    throw error
  }
}

export async function convertLeadToUser(
  leadId: string,
  userData: {
    email: string
    password: string
    date_of_birth?: string
    address?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
  }
): Promise<void> {
  // First get the lead data
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single()

  if (leadError) {
    console.error("Error fetching lead:", leadError)
    throw leadError
  }

  // Create user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
  })

  if (authError) {
    console.error("Error creating auth user:", authError)
    throw authError
  }

  if (!authData.user) {
    throw new Error("Failed to create user account")
  }

  // Create user profile
  const { error: profileError } = await supabase
    .from("users")
    .insert([{
      id: authData.user.id,
      email: userData.email,
      first_name: lead.first_name,
      last_name: lead.last_name,
      phone: lead.phone,
      role: "patient",
      date_of_birth: userData.date_of_birth,
      address: userData.address,
      emergency_contact_name: userData.emergency_contact_name,
      emergency_contact_phone: userData.emergency_contact_phone,
    }])

  if (profileError) {
    console.error("Error creating user profile:", profileError)
    throw profileError
  }

  // Update lead status to converted
  await updateLeadStatus(leadId, "converted", "Converted to user account")
}
