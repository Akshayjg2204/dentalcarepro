import { supabase } from "./supabase"

export interface Payment {
  id: string
  appointment_id: string
  patient_id: string
  bill_amount: number
  paid_amount: number
  payment_status: "not_paid" | "partial_paid" | "fully_paid"
  payment_method?: string
  payment_date?: string
  notes?: string
  created_at: string
  updated_at?: string
  appointment?: {
    id: string
    appointment_date: string
    appointment_time: string
    appointment_type: string
    status: string
    patient?: {
      id: string
      first_name: string
      last_name: string
      email: string
      phone?: string
    }
  }
}

export interface PaymentStats {
  totalRevenue: number
  totalPaid: number
  totalOutstanding: number
  fullyPaidCount: number
  partialPaidCount: number
  notPaidCount: number
}

export interface CreateCustomBillData {
  patient_id: string
  bill_description: string
  bill_amount: number
  initial_payment: number
  payment_method?: string
  notes?: string
}

export interface PaymentUpdateData {
  paid_amount: number
  payment_method?: string
  notes?: string
}

export async function getAllPayments(): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        appointment:appointments(
          id,
          appointment_date,
          appointment_time,
          appointment_type,
          status,
          patient:users!appointments_patient_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching payments:", error)
      return []
    }

    return (data || []).map((payment) => ({
      id: payment.id,
      appointment_id: payment.appointment_id,
      patient_id: payment.patient_id,
      bill_amount: payment.bill_amount,
      paid_amount: payment.paid_amount,
      payment_status: payment.payment_status,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date,
      notes: payment.notes,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      appointment: payment.appointment
        ? {
            id: payment.appointment.id,
            appointment_date: payment.appointment.appointment_date,
            appointment_time: payment.appointment.appointment_time,
            appointment_type: payment.appointment.appointment_type,
            status: payment.appointment.status,
            patient: payment.appointment.patient
              ? {
                  id: payment.appointment.patient.id,
                  first_name: payment.appointment.patient.first_name,
                  last_name: payment.appointment.patient.last_name,
                  email: payment.appointment.patient.email,
                  phone: payment.appointment.patient.phone,
                }
              : undefined,
          }
        : undefined,
    }))
  } catch (error) {
    console.error("Error in getAllPayments:", error)
    return []
  }
}

export async function getPaymentByAppointmentId(appointmentId: string): Promise<Payment | null> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        appointment:appointments(
          id,
          appointment_date,
          appointment_time,
          appointment_type,
          status,
          patient:users!appointments_patient_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .eq("appointment_id", appointmentId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // No payment found
        return null
      }
      console.error("Error fetching payment:", error)
      return null
    }

    return {
      id: data.id,
      appointment_id: data.appointment_id,
      patient_id: data.patient_id,
      bill_amount: data.bill_amount,
      paid_amount: data.paid_amount,
      payment_status: data.payment_status,
      payment_method: data.payment_method,
      payment_date: data.payment_date,
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
      appointment: data.appointment
        ? {
            id: data.appointment.id,
            appointment_date: data.appointment.appointment_date,
            appointment_time: data.appointment.appointment_time,
            appointment_type: data.appointment.appointment_type,
            status: data.appointment.status,
            patient: data.appointment.patient
              ? {
                  id: data.appointment.patient.id,
                  first_name: data.appointment.patient.first_name,
                  last_name: data.appointment.patient.last_name,
                  email: data.appointment.patient.email,
                  phone: data.appointment.patient.phone,
                }
              : undefined,
          }
        : undefined,
    }
  } catch (error) {
    console.error("Error in getPaymentByAppointmentId:", error)
    return null
  }
}

export async function createPayment(paymentData: {
  appointmentId: string
  patientId: string
  billAmount: number
  paidAmount: number
  paymentMethod?: string
  notes?: string
}): Promise<{ success: boolean; data?: Payment; error?: string }> {
  try {
    // Calculate payment status
    let paymentStatus: "not_paid" | "partial_paid" | "fully_paid"
    if (paymentData.paidAmount === 0) {
      paymentStatus = "not_paid"
    } else if (paymentData.paidAmount >= paymentData.billAmount) {
      paymentStatus = "fully_paid"
    } else {
      paymentStatus = "partial_paid"
    }

    const { data, error } = await supabase
      .from("payments")
      .insert([
        {
          appointment_id: paymentData.appointmentId,
          patient_id: paymentData.patientId,
          bill_amount: paymentData.billAmount,
          paid_amount: paymentData.paidAmount,
          payment_status: paymentStatus,
          payment_method: paymentData.paymentMethod,
          payment_date: paymentData.paidAmount > 0 ? new Date().toISOString() : null,
          notes: paymentData.notes,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating payment:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Payment }
  } catch (error: any) {
    console.error("Error in createPayment:", error)
    return { success: false, error: error.message }
  }
}

export async function updatePayment(
  paymentId: string,
  updates: {
    billAmount?: number
    paidAmount?: number
    paymentMethod?: string
    notes?: string
  },
): Promise<{ success: boolean; data?: Payment; error?: string }> {
  try {
    // First get the current payment to calculate new status
    const { data: currentPayment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single()

    if (fetchError) {
      console.error("Error fetching current payment:", fetchError)
      return { success: false, error: fetchError.message }
    }

    // Calculate new values
    const newBillAmount = updates.billAmount ?? currentPayment.bill_amount
    const newPaidAmount = updates.paidAmount ?? currentPayment.paid_amount

    // Calculate payment status
    let paymentStatus: "not_paid" | "partial_paid" | "fully_paid"
    if (newPaidAmount === 0) {
      paymentStatus = "not_paid"
    } else if (newPaidAmount >= newBillAmount) {
      paymentStatus = "fully_paid"
    } else {
      paymentStatus = "partial_paid"
    }

    // Prepare update data
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    }

    if (updates.billAmount !== undefined) {
      updateData.bill_amount = updates.billAmount
    }

    if (updates.paidAmount !== undefined) {
      updateData.paid_amount = updates.paidAmount
      // Update payment date if paid amount is being set and is greater than 0
      if (updates.paidAmount > 0 && currentPayment.paid_amount === 0) {
        updateData.payment_date = new Date().toISOString()
      }
    }

    if (updates.paymentMethod !== undefined) {
      updateData.payment_method = updates.paymentMethod
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes
    }

    // Update the payment
    const { data, error } = await supabase.from("payments").update(updateData).eq("id", paymentId).select().single()

    if (error) {
      console.error("Error updating payment:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Payment }
  } catch (error: any) {
    console.error("Error in updatePayment:", error)
    return { success: false, error: error.message }
  }
}

export async function deletePayment(paymentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("payments").delete().eq("id", paymentId)

    if (error) {
      console.error("Error deleting payment:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error in deletePayment:", error)
    return { success: false, error: error.message }
  }
}

export async function getPaymentStats(): Promise<PaymentStats> {
  try {
    const [paymentsResult, customBillsResult] = await Promise.all([
      supabase.from("payments").select("bill_amount, paid_amount, payment_status"),
      supabase.from("custom_bills").select("bill_amount, paid_amount"),
    ])

    if (paymentsResult.error) {
      console.error("Error fetching payment stats:", paymentsResult.error)
    }

    if (customBillsResult.error) {
      console.error("Error fetching custom bills stats:", customBillsResult.error)
    }

    const payments = paymentsResult.data || []
    const customBills = customBillsResult.data || []

    // Calculate stats from regular payments
    const paymentStats = payments.reduce(
      (acc, payment) => {
        acc.totalRevenue += payment.bill_amount
        acc.totalPaid += payment.paid_amount
        acc.totalOutstanding += payment.bill_amount - payment.paid_amount

        switch (payment.payment_status) {
          case "fully_paid":
            acc.fullyPaidCount++
            break
          case "partial_paid":
            acc.partialPaidCount++
            break
          case "not_paid":
            acc.notPaidCount++
            break
        }

        return acc
      },
      {
        totalRevenue: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        fullyPaidCount: 0,
        partialPaidCount: 0,
        notPaidCount: 0,
      },
    )

    // Calculate stats from custom bills
    const customBillStats = customBills.reduce(
      (acc, bill) => {
        const amountPaid = bill.paid_amount || 0
        acc.totalRevenue += bill.bill_amount
        acc.totalPaid += amountPaid
        acc.totalOutstanding += bill.bill_amount - amountPaid

        // Determine payment status for custom bills
        if (amountPaid === 0) {
          acc.notPaidCount++
        } else if (amountPaid >= bill.bill_amount) {
          acc.fullyPaidCount++
        } else {
          acc.partialPaidCount++
        }

        return acc
      },
      {
        totalRevenue: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        fullyPaidCount: 0,
        partialPaidCount: 0,
        notPaidCount: 0,
      },
    )

    return {
      totalRevenue: paymentStats.totalRevenue + customBillStats.totalRevenue,
      totalPaid: paymentStats.totalPaid + customBillStats.totalPaid,
      totalOutstanding: paymentStats.totalOutstanding + customBillStats.totalOutstanding,
      fullyPaidCount: paymentStats.fullyPaidCount + customBillStats.fullyPaidCount,
      partialPaidCount: paymentStats.partialPaidCount + customBillStats.partialPaidCount,
      notPaidCount: paymentStats.notPaidCount + customBillStats.notPaidCount,
    }
  } catch (error) {
    console.error("Error in getPaymentStats:", error)
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

export async function getPatientPayments(patientId: string): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        appointment:appointments(
          id,
          appointment_date,
          appointment_time,
          appointment_type,
          status
        )
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching patient payments:", error)
      return []
    }

    return (data || []).map((payment) => ({
      id: payment.id,
      appointment_id: payment.appointment_id,
      patient_id: payment.patient_id,
      bill_amount: payment.bill_amount,
      paid_amount: payment.paid_amount,
      payment_status: payment.payment_status,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date,
      notes: payment.notes,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      appointment: payment.appointment
        ? {
            id: payment.appointment.id,
            appointment_date: payment.appointment.appointment_date,
            appointment_time: payment.appointment.appointment_time,
            appointment_type: payment.appointment.appointment_type,
            status: payment.appointment.status,
          }
        : undefined,
    }))
  } catch (error) {
    console.error("Error in getPatientPayments:", error)
    return []
  }
}

export async function createCustomBill(
  data: CreateCustomBillData,
): Promise<{ success: boolean; data?: Payment; error?: string }> {
  try {
    // Calculate payment status
    let paymentStatus: "not_paid" | "partial_paid" | "fully_paid"
    if (data.initial_payment === 0) {
      paymentStatus = "not_paid"
    } else if (data.initial_payment >= data.bill_amount) {
      paymentStatus = "fully_paid"
    } else {
      paymentStatus = "partial_paid"
    }

    const { data: paymentData, error } = await supabase
      .from("payments")
      .insert([
        {
          patient_id: data.patient_id,
          appointment_id: null, // Custom bills are not tied to appointments
          bill_amount: data.bill_amount,
          paid_amount: data.initial_payment,
          payment_status: paymentStatus,
          payment_method: data.payment_method,
          payment_date: data.initial_payment > 0 ? new Date().toISOString() : null,
          notes: data.notes,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating custom bill:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: paymentData as Payment }
  } catch (error: any) {
    console.error("Error in createCustomBill:", error)
    return { success: false, error: error.message }
  }
}

export const getPaymentsByPatientId = getPatientPayments
