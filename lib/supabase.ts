import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: "admin" | "doctor" | "staff" | "patient"
          phone: string | null
          address: string | null
          date_of_birth: string | null
          gender: string | null
          emergency_contact: string | null
          medical_conditions: string | null
          allergies: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: "admin" | "doctor" | "staff" | "patient"
          phone?: string | null
          address?: string | null
          date_of_birth?: string | null
          gender?: string | null
          emergency_contact?: string | null
          medical_conditions?: string | null
          allergies?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: "admin" | "doctor" | "staff" | "patient"
          phone?: string | null
          address?: string | null
          date_of_birth?: string | null
          gender?: string | null
          emergency_contact?: string | null
          medical_conditions?: string | null
          allergies?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          appointment_date: string
          appointment_time: string
          status: "scheduled" | "completed" | "cancelled" | "no-show"
          notes: string | null
          treatment_type: string | null
          priority: "normal" | "urgent" | "emergency"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          appointment_date: string
          appointment_time: string
          status?: "scheduled" | "completed" | "cancelled" | "no-show"
          notes?: string | null
          treatment_type?: string | null
          priority?: "normal" | "urgent" | "emergency"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          appointment_date?: string
          appointment_time?: string
          status?: "scheduled" | "completed" | "cancelled" | "no-show"
          notes?: string | null
          treatment_type?: string | null
          priority?: "normal" | "urgent" | "emergency"
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          patient_id: string
          appointment_id: string | null
          amount: number
          payment_method: "cash" | "card" | "insurance" | "check"
          status: "pending" | "completed" | "failed" | "refunded"
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          appointment_id?: string | null
          amount: number
          payment_method: "cash" | "card" | "insurance" | "check"
          status?: "pending" | "completed" | "failed" | "refunded"
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          appointment_id?: string | null
          amount?: number
          payment_method?: "cash" | "card" | "insurance" | "check"
          status?: "pending" | "completed" | "failed" | "refunded"
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
