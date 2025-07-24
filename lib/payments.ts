import { supabase } from "./supabase"

export interface Payment {
  id: string
  appointment_id: string
  patient_id: string
  bill_amount: number
  paid_amount: number
  payment_status: "fully_paid" | "partial_paid" | "not_paid"
  payment_method?: string
  payment_date?: string
  notes?: string
  created_at: string
  updated_at: string
  appointment?: {
    appointment_type: string
    appointment_date: string
    appointment_time: string
  }
  patient?: {
    first_name: string
    last_name: string
    email: string
  }
}

export async function createPayment(paymentData: {
  appointmentId: string
  patientId: string
  billAmount: number
  paidAmount: number
  paymentStatus: "fully_paid" | "partial_paid" | "not_paid"
  paymentMethod?: string
  notes?: string
}) {
  try {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        appointment_id: paymentData.appointmentId,
        patient_id: paymentData.patientId,
        bill_amount: paymentData.billAmount,
        paid_amount: paymentData.paidAmount,
        payment_status: paymentData.paymentStatus,
        payment_method: paymentData.paymentMethod || null,
        payment_date: paymentData.paymentStatus !== "not_paid" ? new Date().toISOString() : null,
        notes: paymentData.notes || null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error creating payment:", error)
    throw error
  }
}

export async function updatePayment(
  paymentId: string,
  paymentData: {
    billAmount?: number
    paidAmount?: number
    paymentStatus?: "fully_paid" | "partial_paid" | "not_paid"
    paymentMethod?: string
    notes?: string
  },
) {
  try {
    const updateData: any = {}

    // Map camelCase to snake_case for database columns
    if (paymentData.billAmount !== undefined) {
      updateData.bill_amount = paymentData.billAmount
    }
    if (paymentData.paidAmount !== undefined) {
      updateData.paid_amount = paymentData.paidAmount
    }
    if (paymentData.paymentStatus !== undefined) {
      updateData.payment_status = paymentData.paymentStatus
    }
    if (paymentData.paymentMethod !== undefined) {
      updateData.payment_method = paymentData.paymentMethod
    }
    if (paymentData.notes !== undefined) {
      updateData.notes = paymentData.notes
    }

    // Update payment date if status changes to paid
    if (paymentData.paymentStatus && paymentData.paymentStatus !== "not_paid") {
      updateData.payment_date = new Date().toISOString()
    } else if (paymentData.paymentStatus === "not_paid") {
      updateData.payment_date = null
    }

    const { data, error } = await supabase.from("payments").update(updateData).eq("id", paymentId).select().single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error updating payment:", error)
    throw error
  }
}

export async function getPaymentByAppointmentId(appointmentId: string) {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        appointment:appointment_id(appointment_type, appointment_date, appointment_time),
        patient:patient_id(first_name, last_name, email)
      `)
      .eq("appointment_id", appointmentId)
      .single()

    if (error && error.code !== "PGRST116") throw error
    return data as Payment | null
  } catch (error) {
    console.error("Error fetching payment:", error)
    return null
  }
}

export async function getAllPayments() {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        appointment:appointment_id(appointment_type, appointment_date, appointment_time),
        patient:patient_id(first_name, last_name, email)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data as Payment[]
  } catch (error) {
    console.error("Error fetching payments:", error)
    throw error
  }
}

export async function getPaymentStats() {
  try {
    const { data, error } = await supabase.from("payments").select("bill_amount, paid_amount, payment_status")

    if (error) throw error

    const stats = {
      totalRevenue: 0, // This will now be total paid amount (actual revenue)
      totalPaid: 0,
      totalOutstanding: 0,
      fullyPaidCount: 0,
      partialPaidCount: 0,
      notPaidCount: 0,
    }

    data.forEach((payment) => {
      stats.totalPaid += payment.paid_amount
      stats.totalRevenue = stats.totalPaid // Revenue is what's actually been paid
      stats.totalOutstanding += payment.bill_amount - payment.paid_amount

      switch (payment.payment_status) {
        case "fully_paid":
          stats.fullyPaidCount++
          break
        case "partial_paid":
          stats.partialPaidCount++
          break
        case "not_paid":
          stats.notPaidCount++
          break
      }
    })

    return stats
  } catch (error) {
    console.error("Error fetching payment stats:", error)
    return {
      totalRevenue: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      fullyPaidCount: 0,
      partialPaidCount: 0,
      notPaidCount: 0,
    }
  }
}
