import { supabase } from "@/lib/supabase"

export interface CustomBill {
  id: string
  patient_id: string
  bill_name: string
  bill_date: string
  bill_amount: number
  paid_amount: number
  payment_method?: string
  assigned_to?: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateCustomBillData {
  patient_id: string
  bill_name: string
  bill_date: string
  bill_amount: number
  paid_amount: number
  payment_method?: string | null
  assigned_to?: string | null
  notes?: string | null
  created_by: string
}

export async function createCustomBill(billData: CreateCustomBillData): Promise<CustomBill> {
  const { data, error } = await supabase.from("custom_bills").insert([billData]).select().single()

  if (error) {
    console.error("Error creating custom bill:", error)
    throw new Error(`Failed to create custom bill: ${error.message}`)
  }

  return data
}

export async function getCustomBillsByPatient(patientId: string): Promise<CustomBill[]> {
  const { data, error } = await supabase
    .from("custom_bills")
    .select("*")
    .eq("patient_id", patientId)
    .order("bill_date", { ascending: false })

  if (error) {
    console.error("Error fetching custom bills:", error)
    throw new Error(`Failed to fetch custom bills: ${error.message}`)
  }

  return data || []
}

export async function updateCustomBillPayment(
  billId: string,
  updates: {
    paid_amount?: number
    payment_method?: string
    notes?: string
  },
): Promise<CustomBill> {
  console.log("[v0] updateCustomBillPayment called with:", { billId, updates })

  const { data, error } = await supabase
    .from("custom_bills")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", billId)
    .select()
    .single()

  if (error) {
    console.error("Error updating custom bill payment:", error)
    throw new Error(`Failed to update custom bill payment: ${error.message}`)
  }

  console.log("[v0] Custom bill payment updated successfully:", data)
  return data
}

export async function deleteCustomBill(billId: string): Promise<void> {
  console.log("[v0] deleteCustomBill called with ID:", billId)

  const { data, error } = await supabase.from("custom_bills").delete().eq("id", billId).select()

  if (error) {
    console.error("[v0] Error deleting custom bill:", error)
    throw new Error(`Failed to delete custom bill: ${error.message}`)
  }

  if (!data || data.length === 0) {
    console.error("[v0] No record was deleted - bill may not exist")
    throw new Error("Custom bill not found or already deleted")
  }

  console.log("[v0] Custom bill deleted successfully from database:", data[0])
}
