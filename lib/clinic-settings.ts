import { supabase } from "./supabase"

export interface ClinicSettings {
  id: string
  clinic_name: string
  clinic_subtitle?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  website?: string

  // Working Hours
  monday_open?: string
  monday_close?: string
  tuesday_open?: string
  tuesday_close?: string
  wednesday_open?: string
  wednesday_close?: string
  thursday_open?: string
  thursday_close?: string
  friday_open?: string
  friday_close?: string
  saturday_open?: string
  saturday_close?: string
  sunday_open?: string
  sunday_close?: string

  // Additional Settings
  appointment_duration?: number
  emergency_phone?: string
  description?: string
  logo_url?: string

  // Social Media
  facebook_url?: string
  instagram_url?: string
  twitter_url?: string

  created_at: string
  updated_at: string
}

export interface WorkingHours {
  [key: string]: {
    open?: string
    close?: string
    isOpen: boolean
  }
}

export async function getClinicSettings(): Promise<ClinicSettings | null> {
  try {
    const { data, error } = await supabase.from("clinic_settings").select("*").limit(1).single()

    if (error && error.code !== "PGRST116") throw error
    return data
  } catch (error) {
    console.error("Error fetching clinic settings:", error)
    return null
  }
}

export async function updateClinicSettings(settings: Partial<ClinicSettings>): Promise<ClinicSettings> {
  try {
    // Clean up empty time values - convert empty strings to null
    const cleanedSettings = { ...settings }

    // List of time fields that need to be cleaned
    const timeFields = [
      "monday_open",
      "monday_close",
      "tuesday_open",
      "tuesday_close",
      "wednesday_open",
      "wednesday_close",
      "thursday_open",
      "thursday_close",
      "friday_open",
      "friday_close",
      "saturday_open",
      "saturday_close",
      "sunday_open",
      "sunday_close",
    ]

    // Convert empty strings to null for time fields
    timeFields.forEach((field) => {
      if (cleanedSettings[field as keyof ClinicSettings] === "") {
        cleanedSettings[field as keyof ClinicSettings] = null as any
      }
    })

    // First check if settings exist
    const existing = await getClinicSettings()

    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from("clinic_settings")
        .update(cleanedSettings)
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Create new settings
      const { data, error } = await supabase.from("clinic_settings").insert(cleanedSettings).select().single()

      if (error) throw error
      return data
    }
  } catch (error) {
    console.error("Error updating clinic settings:", error)
    throw error
  }
}

export function getWorkingHours(settings: ClinicSettings): WorkingHours {
  return {
    monday: {
      open: settings.monday_open,
      close: settings.monday_close,
      isOpen: !!(settings.monday_open && settings.monday_close),
    },
    tuesday: {
      open: settings.tuesday_open,
      close: settings.tuesday_close,
      isOpen: !!(settings.tuesday_open && settings.tuesday_close),
    },
    wednesday: {
      open: settings.wednesday_open,
      close: settings.wednesday_close,
      isOpen: !!(settings.wednesday_open && settings.wednesday_close),
    },
    thursday: {
      open: settings.thursday_open,
      close: settings.thursday_close,
      isOpen: !!(settings.thursday_open && settings.thursday_close),
    },
    friday: {
      open: settings.friday_open,
      close: settings.friday_close,
      isOpen: !!(settings.friday_open && settings.friday_close),
    },
    saturday: {
      open: settings.saturday_open,
      close: settings.saturday_close,
      isOpen: !!(settings.saturday_open && settings.saturday_close),
    },
    sunday: {
      open: settings.sunday_open,
      close: settings.sunday_close,
      isOpen: !!(settings.sunday_open && settings.sunday_close),
    },
  }
}

export function formatWorkingHours(settings: ClinicSettings): string {
  const hours = getWorkingHours(settings)
  const formatTime = (time?: string) => {
    if (!time) return ""
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const workingDays = []

  // Check for consecutive days with same hours
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"]
  const weekend = ["saturday", "sunday"]

  // Check weekdays
  const weekdayHours = weekdays.filter((day) => hours[day].isOpen)
  if (weekdayHours.length > 0) {
    const firstDay = weekdayHours[0]
    const sameHours = weekdayHours.every(
      (day) => hours[day].open === hours[firstDay].open && hours[day].close === hours[firstDay].close,
    )

    if (sameHours && weekdayHours.length === 5) {
      workingDays.push(`Mon-Fri: ${formatTime(hours[firstDay].open)} - ${formatTime(hours[firstDay].close)}`)
    } else {
      weekdayHours.forEach((day) => {
        const dayName = day.charAt(0).toUpperCase() + day.slice(1, 3)
        workingDays.push(`${dayName}: ${formatTime(hours[day].open)} - ${formatTime(hours[day].close)}`)
      })
    }
  }

  // Check weekend
  weekend.forEach((day) => {
    if (hours[day].isOpen) {
      const dayName = day.charAt(0).toUpperCase() + day.slice(1, 3)
      workingDays.push(`${dayName}: ${formatTime(hours[day].open)} - ${formatTime(hours[day].close)}`)
    } else {
      const dayName = day.charAt(0).toUpperCase() + day.slice(1, 3)
      workingDays.push(`${dayName}: Closed`)
    }
  })

  return workingDays.join("\n")
}

export function getFullAddress(settings: ClinicSettings): string {
  const parts = []
  if (settings.address) parts.push(settings.address)
  if (settings.city) parts.push(settings.city)
  if (settings.state) parts.push(settings.state)
  if (settings.zip_code) parts.push(settings.zip_code)
  if (settings.country) parts.push(settings.country)

  return parts.join(", ")
}
