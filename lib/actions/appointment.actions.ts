"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export interface CreateAppointmentData {
  patientId: string
  appointmentType: string
  appointmentDate: string
  appointmentTime: string
  notes?: string
  status?: "pending" | "approved" | "rejected" | "completed" | "cancelled"
  preferredDoctor?: string
}

export async function createAppointment(appointmentData: CreateAppointmentData) {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        patient_id: appointmentData.patientId,
        appointment_type: appointmentData.appointmentType,
        appointment_date: appointmentData.appointmentDate,
        appointment_time: appointmentData.appointmentTime,
        notes: appointmentData.notes || null,
        status: appointmentData.status || "pending",
        preferred_doctor: appointmentData.preferredDoctor || null,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath("/appointments")
    revalidatePath("/admin")
    return { success: true, data }
  } catch (error) {
    console.error("Error creating appointment:", error)
    return { success: false, error: error.message }
  }
}

export async function createEmergencyAppointment(appointmentData: {
  patientId: string
  appointmentType: string
  appointmentDate: string
  appointmentTime: string
  notes?: string
}) {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        patient_id: appointmentData.patientId,
        appointment_type: appointmentData.appointmentType,
        appointment_date: appointmentData.appointmentDate,
        appointment_time: appointmentData.appointmentTime,
        notes: appointmentData.notes || null,
        status: "approved", // Emergency appointments are auto-approved
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath("/appointments")
    revalidatePath("/admin")
    return { success: true, data }
  } catch (error) {
    console.error("Error creating emergency appointment:", error)
    return { success: false, error: error.message }
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled",
) {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/appointments")
    revalidatePath("/admin")
    return { success: true, data }
  } catch (error) {
    console.error("Error updating appointment status:", error)
    return { success: false, error: error.message }
  }
}

export async function cancelAppointment(appointmentId: string, reason?: string) {
  try {
    const updateData: any = { status: "cancelled" }
    if (reason) {
      updateData.cancellation_reason = reason
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", appointmentId)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/appointments")
    revalidatePath("/admin")
    return { success: true, data }
  } catch (error) {
    console.error("Error cancelling appointment:", error)
    return { success: false, error: error.message }
  }
}

export async function rescheduleAppointment(appointmentId: string, newDate: string, newTime: string, reason?: string) {
  try {
    const updateData: any = {
      appointment_date: newDate,
      appointment_time: newTime,
      status: "pending", // Reset to pending for approval
    }
    if (reason) {
      updateData.reschedule_reason = reason
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", appointmentId)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/appointments")
    revalidatePath("/admin")
    return { success: true, data }
  } catch (error) {
    console.error("Error rescheduling appointment:", error)
    return { success: false, error: error.message }
  }
}

export async function getPatientAppointments(patientId: string) {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: true })

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error("Error fetching patient appointments:", error)
    return { success: false, error: error.message }
  }
}

export async function completeAppointment(appointmentId: string, treatmentNotes?: string, followUpDate?: string) {
  try {
    const updateData: any = {
      status: "completed",
      completed_at: new Date().toISOString(),
    }
    if (treatmentNotes) {
      updateData.treatment_notes = treatmentNotes
    }
    if (followUpDate) {
      updateData.follow_up_date = followUpDate
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", appointmentId)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/appointments")
    revalidatePath("/admin")
    return { success: true, data }
  } catch (error) {
    console.error("Error completing appointment:", error)
    return { success: false, error: error.message }
  }
}
