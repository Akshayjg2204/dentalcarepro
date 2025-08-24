import { supabase } from "./supabase"

export interface Lead {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone: string
  source?: string
  status: "new" | "contacted" | "qualified" | "converted" | "not_interested"
  consultation_reason: string
  consultation_date?: string
  consultation_time?: string
  assigned_doctor?: string
  assigned_staff?: string
  notes?: string
  created_at: string
  updated_at?: string
  assigned_doctor_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  assigned_staff_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export async function getAllLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select(`
        *,
        assigned_doctor_user:users!leads_assigned_doctor_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        assigned_staff_user:users!leads_assigned_staff_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching leads:", error)
      return []
    }

    return (data || []).map((lead) => ({
      id: lead.id,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      consultation_reason: lead.consultation_reason,
      consultation_date: lead.consultation_date,
      consultation_time: lead.consultation_time,
      assigned_doctor: lead.assigned_doctor,
      assigned_staff: lead.assigned_staff,
      notes: lead.notes,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      assigned_doctor_user: lead.assigned_doctor_user
        ? {
            id: lead.assigned_doctor_user.id,
            first_name: lead.assigned_doctor_user.first_name,
            last_name: lead.assigned_doctor_user.last_name,
            email: lead.assigned_doctor_user.email,
          }
        : undefined,
      assigned_staff_user: lead.assigned_staff_user
        ? {
            id: lead.assigned_staff_user.id,
            first_name: lead.assigned_staff_user.first_name,
            last_name: lead.assigned_staff_user.last_name,
            email: lead.assigned_staff_user.email,
          }
        : undefined,
    }))
  } catch (error) {
    console.error("Error in getAllLeads:", error)
    return []
  }
}

export async function getLeadsByAssignedUser(userId: string): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select(`
        *,
        assigned_doctor_user:users!leads_assigned_doctor_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        assigned_staff_user:users!leads_assigned_staff_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .or(`assigned_staff.eq.${userId},assigned_doctor.eq.${userId}`)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching leads by assigned user:", error)
      return []
    }

    return (data || []).map((lead) => ({
      id: lead.id,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      consultation_reason: lead.consultation_reason,
      consultation_date: lead.consultation_date,
      consultation_time: lead.consultation_time,
      assigned_doctor: lead.assigned_doctor,
      assigned_staff: lead.assigned_staff,
      notes: lead.notes,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      assigned_doctor_user: lead.assigned_doctor_user
        ? {
            id: lead.assigned_doctor_user.id,
            first_name: lead.assigned_doctor_user.first_name,
            last_name: lead.assigned_doctor_user.last_name,
            email: lead.assigned_doctor_user.email,
          }
        : undefined,
      assigned_staff_user: lead.assigned_staff_user
        ? {
            id: lead.assigned_staff_user.id,
            first_name: lead.assigned_staff_user.first_name,
            last_name: lead.assigned_staff_user.last_name,
            email: lead.assigned_staff_user.email,
          }
        : undefined,
    }))
  } catch (error) {
    console.error("Error in getLeadsByAssignedUser:", error)
    return []
  }
}

export async function createLead(leadData: {
  first_name: string
  last_name: string
  phone: string
  consultation_reason: string
  assigned_doctor?: string
  assigned_staff?: string
  consultation_date?: string
  consultation_time?: string
  notes?: string
}) {
  try {
    const insertData: any = {
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      phone: leadData.phone,
      consultation_reason: leadData.consultation_reason,
      status: "new", // Default status matching updated database schema
    }

    // Add optional fields if provided
    if (leadData.assigned_doctor) {
      insertData.assigned_doctor = leadData.assigned_doctor
    }

    if (leadData.assigned_staff) {
      insertData.assigned_staff = leadData.assigned_staff
    }

    if (leadData.consultation_date) {
      insertData.consultation_date = leadData.consultation_date
    }

    if (leadData.consultation_time) {
      insertData.consultation_time = leadData.consultation_time
    }

    if (leadData.notes) {
      insertData.notes = leadData.notes
    }

    const { data, error } = await supabase.from("leads").insert([insertData]).select().single()

    if (error) {
      console.error("Error creating lead:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("Error in createLead:", error)
    return { success: false, error: error.message }
  }
}

export async function updateLeadStatus(
  leadId: string,
  status: "new" | "contacted" | "qualified" | "converted" | "not_interested",
  notes?: string,
) {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (notes) {
      updateData.notes = notes
    }

    const { data, error } = await supabase.from("leads").update(updateData).eq("id", leadId).select().single()

    if (error) {
      console.error("Error updating lead status:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("Error in updateLeadStatus:", error)
    return { success: false, error: error.message }
  }
}

export async function assignLead(leadId: string, assignedTo: string) {
  try {
    const { data, error } = await supabase
      .from("leads")
      .update({
        assigned_to: assignedTo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select()
      .single()

    if (error) {
      console.error("Error assigning lead:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("Error in assignLead:", error)
    return { success: false, error: error.message }
  }
}

export async function convertLeadToUser(leadId: string) {
  try {
    // First, get the lead data
    const { data: leadData, error: leadError } = await supabase.from("leads").select("*").eq("id", leadId).single()

    if (leadError || !leadData) {
      console.error("Error fetching lead:", leadError)
      return { success: false, error: "Lead not found" }
    }

    // Check if user already exists with this email
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("email", leadData.email)
      .maybeSingle()

    if (userCheckError) {
      console.error("Error checking existing user:", userCheckError)
      return { success: false, error: userCheckError.message }
    }

    if (existingUser) {
      return { success: false, error: "User with this email already exists" }
    }

    // Create new patient user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert([
        {
          first_name: leadData.first_name,
          last_name: leadData.last_name,
          email: leadData.email,
          phone: leadData.phone,
          role: "patient",
        },
      ])
      .select()
      .single()

    if (createError) {
      console.error("Error creating user:", createError)
      return { success: false, error: createError.message }
    }

    // Update lead status to converted
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status: "converted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)

    if (updateError) {
      console.error("Error updating lead status:", updateError)
      // Don't return error here as user was created successfully
    }

    return { success: true, data: newUser }
  } catch (error: any) {
    console.error("Error in convertLeadToUser:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteLead(leadId: string) {
  try {
    const { error } = await supabase.from("leads").delete().eq("id", leadId)

    if (error) {
      console.error("Error deleting lead:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error in deleteLead:", error)
    return { success: false, error: error.message }
  }
}
