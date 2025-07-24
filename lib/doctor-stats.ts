import { supabase } from "./supabase"

export async function getDoctorStats(doctorId: string) {
  try {
    // Get doctor's appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("*")
      .eq("doctor_id", doctorId)

    if (appointmentsError) throw appointmentsError

    // Get today's appointments
    const today = new Date().toISOString().split("T")[0]
    const todayAppointments = appointments?.filter((apt) => apt.appointment_date === today).length || 0

    // Get unique patients
    const uniquePatients = new Set(appointments?.map((apt) => apt.patient_id)).size || 0

    // Get completed appointments this month
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlyCompleted =
      appointments?.filter((apt) => {
        const aptDate = new Date(apt.appointment_date)
        return (
          apt.status === "completed" && aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear
        )
      }).length || 0

    // Get pending reviews (approved appointments)
    const pendingReviews = appointments?.filter((apt) => apt.status === "approved").length || 0

    return {
      todayAppointments,
      totalPatients: uniquePatients,
      monthlyCompleted,
      pendingReviews,
    }
  } catch (error) {
    console.error("Error fetching doctor stats:", error)
    return {
      todayAppointments: 0,
      totalPatients: 0,
      monthlyCompleted: 0,
      pendingReviews: 0,
    }
  }
}
