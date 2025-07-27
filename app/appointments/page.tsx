"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, ArrowLeft, Clock, User, CalendarIcon as CalendarIconLucide } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { createAppointment, getPatientAppointments, type Appointment } from "@/lib/appointments"
import { getAvailableTimeSlots } from "@/lib/clinic-availability"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function AppointmentsPage() {
  const [user, setUser] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([])
  const [selectedType, setSelectedType] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState("")
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchAppointmentTypes()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        window.location.href = "/login"
        return
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", session.user.email)
        .maybeSingle()

      if (userError || !userData) {
        console.error("Error fetching user:", userError)
        window.location.href = "/login"
        return
      }

      if (userData.role !== "patient") {
        window.location.href = "/dashboard"
        return
      }

      setUser(userData)
      await fetchAppointments(userData.id)
    } catch (error) {
      console.error("Auth error:", error)
      window.location.href = "/login"
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAppointmentTypes = async () => {
    try {
      const { data, error } = await supabase.from("appointment_types").select("*").order("name", { ascending: true })

      if (error) {
        console.error("Error fetching appointment types:", error)
        return
      }

      setAppointmentTypes(data || [])
    } catch (error) {
      console.error("Error fetching appointment types:", error)
    }
  }

  const fetchAppointments = async (patientId: string) => {
    try {
      const appointmentsData = await getPatientAppointments(patientId)
      setAppointments(appointmentsData)
    } catch (error) {
      console.error("Error fetching appointments:", error)
      toast.error("Failed to fetch appointments")
    }
  }

  const fetchAvailableSlots = async (date: Date) => {
    try {
      const dateString = format(date, "yyyy-MM-dd")
      const availableTimeSlots = await getAvailableTimeSlots(dateString)
      const timeSlots = availableTimeSlots.map((slot) => slot.time_slot)
      setAvailableSlots(timeSlots)
    } catch (error) {
      console.error("Error fetching available slots:", error)
      toast.error("Failed to fetch available time slots")
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    setSelectedTime("")
    if (date) {
      fetchAvailableSlots(date)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType || !selectedDate || !selectedTime) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createAppointment({
        patientId: user.id,
        appointmentDate: format(selectedDate, "yyyy-MM-dd"),
        appointmentTime: selectedTime,
        appointmentType: selectedType,
        notes: notes.trim() || undefined,
      })

      if (result.success) {
        toast.success("Appointment booked successfully!")
        // Reset form
        setSelectedType("")
        setSelectedDate(undefined)
        setSelectedTime("")
        setNotes("")
        // Refresh appointments
        await fetchAppointments(user.id)
      } else {
        toast.error(result.error || "Failed to book appointment")
      }
    } catch (error: any) {
      console.error("Error booking appointment:", error)
      toast.error("Failed to book appointment")
    } finally {
      setIsSubmitting(false)
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Appointments</h1>
                <p className="text-gray-600 hidden sm:block">Schedule and manage your appointments</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Book New Appointment Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIconLucide className="h-5 w-5 text-blue-600" />
                  Book New Appointment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="appointment-type">
                      Appointment Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select appointment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Date <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-11 justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Time</Label>
                    {selectedDate ? (
                      availableSlots.length > 0 ? (
                        <Select value={selectedTime} onValueChange={setSelectedTime}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select time slot" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSlots.map((slot) => (
                              <SelectItem key={slot} value={slot}>
                                {formatTime(slot)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center justify-center h-11 border rounded-md bg-gray-50">
                          <p className="text-sm text-gray-500">No available slots for this date</p>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-11 border rounded-md bg-gray-50">
                        <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-sm text-gray-500">Please select a date first</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any specific concerns or requests..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                    disabled={isSubmitting || !selectedType || !selectedDate || !selectedTime}
                  >
                    {isSubmitting ? "Booking..." : "Book Appointment"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Appointments List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Your Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="text-center py-6">
                    <CalendarIconLucide className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments yet</h3>
                    <p className="text-gray-600 text-sm">Your booked appointments will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments
                      .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
                      .slice(0, 5)
                      .map((appointment) => (
                        <div key={appointment.id} className="border rounded-lg p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm sm:text-base truncate">
                                {appointment.appointment_type}
                              </h4>
                              <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm text-gray-600 mt-1 gap-1 sm:gap-3">
                                <div className="flex items-center">
                                  <CalendarIconLucide className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  {formatDate(appointment.appointment_date)}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  {formatTime(appointment.appointment_time)}
                                </div>
                              </div>
                              {appointment.doctor && (
                                <div className="flex items-center text-xs sm:text-sm text-gray-600 mt-1">
                                  <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                                </div>
                              )}
                            </div>
                            <Badge className={`${getStatusColor(appointment.status)} text-xs whitespace-nowrap`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    {appointments.length > 5 && (
                      <div className="text-center pt-2">
                        <Link href="/dashboard">
                          <Button variant="outline" size="sm" className="text-xs bg-transparent">
                            View All Appointments
                          </Button>
                        </Link>
                      </div>
                    )}
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
