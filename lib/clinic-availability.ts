import { supabase } from "./supabase"

export interface ClinicAvailability {
  id: string
  date: string
  day_of_week: string
  is_closed: boolean
  custom_open_time?: string
  custom_close_time?: string
  reason?: string
  created_at: string
  updated_at: string
}

export interface BlockedTimeSlot {
  id: string
  date: string
  time_slot: string
  is_blocked: boolean
  reason?: string
  created_at: string
  updated_at: string
}

// Close specific day(s)
export async function closeDays(dates: string[], reason?: string) {
  try {
    const availabilityData = dates.map((date) => {
      const dateObj = new Date(date + "T00:00:00") // Ensure proper date parsing
      const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()

      return {
        date,
        day_of_week: dayOfWeek,
        is_closed: true,
        reason: reason || "Clinic closed",
      }
    })

    const { data, error } = await supabase
      .from("clinic_availability")
      .upsert(availabilityData, { onConflict: "date" })
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error closing days:", error)
    throw error
  }
}

// Close all occurrences of a specific day of the week
export async function closeAllDaysOfWeek(dayOfWeek: string, reason?: string) {
  try {
    // Get the next 365 days of the specified day of week
    const dates = getNextDatesForDayOfWeek(dayOfWeek, 365)
    return await closeDays(dates, reason)
  } catch (error) {
    console.error("Error closing all days of week:", error)
    throw error
  }
}

// Block specific time slots
export async function blockTimeSlots(date: string, timeSlots: string[], reason?: string) {
  try {
    const blockedData = timeSlots.map((timeSlot) => ({
      date,
      time_slot: timeSlot,
      is_blocked: true,
      reason: reason || "Time slot blocked",
    }))

    const { data, error } = await supabase
      .from("blocked_time_slots")
      .upsert(blockedData, { onConflict: "date,time_slot" })
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error blocking time slots:", error)
    throw error
  }
}

// Get available dates (excluding closed days)
export async function getAvailableDates(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from("clinic_availability")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("is_closed", false)

    if (error) throw error
    return data as ClinicAvailability[]
  } catch (error) {
    console.error("Error fetching available dates:", error)
    return []
  }
}

// Get blocked dates
export async function getBlockedDates(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from("clinic_availability")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("is_closed", true)

    if (error) throw error
    return data as ClinicAvailability[]
  } catch (error) {
    console.error("Error fetching blocked dates:", error)
    return []
  }
}

// Get available time slots for a specific date
export async function getAvailableTimeSlots(date: string) {
  try {
    // First check if the day is closed
    const { data: availability } = await supabase.from("clinic_availability").select("*").eq("date", date).single()

    if (availability?.is_closed) {
      return []
    }

    // Get all time slots
    const { data: allTimeSlots, error: timeSlotsError } = await supabase
      .from("time_slots")
      .select("*")
      .eq("is_available", true)
      .order("time_slot", { ascending: true })

    if (timeSlotsError) throw timeSlotsError

    // Get blocked time slots for this date
    const { data: blockedSlots, error: blockedError } = await supabase
      .from("blocked_time_slots")
      .select("time_slot")
      .eq("date", date)
      .eq("is_blocked", true)

    if (blockedError) throw blockedError

    const blockedTimes = new Set(blockedSlots?.map((slot) => slot.time_slot) || [])

    // Filter out blocked time slots
    const availableSlots = allTimeSlots?.filter((slot) => !blockedTimes.has(slot.time_slot)) || []

    return availableSlots
  } catch (error) {
    console.error("Error fetching available time slots:", error)
    return []
  }
}

// Remove closure/blocking
export async function reopenDay(date: string) {
  try {
    const { error } = await supabase.from("clinic_availability").delete().eq("date", date)

    if (error) throw error
    return true
  } catch (error) {
    console.error("Error reopening day:", error)
    throw error
  }
}

export async function unblockTimeSlot(date: string, timeSlot: string) {
  try {
    const { error } = await supabase.from("blocked_time_slots").delete().eq("date", date).eq("time_slot", timeSlot)

    if (error) throw error
    return true
  } catch (error) {
    console.error("Error unblocking time slot:", error)
    throw error
  }
}

// Helper function to get next dates for a specific day of the week
function getNextDatesForDayOfWeek(dayOfWeek: string, count: number): string[] {
  const dayMap: { [key: string]: number } = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  const targetDay = dayMap[dayOfWeek.toLowerCase()]
  const dates: string[] = []
  const today = new Date()

  // Find the next occurrence of the target day
  const current = new Date(today)
  current.setHours(0, 0, 0, 0) // Reset time to start of day

  while (current.getDay() !== targetDay) {
    current.setDate(current.getDate() + 1)
  }

  // Generate the specified number of dates
  for (let i = 0; i < count; i++) {
    dates.push(current.toISOString().split("T")[0])
    current.setDate(current.getDate() + 7) // Next week
  }

  return dates
}

// Get next Monday
export function getNextMonday(): string {
  const today = new Date()
  const nextMonday = new Date(today)
  nextMonday.setHours(0, 0, 0, 0) // Reset time to start of day

  const daysUntilMonday = (1 + 7 - today.getDay()) % 7 || 7
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  return nextMonday.toISOString().split("T")[0]
}

// Get next occurrence of any day
export function getNextDayOfWeek(dayOfWeek: string): string {
  const dayMap: { [key: string]: number } = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  const today = new Date()
  const targetDay = dayMap[dayOfWeek.toLowerCase()]
  const nextDate = new Date(today)
  nextDate.setHours(0, 0, 0, 0) // Reset time to start of day

  const daysUntil = (targetDay + 7 - today.getDay()) % 7 || 7
  nextDate.setDate(today.getDate() + daysUntil)
  return nextDate.toISOString().split("T")[0]
}

// Check if a date is available for appointments
export async function isDateAvailable(date: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("clinic_availability").select("is_closed").eq("date", date).single()

    if (error && error.code !== "PGRST116") throw error

    // If no record exists, check if it's a working day based on clinic settings
    if (!data) {
      return true // Default to available if no specific closure
    }

    return !data.is_closed
  } catch (error) {
    console.error("Error checking date availability:", error)
    return true // Default to available on error
  }
}
