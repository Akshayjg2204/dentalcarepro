"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import type { Appointment } from "@/lib/appointments"

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

interface AppointmentAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment | null
  onAssignmentUpdated: () => void
}

export function AppointmentAssignmentModal({
  isOpen,
  onClose,
  appointment,
  onAssignmentUpdated,
}: AppointmentAssignmentModalProps) {
  const [doctors, setDoctors] = useState<User[]>([])
  const [staff, setStaff] = useState<User[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("none")
  const [selectedStaffId, setSelectedStaffId] = useState<string>("none")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchDoctorsAndStaff()
      if (appointment) {
        setSelectedDoctorId(appointment.doctor_id || "none")
        setSelectedStaffId(appointment.staff_id || "none")
      }
    }
  }, [isOpen, appointment])

  const fetchDoctorsAndStaff = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, role")
        .in("role", ["doctor", "staff"])
        .order("first_name")

      if (error) throw error

      const doctors = data?.filter((user) => user.role === "doctor") || []
      const staff = data?.filter((user) => user.role === "staff") || []

      setDoctors(doctors)
      setStaff(staff)
    } catch (error: any) {
      console.error("Error fetching doctors and staff:", error)
      // toast.error("Failed to load doctors and staff")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!appointment) return

    setIsSaving(true)
    try {
      const updateData: any = {}

      if (selectedDoctorId !== "none") {
        updateData.doctor_id = selectedDoctorId
      } else {
        updateData.doctor_id = null
      }

      if (selectedStaffId !== "none") {
        updateData.staff_id = selectedStaffId
      } else {
        updateData.staff_id = null
      }

      const { error } = await supabase.from("appointments").update(updateData).eq("id", appointment.id)

      if (error) throw error

      // toast.success("Appointment assignment updated successfully!")
      onAssignmentUpdated()
      onClose()
    } catch (error: any) {
      console.error("Error updating appointment assignment:", error)
      // toast.error("Failed to update appointment assignment")
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      setSelectedDoctorId("none")
      setSelectedStaffId("none")
      onClose()
    }
  }

  if (!appointment) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-blue-600">Assign Staff & Doctor</DialogTitle>
          <p className="text-sm text-gray-600">Assign staff and doctor to manage this appointment</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Appointment Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium text-sm">{appointment.appointment_type}</p>
            <p className="text-sm text-gray-600">
              {appointment.patient?.first_name} {appointment.patient?.last_name}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(appointment.appointment_date).toLocaleDateString()} at{" "}
              {new Date(`2000-01-01T${appointment.appointment_time}`).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Loading staff and doctors...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Doctor Selection */}
              <div className="space-y-2">
                <Label className="flex items-center">Assign Doctor (Optional)</Label>
                <div className="space-y-2">
                  <Button
                    variant={selectedDoctorId === "none" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedDoctorId("none")}
                  >
                    No doctor assigned
                  </Button>
                  {doctors.map((doctor) => (
                    <Button
                      key={doctor.id}
                      variant={selectedDoctorId === doctor.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedDoctorId(doctor.id)}
                    >
                      Dr. {doctor.first_name} {doctor.last_name}
                    </Button>
                  ))}
                  {doctors.length === 0 && <p className="text-xs text-gray-500">No doctors available</p>}
                </div>
              </div>

              {/* Staff Selection */}
              <div className="space-y-2">
                <Label className="flex items-center">Assign Staff (Optional)</Label>
                <div className="space-y-2">
                  <Button
                    variant={selectedStaffId === "none" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedStaffId("none")}
                  >
                    No staff assigned
                  </Button>
                  {staff.map((staffMember) => (
                    <Button
                      key={staffMember.id}
                      variant={selectedStaffId === staffMember.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedStaffId(staffMember.id)}
                    >
                      {staffMember.first_name} {staffMember.last_name}
                    </Button>
                  ))}
                  {staff.length === 0 && <p className="text-xs text-gray-500">No staff members available</p>}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                "Save Assignment"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
