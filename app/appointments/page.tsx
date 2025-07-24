"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ArrowLeft, LogOut, Plus, X } from "lucide-react"
import { getCurrentUser, signOut } from "@/lib/auth"
import {
  createAppointment,
  getAppointmentTypes,
  getPatientAppointments,
  updateAppointmentStatus,
  type AppointmentType,
} from "@/lib/appointments"
import { ClockTimeSelector } from "@/components/clock-time-selector"
import { toast } from "sonner"
import Link from "next/link"

export default function AppointmentsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancellingAppointments, setCancellingAppointments] = useState<Set<string>>(new Set())
  const router = useRouter()

  const [formData, setFormData] = useState({
    appointmentType: "",
    appointmentDate: "",
    appointmentTime: "",
    notes: "",
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/login")
        return
      }

      // Only patients can access this page
      if (user.profile.role !== "patient") {
        toast.error("Access denied. This page is for patients only.")
        router.push("/dashboard")
        return
      }

      setCurrentUser(user)
      await fetchData(user.profile.id)
    } catch (error: any) {
      console.error("Auth check error:", error)
      toast.error("Authentication failed")
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchData = async (patientId: string) => {
    try {
      const [userAppointments, types] = await Promise.all([getPatientAppointments(patientId), getAppointmentTypes()])

      setAppointments(userAppointments)
      setAppointmentTypes(types)
    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load appointment data")
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormData({
      appointmentType: "",
      appointmentDate: "",
      appointmentTime: "",
      notes: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    setIsSubmitting(true)
    try {
      // Validate required fields
      if (!formData.appointmentType) {
        throw new Error("Please select an appointment type")
      }
      if (!formData.appointmentDate) {
        throw new Error("Please select a date")
      }
      if (!formData.appointmentTime) {
        throw new Error("Please select a time")
      }

      // Check if the selected date is not in the past
      const selectedDate = new Date(formData.appointmentDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (selectedDate < today) {
        throw new Error("Cannot schedule appointments in the past")
      }

      await createAppointment({
        patientId: currentUser.profile.id,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        appointmentType: formData.appointmentType,
        notes: formData.notes.trim() || undefined,
      })

      toast.success("Appointment request submitted successfully! You will be notified once it's approved.")
      resetForm()
      await fetchData(currentUser.profile.id)
    } catch (error: any) {
      console.error("Error creating appointment:", error)
      toast.error(error.message || "Failed to create appointment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) {
      return
    }

    setCancellingAppointments((prev) => new Set(prev).add(appointmentId))
    try {
      await updateAppointmentStatus(appointmentId, "cancelled")
      toast.success("Appointment cancelled successfully")
      await fetchData(currentUser.profile.id)
    } catch (error: any) {
      console.error("Error cancelling appointment:", error)
      toast.error("Failed to cancel appointment")
    } finally {
      setCancellingAppointments((prev) => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error: any) {
      toast.error("Failed to sign out")
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Get today's date as minimum selectable date
  const today = new Date().toISOString().split("T")[0]

  // Get max date (30 days from today)
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)
  const maxDateString = maxDate.toISOString().split("T")[0]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Appointments</h1>
              <p className="text-gray-600">Schedule and manage your appointments</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="flex items-center bg-transparent">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
          {/* Book New Appointment */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-blue-600" />
                  Book New Appointment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Appointment Type */}
                  <div className="space-y-2">
                    <Label htmlFor="appointmentType">
                      Appointment Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.appointmentType}
                      onValueChange={(value) => handleInputChange("appointmentType", value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select appointment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.name}>
                            {type.name} ({type.duration_minutes} min)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="appointmentDate">
                      Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="appointmentDate"
                      type="date"
                      value={formData.appointmentDate}
                      min={today}
                      max={maxDateString}
                      onChange={(e) => handleInputChange("appointmentDate", e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Time Selector */}
                  <div className="space-y-2">
                    <ClockTimeSelector
                      selectedDate={formData.appointmentDate}
                      selectedTime={formData.appointmentTime}
                      onTimeChange={(time) => handleInputChange("appointmentTime", time)}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      rows={3}
                      placeholder="Any specific concerns or requests..."
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700">
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Booking...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Appointment
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Appointments List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Your Appointments
                  </div>
                  <span className="text-sm text-gray-500">{appointments.length} total</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments
                      .sort((a, b) => {
                        const statusOrder = { pending: 0, approved: 1, outstanding: 2, completed: 3, cancelled: 4 }
                        const aOrder = statusOrder[a.status] ?? 5
                        const bOrder = statusOrder[b.status] ?? 5
                        if (aOrder !== bOrder) return aOrder - bOrder
                        // Secondary sort by date (newest first)
                        return new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
                      })
                      .map((appointment) => (
                        <div key={appointment.id} className="p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4">
                                <div>
                                  <h3 className="font-medium">{appointment.appointment_type}</h3>
                                  <p className="text-sm text-gray-600">
                                    {formatDate(appointment.appointment_date)} at{" "}
                                    {formatTime(appointment.appointment_time)}
                                  </p>
                                  {appointment.doctor && (
                                    <p className="text-sm text-gray-500">
                                      Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                                    </p>
                                  )}
                                  {appointment.notes && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      <strong>Notes:</strong> {appointment.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {/* Cancel button for pending appointments */}
                              {appointment.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelAppointment(appointment.id)}
                                  disabled={cancellingAppointments.has(appointment.id)}
                                  className="border-red-600 text-red-600 hover:bg-red-50"
                                >
                                  {cancellingAppointments.has(appointment.id) ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}
                              >
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </span>
                              <p className="text-sm text-gray-500">
                                {new Date(appointment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No appointments yet</h3>
                    <p className="text-gray-600 mb-4">Book your first appointment to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
