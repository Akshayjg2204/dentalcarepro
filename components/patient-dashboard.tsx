"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Calendar, Clock, MapPin, Phone, CreditCard, FileText, User, Stethoscope, Users } from 'lucide-react'
import { getPatientAppointments, cancelAppointment, type Appointment } from "@/lib/appointments"
import { getPatientPayments, type Payment } from "@/lib/patient-payments"
import { UpdateProfileModal } from "@/components/update-profile-modal"

interface PatientDashboardProps {
  user: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    date_of_birth?: string
    address?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
  }
}

export function PatientDashboard({ user }: PatientDashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [cancellingAppointments, setCancellingAppointments] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [user.id])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [appointmentsData, paymentsData] = await Promise.all([
        getPatientAppointments(user.id),
        getPatientPayments(user.id)
      ])
      setAppointments(appointmentsData)
      setPayments(paymentsData)
    } catch (error: any) {
      console.error("Failed to fetch data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) {
      return
    }

    setCancellingAppointments(prev => new Set(prev).add(appointmentId))
    try {
      await cancelAppointment(appointmentId)
      toast.success("Appointment cancelled successfully!")
      fetchData()
    } catch (error: any) {
      toast.error("Failed to cancel appointment: " + (error.message || "Unknown error"))
    } finally {
      setCancellingAppointments(prev => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "no_show":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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

  const upcomingAppointments = appointments.filter(
    (apt) => apt.status === "scheduled" && new Date(apt.appointment_date) >= new Date()
  )

  const pastAppointments = appointments.filter(
    (apt) => apt.status === "completed" || new Date(apt.appointment_date) < new Date()
  )

  const totalOwed = payments
    .filter(payment => payment.status === "pending" || payment.status === "overdue")
    .reduce((sum, payment) => sum + payment.amount, 0)

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user.first_name}!</h1>
            <p className="text-blue-100 mt-1">Here's your dental care overview</p>
          </div>
          <Button
            onClick={() => setIsProfileModalOpen(true)}
            variant="secondary"
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            <User className="w-4 h-4 mr-2" />
            Update Profile
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{upcomingAppointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Visits</p>
                <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                <p className="text-2xl font-bold text-gray-900">${totalOwed.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="appointments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-6">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No upcoming appointments</p>
                  <p className="text-sm text-gray-500 mt-1">Contact us to schedule your next visit</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {appointment.appointment_type}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="w-4 h-4 mr-2" />
                              <span>{formatDate(appointment.appointment_date)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>{formatTime(appointment.appointment_time)}</span>
                            </div>
                            {appointment.location && (
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                <span>{appointment.location}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Doctor and Staff Assignment Display */}
                          {(appointment.assigned_doctor_user || appointment.assigned_staff_user) && (
                            <div className="mt-3 space-y-1">
                              {appointment.assigned_doctor_user && (
                                <div className="flex items-center text-sm text-blue-600">
                                  <Stethoscope className="w-4 h-4 mr-2" />
                                  <span>Dr. {appointment.assigned_doctor_user.first_name} {appointment.assigned_doctor_user.last_name}</span>
                                </div>
                              )}
                              {appointment.assigned_staff_user && (
                                <div className="flex items-center text-sm text-green-600">
                                  <Users className="w-4 h-4 mr-2" />
                                  <span>{appointment.assigned_staff_user.first_name} {appointment.assigned_staff_user.last_name}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {appointment.notes && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600">
                                <strong>Notes:</strong> {appointment.notes}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
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
                              "Cancel"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Past Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pastAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No past appointments</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastAppointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {appointment.appointment_type}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="w-4 h-4 mr-2" />
                              <span>{formatDate(appointment.appointment_date)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>{formatTime(appointment.appointment_time)}</span>
                            </div>
                          </div>
                          
                          {/* Doctor and Staff Assignment Display */}
                          {(appointment.assigned_doctor_user || appointment.assigned_staff_user) && (
                            <div className="mt-3 space-y-1">
                              {appointment.assigned_doctor_user && (
                                <div className="flex items-center text-sm text-blue-600">
                                  <Stethoscope className="w-4 h-4 mr-2" />
                                  <span>Dr. {appointment.assigned_doctor_user.first_name} {appointment.assigned_doctor_user.last_name}</span>
                                </div>
                              )}
                              {appointment.assigned_staff_user && (
                                <div className="flex items-center text-sm text-green-600">
                                  <Users className="w-4 h-4 mr-2" />
                                  <span>{appointment.assigned_staff_user.first_name} {appointment.assigned_staff_user.last_name}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {appointment.notes && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600">
                                <strong>Notes:</strong> {appointment.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {pastAppointments.length > 5 && (
                    <p className="text-center text-sm text-gray-500 mt-4">
                      Showing 5 most recent appointments
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No payment records</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getPaymentStatusColor(payment.status)}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </Badge>
                            <span className="font-medium text-lg">${payment.amount.toFixed(2)}</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              <strong>Service:</strong> {payment.service_description}
                            </p>
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="w-4 h-4 mr-2" />
                              <span>Due: {formatDate(payment.due_date)}</span>
                            </div>
                            {payment.paid_date && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>Paid: {formatDate(payment.paid_date)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UpdateProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onProfileUpdated={fetchData}
      />
    </div>
  )
}
