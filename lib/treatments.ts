import { supabase } from "./supabase-client"

export interface Treatment {
  id: string
  name: string
  description?: string
  default_cost: number
  duration_minutes: number
  category?: string
  created_at: string
  updated_at: string
}

export interface BillingRecord {
  id: string
  patient_id: string
  appointment_id?: string
  description: string
  amount: number
  status: "pending" | "paid" | "cancelled"
  payment_method?: "cash" | "card" | "insurance" | "other"
  payment_date?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface BillingRecordWithPatient extends BillingRecord {
  patient_name: string
  patient_email: string
  patient_phone?: string
  amount_paid?: number // Added amount_paid field
  isCustomBill?: boolean // Added isCustomBill flag
  payment_status?: "pending" | "partial" | "paid" // Added payment_status field for consistency with UI
}

export interface AppointmentBill {
  appointment_id: string
  patient_id: string
  treatments: {
    treatment_id: string
    treatment_name: string
    price: number
    quantity: number
  }[]
  total_amount: number
  payment_method?: string
  notes?: string
  created_by?: string // Added created_by to AppointmentBill type
}

// Get all treatments
export async function getTreatments(): Promise<Treatment[]> {
  try {
    const { data, error } = await supabase.from("treatments").select("*").order("name")

    if (error) {
      console.error("Error fetching treatments:", error)
      throw new Error(`Failed to fetch treatments: ${error.message}`)
    }

    return data || []
  } catch (error: any) {
    console.error("Error in getTreatments:", error)
    throw error
  }
}

// Get treatment by ID
export async function getTreatmentById(id: string): Promise<Treatment | null> {
  try {
    const { data, error } = await supabase.from("treatments").select("*").eq("id", id).single()

    if (error) {
      if (error.code === "PGRST116") {
        return null // Treatment not found
      }
      console.error("Error fetching treatment:", error)
      throw new Error(`Failed to fetch treatment: ${error.message}`)
    }

    return data
  } catch (error: any) {
    console.error("Error in getTreatmentById:", error)
    throw error
  }
}

// Create a new treatment
export async function createTreatment(
  treatment: Omit<Treatment, "id" | "created_at" | "updated_at">,
): Promise<Treatment> {
  try {
    const { data, error } = await supabase.from("treatments").insert([treatment]).select().single()

    if (error) {
      console.error("Error creating treatment:", error)
      throw new Error(`Failed to create treatment: ${error.message}`)
    }

    return data
  } catch (error: any) {
    console.error("Error in createTreatment:", error)
    throw error
  }
}

// Update a treatment
export async function updateTreatment(id: string, updates: Partial<Treatment>): Promise<Treatment> {
  try {
    const { data, error } = await supabase.from("treatments").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating treatment:", error)
      throw new Error(`Failed to update treatment: ${error.message}`)
    }

    return data
  } catch (error: any) {
    console.error("Error in updateTreatment:", error)
    throw error
  }
}

// Delete a treatment (hard delete since no is_active column exists)
export async function deleteTreatment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("treatments").delete().eq("id", id)

    if (error) {
      console.error("Error deleting treatment:", error)
      throw new Error(`Failed to delete treatment: ${error.message}`)
    }

    return true
  } catch (error: any) {
    console.error("Error in deleteTreatment:", error)
    throw error
  }
}

// Create a billing record
export async function createBillingRecord(billingData: {
  patient_id: string
  appointment_id?: string
  description: string
  amount: number
  payment_method?: string
  notes?: string
  created_by?: string // Added optional created_by parameter
}): Promise<string> {
  try {
    console.log("Creating billing record with data:", billingData)

    // Use the database function to create billing record
    const { data, error } = await supabase.rpc("create_billing_record", {
      p_patient_id: billingData.patient_id,
      p_appointment_id: billingData.appointment_id || null,
      p_description: billingData.description,
      p_amount: billingData.amount,
      p_payment_method: billingData.payment_method || null,
      p_notes: billingData.notes || null,
      p_created_by: billingData.created_by || null, // Pass created_by parameter
    })

    if (error) {
      console.error("Error creating billing record:", error)
      throw new Error(`Failed to create billing record: ${error.message}`)
    }

    if (!data) {
      throw new Error("No billing record ID returned")
    }

    console.log("Billing record created successfully with ID:", data)
    return data
  } catch (error: any) {
    console.error("Error in createBillingRecord:", error)
    throw error
  }
}

// Update billing record payment
export async function updateBillingPayment(
  billingId: string,
  paymentMethod: string,
  status: "paid" | "cancelled" = "paid",
): Promise<boolean> {
  try {
    console.log("Updating billing payment:", { billingId, paymentMethod, status })

    // Use the database function to update payment
    const { data, error } = await supabase.rpc("update_billing_payment", {
      p_billing_id: billingId,
      p_payment_method: paymentMethod,
      p_status: status,
    })

    if (error) {
      console.error("Error updating billing payment:", error)
      throw new Error(`Failed to update billing payment: ${error.message}`)
    }

    if (!data) {
      throw new Error("Failed to update billing record")
    }

    console.log("Billing payment updated successfully")
    return true
  } catch (error: any) {
    console.error("Error in updateBillingPayment:", error)
    throw error
  }
}

// Get billing records for a patient (including custom bills)
export async function getBillingRecords(
  patientId: string,
  forceRefresh?: boolean,
): Promise<BillingRecordWithPatient[]> {
  try {
    console.log(`[v0] getBillingRecords called for patient ${patientId}, forceRefresh: ${forceRefresh}`)

    // Fetch regular billing records
    const { data: billingRecords, error: billingError } = await supabase
      .from("billing_records_with_patient")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })

    if (billingError) {
      console.error("Error fetching billing records:", billingError)
      throw new Error(`Failed to fetch billing records: ${billingError.message}`)
    }

    const regularBillingRecords: BillingRecordWithPatient[] = (billingRecords || []).map((record) => ({
      ...record,
      isCustomBill: false, // Explicitly mark regular billing records as not custom bills
    }))

    // Fetch custom bills with timestamp to force refresh
    const query = supabase
      .from("custom_bills")
      .select(`
        *,
        patient:users!patient_id(first_name, last_name, email, phone)
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })

    // Add timestamp to force fresh query when needed
    if (forceRefresh) {
      query.limit(1000) // Add a limit to force query execution
    }

    const { data: customBills, error: customBillsError } = await query

    if (customBillsError) {
      console.error("Error fetching custom bills:", customBillsError)
      // Don't throw error for custom bills, just log it
    }

    console.log(`[v0] Fetched ${customBills?.length || 0} custom bills for patient ${patientId}`)

    // Transform custom bills to match BillingRecordWithPatient interface
    const transformedCustomBills: BillingRecordWithPatient[] = (customBills || []).map((bill) => {
      const paidAmount = bill.paid_amount || 0
      const billAmount = bill.bill_amount || 0
      let paymentStatus: "pending" | "paid" | "cancelled"

      if (paidAmount === 0) {
        paymentStatus = "pending"
      } else if (paidAmount >= billAmount) {
        paymentStatus = "paid"
      } else {
        paymentStatus = "pending" // Partial payments still show as pending for custom bills
      }

      return {
        id: bill.id,
        patient_id: bill.patient_id,
        appointment_id: null, // Custom bills are not tied to appointments
        description: bill.bill_name,
        amount: bill.bill_amount,
        status: paymentStatus,
        payment_method: bill.payment_method as "cash" | "card" | "insurance" | "other" | undefined,
        payment_date: paidAmount >= billAmount ? bill.updated_at : undefined,
        notes: bill.notes || undefined,
        created_by: bill.created_by,
        created_at: bill.created_at,
        updated_at: bill.updated_at,
        patient_name: bill.patient ? `${bill.patient.first_name} ${bill.patient.last_name}` : "Unknown Patient",
        patient_email: bill.patient?.email || "",
        patient_phone: bill.patient?.phone || undefined,
        amount_paid: bill.paid_amount,
        isCustomBill: true, // Added flag to identify custom bills
        payment_status: paidAmount >= billAmount ? "paid" : paidAmount > 0 ? "partial" : "pending",
      }
    })

    const allRecords = [...regularBillingRecords, ...transformedCustomBills]
    allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log(`[v0] Returning ${allRecords.length} total billing records`)
    return allRecords
  } catch (error: any) {
    console.error("Error in getBillingRecords:", error)
    throw error
  }
}

// Get all billing records (for admin/staff)
export async function getAllBillingRecords(): Promise<BillingRecordWithPatient[]> {
  try {
    const { data, error } = await supabase
      .from("billing_records_with_patient")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching all billing records:", error)
      throw new Error(`Failed to fetch billing records: ${error.message}`)
    }

    return data || []
  } catch (error: any) {
    console.error("Error in getAllBillingRecords:", error)
    throw error
  }
}

// Create appointment bill with multiple treatments
export async function createAppointmentBill(billData: AppointmentBill & { created_by?: string }): Promise<string> {
  // Added created_by to AppointmentBill type
  try {
    console.log("Creating appointment bill:", billData)

    const treatments = billData.treatments || []

    // Create a description from treatments
    const treatmentDescriptions =
      treatments.length > 0
        ? treatments.map((t) => `${t.treatment_name} (${t.quantity}x $${t.price})`).join(", ")
        : "General appointment"

    const description =
      treatments.length > 0 ? `Appointment treatments: ${treatmentDescriptions}` : "Appointment completed"

    // Create the billing record
    const billingId = await createBillingRecord({
      patient_id: billData.patient_id,
      appointment_id: billData.appointment_id,
      description,
      amount: billData.total_amount,
      payment_method: billData.payment_method,
      notes: billData.notes,
      created_by: billData.created_by, // Pass created_by to createBillingRecord
    })

    console.log("Appointment bill created successfully with ID:", billingId)
    return billingId
  } catch (error: any) {
    console.error("Error in createAppointmentBill:", error)
    throw error
  }
}

// Get billing record by ID
export async function getBillingRecordById(id: string): Promise<BillingRecordWithPatient | null> {
  try {
    const { data, error } = await supabase.from("billing_records_with_patient").select("*").eq("id", id).single()

    if (error) {
      if (error.code === "PGRST116") {
        return null // Record not found
      }
      console.error("Error fetching billing record:", error)
      throw new Error(`Failed to fetch billing record: ${error.message}`)
    }

    return data
  } catch (error: any) {
    console.error("Error in getBillingRecordById:", error)
    throw error
  }
}

// Get billing records by appointment ID
export async function getBillingRecordsByAppointment(appointmentId: string): Promise<BillingRecordWithPatient[]> {
  try {
    const { data, error } = await supabase
      .from("billing_records_with_patient")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching billing records by appointment:", error)
      throw new Error(`Failed to fetch billing records: ${error.message}`)
    }

    return data || []
  } catch (error: any) {
    console.error("Error in getBillingRecordsByAppointment:", error)
    throw error
  }
}

// Cancel billing record
export async function cancelBillingRecord(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("billing_records").update({ status: "cancelled" }).eq("id", id)

    if (error) {
      console.error("Error cancelling billing record:", error)
      throw new Error(`Failed to cancel billing record: ${error.message}`)
    }

    return true
  } catch (error: any) {
    console.error("Error in cancelBillingRecord:", error)
    throw error
  }
}
