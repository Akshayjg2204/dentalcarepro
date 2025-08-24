import { supabase } from "./supabase"

export async function getTotalOutstandingBalance(): Promise<number> {
  try {
    const { data: billingRecords, error } = await supabase
      .from("billing_records")
      .select("total_amount, amount_paid")
      .neq("status", "paid")

    if (error) {
      console.error("Error fetching billing records:", error)
      return 0
    }

    const outstandingBalance =
      billingRecords?.reduce((total, record) => {
        const outstanding = (record.total_amount || 0) - (record.amount_paid || 0)
        return total + Math.max(0, outstanding)
      }, 0) || 0

    return outstandingBalance
  } catch (error) {
    console.error("Error calculating outstanding balance:", error)
    return 0
  }
}

export async function getStaffStats() {
  try {
    // Get today's appointments
    const today = new Date().toISOString().split("T")[0]
    const { data: todayAppointments, error: todayError } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", today)

    if (todayError) throw todayError

    // Get pending calls (pending appointments)
    const { data: pendingAppointments, error: pendingError } = await supabase
      .from("appointments")
      .select("*")
      .eq("status", "pending")

    if (pendingError) throw pendingError

    // Get new patients (patients created this month)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const { data: allUsers, error: usersError } = await supabase.from("users").select("*").eq("role", "patient")

    if (usersError) throw usersError

    const newPatients =
      allUsers?.filter((user) => {
        const createdDate = new Date(user.created_at)
        return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
      }).length || 0

    // Get tasks (appointments needing follow-up)
    const { data: completedAppointments, error: completedError } = await supabase
      .from("appointments")
      .select("*")
      .eq("status", "completed")

    if (completedError) throw completedError

    const tasksCount = completedAppointments?.length || 0

    const outstandingBalance = await getTotalOutstandingBalance()

    return {
      todayAppointments: todayAppointments?.length || 0,
      pendingCalls: pendingAppointments?.length || 0,
      newPatients,
      tasks: tasksCount,
      outstandingBalance,
    }
  } catch (error) {
    console.error("Error fetching staff stats:", error)
    return {
      todayAppointments: 0,
      pendingCalls: 0,
      newPatients: 0,
      tasks: 0,
      outstandingBalance: 0,
    }
  }
}
