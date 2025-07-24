import { supabase } from "./supabase"

export interface PatientPayment {
  id: string
  appointment_id: string
  patient_id: string
  bill_amount?: number
  total_amount?: number
  paid_amount?: number
  amount_paid?: number
  outstanding_balance: number
  payment_status: "fully_paid" | "partial_paid" | "not_paid"
  payment_method?: string
  payment_date?: string
  created_at: string
  appointment_date: string
  appointment_time?: string
  appointment_type?: string
  treatment_type?: string
  doctor_name?: string
}

export interface PatientPaymentStats {
  totalBilled: number
  totalPaid: number
  outstandingBalance: number
  totalAppointments: number
}

export async function getPatientPayments(patientId: string): Promise<PatientPayment[]> {
  try {
    console.log("Fetching payments for patient ID:", patientId)

    // First, get all appointments for the patient
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        appointment_type,
        doctor_id,
        users!appointments_doctor_id_fkey(first_name, last_name)
      `)
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: false })

    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError)
      return []
    }

    console.log("Found appointments:", appointments)

    if (!appointments || appointments.length === 0) {
      return []
    }

    // Get payments for these appointments
    const appointmentIds = appointments.map((apt) => apt.id)
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .in("appointment_id", appointmentIds)

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError)
      // Return appointments without payment data if payments table doesn't exist or has issues
      return appointments.map((appointment) => ({
        id: appointment.id,
        appointment_id: appointment.id,
        patient_id: patientId,
        bill_amount: 0,
        total_amount: 0,
        paid_amount: 0,
        amount_paid: 0,
        outstanding_balance: 0,
        payment_status: "not_paid" as const,
        created_at: new Date().toISOString(),
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        appointment_type: appointment.appointment_type,
        treatment_type: appointment.appointment_type,
        doctor_name: appointment.users
          ? `${appointment.users.first_name} ${appointment.users.last_name}`
          : "Unknown Doctor",
      }))
    }

    console.log("Found payments:", payments)

    // Combine appointment and payment data
    const result: PatientPayment[] = appointments.map((appointment) => {
      const payment = payments?.find((p) => p.appointment_id === appointment.id)
      const doctor = appointment.users as any

      return {
        id: payment?.id || appointment.id,
        appointment_id: appointment.id,
        patient_id: patientId,
        bill_amount: payment?.bill_amount || 0,
        total_amount: payment?.total_amount || payment?.bill_amount || 0,
        paid_amount: payment?.paid_amount || 0,
        amount_paid: payment?.amount_paid || payment?.paid_amount || 0,
        outstanding_balance:
          payment?.outstanding_balance ||
          (payment?.total_amount || payment?.bill_amount || 0) - (payment?.amount_paid || payment?.paid_amount || 0),
        payment_status: payment?.payment_status || "not_paid",
        payment_method: payment?.payment_method,
        payment_date: payment?.payment_date,
        created_at: payment?.created_at || appointment.created_at || new Date().toISOString(),
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        appointment_type: appointment.appointment_type,
        treatment_type: payment?.treatment_type || appointment.appointment_type,
        doctor_name: doctor ? `${doctor.first_name} ${doctor.last_name}` : "Unknown Doctor",
      }
    })

    console.log("Processed payment data:", result)
    return result
  } catch (error) {
    console.error("Error in getPatientPayments:", error)
    return []
  }
}

export async function getPatientPaymentStats(patientId: string): Promise<PatientPaymentStats> {
  try {
    console.log("Fetching payment stats for patient ID:", patientId)

    const payments = await getPatientPayments(patientId)

    const stats = payments.reduce(
      (acc, payment) => {
        const billAmount = payment.total_amount || payment.bill_amount || 0
        const paidAmount = payment.amount_paid || payment.paid_amount || 0
        const outstanding = payment.outstanding_balance || billAmount - paidAmount

        acc.totalBilled += billAmount
        acc.totalPaid += paidAmount
        acc.outstandingBalance += outstanding > 0 ? outstanding : 0
        acc.totalAppointments += 1

        return acc
      },
      {
        totalBilled: 0,
        totalPaid: 0,
        outstandingBalance: 0,
        totalAppointments: 0,
      },
    )

    console.log("Calculated payment stats:", stats)
    return stats
  } catch (error) {
    console.error("Error in getPatientPaymentStats:", error)
    return {
      totalBilled: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      totalAppointments: 0,
    }
  }
}

export async function createPayment(paymentData: {
  appointment_id: string
  patient_id: string
  bill_amount: number
  paid_amount: number
  payment_status: "fully_paid" | "partial_paid" | "not_paid"
  treatment_type?: string
}) {
  try {
    const outstanding_balance = Math.max(0, paymentData.bill_amount - paymentData.paid_amount)

    const { data, error } = await supabase
      .from("payments")
      .insert([
        {
          ...paymentData,
          total_amount: paymentData.bill_amount,
          amount_paid: paymentData.paid_amount,
          outstanding_balance,
          payment_date: paymentData.paid_amount > 0 ? new Date().toISOString() : null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating payment:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("Error in createPayment:", error)
    return { success: false, error: error.message }
  }
}

export async function updatePayment(
  paymentId: string,
  updates: {
    paid_amount?: number
    amount_paid?: number
    payment_status?: "fully_paid" | "partial_paid" | "not_paid"
    payment_date?: string
  },
) {
  try {
    // First get the current payment to calculate outstanding balance
    const { data: currentPayment, error: fetchError } = await supabase
      .from("payments")
      .select("bill_amount, total_amount")
      .eq("id", paymentId)
      .single()

    if (fetchError) {
      console.error("Error fetching current payment:", fetchError)
      return { success: false, error: fetchError.message }
    }

    const billAmount = currentPayment.total_amount || currentPayment.bill_amount || 0
    const paidAmount = updates.paid_amount || updates.amount_paid || 0
    const outstanding_balance = Math.max(0, billAmount - paidAmount)

    const updateData: any = {
      ...updates,
      outstanding_balance,
      payment_date: paidAmount > 0 ? updates.payment_date || new Date().toISOString() : null,
    }

    const { data, error } = await supabase.from("payments").update(updateData).eq("id", paymentId).select().single()

    if (error) {
      console.error("Error updating payment:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("Error in updatePayment:", error)
    return { success: false, error: error.message }
  }
}
