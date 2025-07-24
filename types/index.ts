export interface AppointmentType {
  id: string
  name: string
  duration_minutes: number
  description?: string
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: "admin" | "doctor" | "staff" | "patient"
  date_of_birth?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  created_at: string
  updated_at: string
}
