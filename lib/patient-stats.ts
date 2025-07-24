import { supabase } from "./supabase"

export async function getPatientStats(patientId: string) {
  try {
    // Get patient appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", patientId)

    if (appointmentsError) throw appointmentsError

    // Get patient payments
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .eq("patient_id", patientId)

    if (paymentsError) throw paymentsError

    const totalAppointments = appointments?.length || 0
    const completedAppointments = appointments?.filter((apt) => apt.status === "completed").length || 0
    const pendingAppointments = appointments?.filter((apt) => apt.status === "pending").length || 0

    const totalPaid = payments?.reduce((sum, payment) => sum + payment.paid_amount, 0) || 0
    const totalOutstanding =
      payments?.reduce((sum, payment) => sum + (payment.bill_amount - payment.paid_amount), 0) || 0

    return {
      totalAppointments,
      completedAppointments,
      pendingAppointments,
      totalPaid,
      totalOutstanding,
    }
  } catch (error) {
    console.error("Error fetching patient stats:", error)
    return {
      totalAppointments: 0,
      completedAppointments: 0,
      pendingAppointments: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    }
  }
}
