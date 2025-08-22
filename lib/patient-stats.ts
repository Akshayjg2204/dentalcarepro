import { supabase } from "./supabase"

export async function getPatientStats(patientId: string) {
  try {
    // Get patient appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", patientId)

    if (appointmentsError) throw appointmentsError

    const { data: billingRecords, error: billingError } = await supabase
      .from("billing_records")
      .select("*")
      .eq("patient_id", patientId)

    if (billingError) throw billingError

    const totalAppointments = appointments?.length || 0
    const completedAppointments = appointments?.filter((apt) => apt.status === "completed").length || 0
    const pendingAppointments = appointments?.filter((apt) => apt.status === "pending").length || 0

    const totalPaid = billingRecords?.reduce((sum, record) => sum + (record.amount_paid || 0), 0) || 0
    const totalOutstanding =
      billingRecords?.reduce((sum, record) => sum + ((record.amount || 0) - (record.amount_paid || 0)), 0) || 0

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
