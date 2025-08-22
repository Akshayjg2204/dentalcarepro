import { supabase } from "./supabase"

export interface Payment {
  id: string
  patient_id: string
  appointment_id?: string
  bill_description: string // This will be mapped from treatment_type
  bill_amount: number
  paid_amount: number
  payment_status: "not_paid" | "partial_paid" | "fully_paid"
  payment_method?: string
  payment_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

export async function getPatientPayments(patientId: string): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        id,
        patient_id,
        appointment_id,
        treatment_type,
        bill_amount,
        paid_amount,
        payment_status,
        payment_method,
        payment_date,
        notes,
        created_at,
        updated_at
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching patient payments:", error)
      throw new Error(`Failed to fetch payments: ${error.message}`)
    }

    const mappedData = (data || []).map((payment) => ({
      ...payment,
      bill_description: payment.treatment_type || "Payment",
      treatment_type: undefined, // Remove the original field
    }))

    return mappedData
  } catch (error) {
    console.error("Error in getPatientPayments:", error)
    throw error
  }
}

export async function createCustomBill(
  patientId: string,
  billDescription: string,
  billAmount: number,
  initialPayment = 0,
  paymentMethod?: string,
  notes?: string,
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("create_custom_bill", {
      patient_id_param: patientId,
      bill_description_param: billDescription,
      bill_amount_param: billAmount,
      initial_payment_param: initialPayment,
      payment_method_param: paymentMethod,
      notes_param: notes,
    })

    if (error) {
      console.error("Error creating custom bill:", error)
      throw new Error(`Failed to create bill: ${error.message}`)
    }

    return data[0]?.payment_id
  } catch (error) {
    console.error("Error in createCustomBill:", error)
    throw error
  }
}

export async function updatePaymentAmount(
  paymentId: string,
  newPaidAmount: number,
  paymentMethod?: string,
  notes?: string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("update_payment_amount", {
      payment_id: paymentId,
      new_paid_amount: newPaidAmount,
      new_payment_method: paymentMethod,
      new_notes: notes,
    })

    if (error) {
      console.error("Error updating payment amount:", error)
      throw new Error(`Failed to update payment: ${error.message}`)
    }
  } catch (error) {
    console.error("Error in updatePaymentAmount:", error)
    throw error
  }
}

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        id,
        patient_id,
        appointment_id,
        treatment_type,
        bill_amount,
        paid_amount,
        payment_status,
        payment_method,
        payment_date,
        notes,
        created_at,
        updated_at
      `)
      .eq("id", paymentId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return null // Payment not found
      }
      console.error("Error fetching payment:", error)
      throw new Error(`Failed to fetch payment: ${error.message}`)
    }

    return {
      ...data,
      bill_description: data.treatment_type || "Payment",
    }
  } catch (error) {
    console.error("Error in getPaymentById:", error)
    throw error
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case "fully_paid":
      return "text-green-600 bg-green-50"
    case "partial_paid":
      return "text-yellow-600 bg-yellow-50"
    case "not_paid":
      return "text-red-600 bg-red-50"
    default:
      return "text-gray-600 bg-gray-50"
  }
}

export function formatPaymentStatus(status: string): string {
  switch (status) {
    case "fully_paid":
      return "Fully Paid"
    case "partial_paid":
      return "Partially Paid"
    case "not_paid":
      return "Not Paid"
    default:
      return status
  }
}

export function calculateOutstandingBalance(payments: Payment[]): number {
  return payments.reduce((total, payment) => {
    const outstanding = payment.bill_amount - payment.paid_amount
    return total + outstanding
  }, 0)
}
