import { supabase } from "./supabase"

export interface Appointment {
  id: string
  patient_id: string
  doctor_id?: string
  staff_id?: string
  appointment_date: string
  appointment_time: string
  appointment_type: string
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled"
  notes?: string
  created_at: string
  updated_at?: string
  priority?: "normal" | "high" | "urgent"
  doctor?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  staff?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  patient?: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
  }
}

export interface AppointmentType {
  id: string
  name: string
  duration_minutes: number
  description?: string
}

export interface TimeSlot {
  time: string
  available: boolean
  isBooked: boolean
}

export async function getAppointmentTypes(): Promise<AppointmentType[]> {
  try {
    const { data, error } = await supabase.from("appointment_types").select("*").order("name", { ascending: true })

    if (error) {
      console.error("Error fetching appointment types:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getAppointmentTypes:", error)
    return []
  }
}

export async function getTimeSlots(date: string): Promise<TimeSlot[]> {
  try {
    // Generate time slots from 10:00 AM to 10:00 PM (22:00)
    const slots: TimeSlot[] = []

    // Start from 10:00 AM (10:00) to 10:00 PM (22:00)
    for (let hour = 10; hour <= 22; hour++) {
      // Add slots every 30 minutes
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        slots.push({
          time: timeString,
          available: true,
          isBooked: false,
        })
      }
    }

    // Fetch booked appointments for the given date
    const { data: bookedAppointments, error } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("appointment_date", date)
      .in("status", ["pending", "approved"])

    if (error) {
      console.error("Error fetching booked slots:", error)
      return slots
    }

    const bookedTimes = bookedAppointments?.map((appointment) => appointment.appointment_time) || []

    // Update slots availability based on booked appointments
    const updatedSlots = slots.map((slot) => ({
      ...slot,
      isBooked: bookedTimes.includes(slot.time),
      available: !bookedTimes.includes(slot.time),
    }))

    return updatedSlots
  } catch (error) {
    console.error("Error in getTimeSlots:", error)
    return []
  }
}

export async function getPatientAppointments(patientId: string): Promise<Appointment[]> {
  try {
    console.log("Fetching appointments for patient ID:", patientId)

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        doctor:users!appointments_doctor_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        staff:users!appointments_staff_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: false })

    if (error) {
      console.error("Error fetching patient appointments:", error)
      return []
    }

    console.log("Raw appointment data:", data)

    const appointments: Appointment[] = (data || []).map((appointment) => ({
      id: appointment.id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      staff_id: appointment.staff_id,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      appointment_type: appointment.appointment_type,
      status: appointment.status,
      notes: appointment.notes,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
      priority: appointment.priority,
      doctor: appointment.doctor
        ? {
            id: appointment.doctor.id,
            first_name: appointment.doctor.first_name,
            last_name: appointment.doctor.last_name,
            email: appointment.doctor.email,
          }
        : undefined,
      staff: appointment.staff
        ? {
            id: appointment.staff.id,
            first_name: appointment.staff.first_name,
            last_name: appointment.staff.last_name,
            email: appointment.staff.email,
          }
        : undefined,
    }))

    console.log("Processed appointments:", appointments)
    return appointments
  } catch (error) {
    console.error("Error in getPatientAppointments:", error)
    return []
  }
}

export async function getAllAppointments(): Promise<Appointment[]> {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        doctor:users!appointments_doctor_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        staff:users!appointments_staff_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        patient:users!appointments_patient_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .order("appointment_date", { ascending: false })

    if (error) {
      console.error("Error fetching all appointments:", error)
      return []
    }

    return (data || []).map((appointment) => ({
      id: appointment.id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      staff_id: appointment.staff_id,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      appointment_type: appointment.appointment_type,
      status: appointment.status,
      notes: appointment.notes,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
      priority: appointment.priority,
      doctor: appointment.doctor
        ? {
            id: appointment.doctor.id,
            first_name: appointment.doctor.first_name,
            last_name: appointment.doctor.last_name,
            email: appointment.doctor.email,
          }
        : undefined,
      staff: appointment.staff
        ? {
            id: appointment.staff.id,
            first_name: appointment.staff.first_name,
            last_name: appointment.staff.last_name,
            email: appointment.staff.email,
          }
        : undefined,
      patient: appointment.patient
        ? {
            id: appointment.patient.id,
            first_name: appointment.patient.first_name,
            last_name: appointment.patient.last_name,
            email: appointment.patient.email,
            phone: appointment.patient.phone,
          }
        : undefined,
    }))
  } catch (error) {
    console.error("Error in getAllAppointments:", error)
    return []
  }
}

export async function createAppointment(appointmentData: {
  patientId: string
  doctorId?: string
  staffId?: string
  appointmentDate: string
  appointmentTime: string
  appointmentType: string
  notes?: string
  priority?: "normal" | "high" | "urgent"
}) {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          patient_id: appointmentData.patientId,
          doctor_id: appointmentData.doctorId,
          staff_id: appointmentData.staffId,
          appointment_date: appointmentData.appointmentDate,
          appointment_time: appointmentData.appointmentTime,
          appointment_type: appointmentData.appointmentType,
          notes: appointmentData.notes,
          status: "pending",
          priority: appointmentData.priority || "normal",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating appointment:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("Error in createAppointment:", error)
    return { success: false, error: error.message }
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled",
  notes?: string,
) {
  try {
    console.log(`Updating appointment ${appointmentId} to status: ${status}`)

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (notes) {
      updateData.notes = notes
    }

    const { data, error } = await supabase.from("appointments").update(updateData).eq("id", appointmentId).select()

    if (error) {
      console.error("Error updating appointment status:", error)
      return { success: false, error: error.message }
    }

    console.log("Appointment updated successfully:", data)
    return { success: true, data: data[0] }
  } catch (error: any) {
    console.error("Error in updateAppointmentStatus:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteAppointment(appointmentId: string) {
  try {
    const { error } = await supabase.from("appointments").delete().eq("id", appointmentId)

    if (error) {
      console.error("Error deleting appointment:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error in deleteAppointment:", error)
    return { success: false, error: error.message }
  }
}

export async function getDoctorAppointments(doctorId: string): Promise<Appointment[]> {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        staff:users!appointments_staff_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        patient:users!appointments_patient_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq("doctor_id", doctorId)
      .order("appointment_date", { ascending: false })

    if (error) {
      console.error("Error fetching doctor appointments:", error)
      return []
    }

    return (data || []).map((appointment) => ({
      id: appointment.id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      staff_id: appointment.staff_id,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      appointment_type: appointment.appointment_type,
      status: appointment.status,
      notes: appointment.notes,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
      priority: appointment.priority,
      staff: appointment.staff
        ? {
            id: appointment.staff.id,
            first_name: appointment.staff.first_name,
            last_name: appointment.staff.last_name,
            email: appointment.staff.email,
          }
        : undefined,
      patient: appointment.patient
        ? {
            id: appointment.patient.id,
            first_name: appointment.patient.first_name,
            last_name: appointment.patient.last_name,
            email: appointment.patient.email,
            phone: appointment.patient.phone,
          }
        : undefined,
    }))
  } catch (error) {
    console.error("Error in getDoctorAppointments:", error)
    return []
  }
}

export async function getAppointmentById(appointmentId: string): Promise<Appointment | null> {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        doctor:users!appointments_doctor_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        staff:users!appointments_staff_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        patient:users!appointments_patient_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq("id", appointmentId)
      .single()

    if (error) {
      console.error("Error fetching appointment by ID:", error)
      return null
    }

    return {
      id: data.id,
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      staff_id: data.staff_id,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
      appointment_type: data.appointment_type,
      status: data.status,
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
      priority: data.priority,
      doctor: data.doctor
        ? {
            id: data.doctor.id,
            first_name: data.doctor.first_name,
            last_name: data.doctor.last_name,
            email: data.doctor.email,
          }
        : undefined,
      staff: data.staff
        ? {
            id: data.staff.id,
            first_name: data.staff.first_name,
            last_name: data.staff.last_name,
            email: data.staff.email,
          }
        : undefined,
      patient: data.patient
        ? {
            id: data.patient.id,
            first_name: data.patient.first_name,
            last_name: data.patient.last_name,
            email: data.patient.email,
            phone: data.patient.phone,
          }
        : undefined,
    }
  } catch (error) {
    console.error("Error in getAppointmentById:", error)
    return null
  }
}
