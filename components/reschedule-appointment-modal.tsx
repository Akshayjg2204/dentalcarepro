"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Calendar, Clock, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Appointment } from "@/lib/appointments"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface RescheduleAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment | null
  onAppointmentRescheduled: () => void
}

export function RescheduleAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onAppointmentRescheduled,
}: RescheduleAppointmentModalProps) {
  const [newDate, setNewDate] = useState("")
  const [newTime, setNewTime] = useState("")
  const [rescheduleReason, setRescheduleReason] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen && appointment) {
      // Set current appointment date and time as defaults
      setNewDate(appointment.appointment_date)
      setNewTime(appointment.appointment_time)
      setRescheduleReason("")
    }
  }, [isOpen, appointment])

  const handleSave = async () => {
    if (!appointment) return

    if (!newDate || !newTime) {
      toast.error("Please select both date and time")
      return
    }

    // Validate that the new date/time is in the future
    const newDateTime = new Date(`${newDate}T${newTime}`)
    const now = new Date()

    if (newDateTime <= now) {
      toast.error("Please select a future date and time")
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          appointment_date: newDate,
          appointment_time: newTime,
          notes: rescheduleReason
            ? `${appointment.notes ? appointment.notes + "\n\n" : ""}Rescheduled: ${rescheduleReason}`
            : appointment.notes,
        })
        .eq("id", appointment.id)

      if (error) throw error

      toast.success("Appointment rescheduled successfully!")
      onAppointmentRescheduled()
      onClose()
    } catch (error: any) {
      console.error("Error rescheduling appointment:", error)
      toast.error("Failed to reschedule appointment")
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      setNewDate("")
      setNewTime("")
      setRescheduleReason("")
      onClose()
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  if (!appointment) return null

  const isDateTimeChanged = newDate !== appointment.appointment_date || newTime !== appointment.appointment_time

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-orange-600">
            <Calendar className="w-5 h-5 mr-2" />
            Reschedule Appointment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Appointment Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-sm mb-2">Current Appointment</h3>
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {appointment.patient?.first_name} {appointment.patient?.last_name}
              </p>
              <p className="text-gray-600">{appointment.appointment_type}</p>
              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(appointment.appointment_date)}
              </div>
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                {formatTime(appointment.appointment_time)}
              </div>
            </div>
          </div>

          {/* New Date and Time */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">New Appointment Details</h3>

            <div className="space-y-2">
              <Label htmlFor="newDate">
                New Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                disabled={isSaving}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newTime">
                New Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newTime"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                disabled={isSaving}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rescheduleReason">Reason for Rescheduling (Optional)</Label>
              <Textarea
                id="rescheduleReason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                rows={3}
                disabled={isSaving}
                placeholder="Enter reason for rescheduling..."
              />
            </div>
          </div>

          {/* Preview of changes */}
          {isDateTimeChanged && newDate && newTime && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>New appointment time:</strong>
                <br />
                {formatDate(newDate)} at {formatTime(newTime)}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !newDate || !newTime || !isDateTimeChanged}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Rescheduling...
                </div>
              ) : (
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Reschedule
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
