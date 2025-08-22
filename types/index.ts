export interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: "admin" | "doctor" | "staff" | "patient"
  phone?: string | null
  address?: string | null
  date_of_birth?: string | null
  gender?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  medical_history?: string | null
  allergies?: string | null
  current_medications?: string | null
  insurance_provider?: string | null
  insurance_policy_number?: string | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  doctor_id?: string
  appointment_date: string
  appointment_time: string
  status: "scheduled" | "completed" | "cancelled" | "no-show"
  type: "consultation" | "cleaning" | "procedure" | "emergency" | "follow-up"
  notes?: string
  created_at: string
  updated_at: string
  patient?: UserProfile
  doctor?: UserProfile
}

export interface Treatment {
  id: string
  name: string
  description?: string
  default_price: number
  duration_minutes: number
  category: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  patient_id: string
  appointment_id?: string
  amount: number
  payment_method: "cash" | "card" | "insurance" | "other"
  status: "pending" | "completed" | "failed" | "refunded"
  payment_date: string
  notes?: string
  created_at: string
  updated_at: string
  patient?: UserProfile
  appointment?: Appointment
}

export interface Lead {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  source: "website" | "referral" | "social_media" | "advertisement" | "walk_in" | "other"
  status: "new" | "contacted" | "qualified" | "converted" | "lost"
  notes?: string
  created_at: string
  updated_at: string
}

export interface PatientRecord {
  id: string
  patient_id: string
  appointment_id?: string
  record_type: "consultation" | "treatment" | "diagnosis" | "prescription" | "lab_result" | "other"
  title: string
  description: string
  attachments?: string[]
  created_by: string
  created_at: string
  updated_at: string
  patient?: UserProfile
  appointment?: Appointment
  created_by_user?: UserProfile
}

export interface ClinicSettings {
  id: string
  clinic_name: string
  address: string
  phone: string
  email: string
  website?: string
  working_hours: {
    [key: string]: {
      open: string
      close: string
      is_open: boolean
    }
  }
  appointment_duration: number
  break_duration: number
  advance_booking_days: number
  cancellation_hours: number
  created_at: string
  updated_at: string
}

export interface TimeSlot {
  time: string
  available: boolean
  appointment_id?: string
}

export interface DaySchedule {
  date: string
  is_open: boolean
  slots: TimeSlot[]
}
