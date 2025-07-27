"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser, signOut } from "@/lib/auth"
import { getPatientAppointments, type Appointment } from "@/lib/appointments"
import {
  getPatientPayments,
  getPatientPaymentStats,
  type PatientPayment,
  type PatientPaymentStats,
} from "@/lib/patient-payments"
import { getClinicSettings } from "@/lib/clinic-settings"
import { toast } from "sonner"
import {
  Calendar,
  CreditCard,
  LogOut,
  CalendarPlus,
  History,
  Edit,
  Phone,
  MapPin,
  IndianRupee,
  CheckCircle,
  Clock,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UpdateProfileModal } from "@/components/update-profile-modal"

export function PatientDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<PatientPayment[]>([])
  const [paymentStats, setPaymentStats] = useState<PatientPaymentStats>({
    totalBilled: 0,
    totalPaid: 0,
    outstandingBalance: 0,
    totalAppointments: 0,
  })
  const [clinicSettings, setClinicSettings] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      if (!user || user.profile.role !== "patient") {
        toast.error("Access denied. Patient access required.")
        router.push("/login")
        return
      }
      setCurrentUser(user)
      await Promise.all([fetchAppointments(user.profile.id), fetchPayments(user.profile.id), fetchClinicSettings()])
    } catch (error: any) {
      console.error("Auth check error:", error)
      toast.error("Authentication failed")
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAppointments = async (patientId: string) => {
    try {
      console.log("Fetching appointments for patient:", patientId)
      const appointmentsData = await getPatientAppointments(patientId)
      console.log("Fetched appointments:", appointmentsData)
      setAppointments(appointmentsData)
    } catch (error: any) {
      console.error("Failed to fetch appointments:", error)
      toast.error("Failed to fetch appointments")
    }
  }

  const fetchPayments = async (patientId: string) => {
    try {
      console.log("Fetching payments for patient:", patientId)
      const [paymentsData, statsData] = await Promise.all([
        getPatientPayments(patientId),
        getPatientPaymentStats(patientId),
      ])
      console.log("Fetched payments:", paymentsData)
      console.log("Fetched payment stats:", statsData)
      setPayments(paymentsData)
      setPaymentStats(statsData)
    } catch (error: any) {
      console.error("Failed to fetch payments:", error)
      toast.error("Failed to fetch payment history")
    }
  }

  const fetchClinicSettings = async () => {
    try {
      const settings = await getClinicSettings()
      setClinicSettings(settings)
    } catch (error: any) {
      console.error("Failed to fetch clinic settings:", error)
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

  const handleProfileUpdate = () => {
    checkAuth()
  }

  const handleCallClinic = () => {
    if (clinicSettings?.phone) {
      window.open(`tel:${clinicSettings.phone}`, "_self")
    } else {
      toast.error("Clinic phone number not available")
    }
  }

  const handleGetDirections = () => {
    if (clinicSettings?.google_maps_link) {
      window.open(clinicSettings.google_maps_link, "_blank")
    } else if (clinicSettings?.address) {
      const address = encodeURIComponent(`${clinicSettings.address}, ${clinicSettings.city}, ${clinicSettings.state}`)
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, "_blank")
    } else {
      toast.error("Clinic address not available")
    }
  }

  const handleBookAppointment = () => {
    router.push("/appointments")
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "fully_paid":
        return "bg-green-100 text-green-800"
      case "partial_paid":
        return "bg-yellow-100 text-yellow-800"
      case "not_paid":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "fully_paid":
        return "Paid"
      case "partial_paid":
        return "Partial"
      case "not_paid":
        return "Unpaid"
      default:
        return status
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0)
  }

  // Function to clean appointment type by removing duration
  const cleanAppointmentType = (appointmentType: string) => {
    if (!appointmentType) return "Treatment"
    return appointmentType.replace(/\s*$$\d+\s*min$$/gi, "").trim()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Filter appointments properly
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingAppointments = appointments.filter((apt) => {
    const appointmentDate = new Date(apt.appointment_date)
    appointmentDate.setHours(0, 0, 0, 0)
    return apt.status === "approved" && appointmentDate >= today
  })

  const completedAppointments = appointments
    .filter((apt) => apt.status === "completed")
    .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())

  const recentPayments = payments.sort(
    (a, b) =>
      new Date(b.appointment_date || b.created_at).getTime() - new Date(a.appointment_date || a.created_at).getTime(),
  )

  console.log("All appointments:", appointments)
  console.log("Upcoming appointments:", upcomingAppointments)
  console.log("Completed appointments:", completedAppointments)
  console.log("Payment stats:", paymentStats)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Back Home</span>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Patient Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Welcome back, {currentUser?.profile?.first_name}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="flex items-center bg-transparent p-2 sm:px-3 sm:py-2"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                  <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600">Total Paid Amount</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate">
                    ₹{paymentStats.totalPaid.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600">Completed Appointments</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{completedAppointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-red-100 rounded-lg">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600">Outstanding Balance</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate">
                    ₹{paymentStats.outstandingBalance.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Book New Appointment */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleBookAppointment}>
            <CardHeader className="text-center pb-3 sm:pb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                <CalendarPlus className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <CardTitle className="text-base sm:text-lg">Book New Appointment</CardTitle>
              <p className="text-xs sm:text-sm text-gray-600">Schedule your next dental visit</p>
            </CardHeader>
            <CardContent>
              <div className="mt-2 sm:mt-4">
                <Button
                  variant="outline"
                  className="w-full bg-white text-black border-gray-300 hover:bg-gray-50 text-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleBookAppointment()
                  }}
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Book Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* View Payment History */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/payments")}>
            <CardHeader className="text-center pb-3 sm:pb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                <History className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <CardTitle className="text-base sm:text-lg">Payment History</CardTitle>
              <p className="text-xs sm:text-sm text-gray-600">View your payment records</p>
            </CardHeader>
            <CardContent>
              <div className="mt-2 sm:mt-4">
                <Button
                  variant="outline"
                  className="w-full bg-white text-black border-gray-300 hover:bg-gray-50 text-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push("/payments")
                  }}
                >
                  <History className="w-4 h-4 mr-2" />
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Update Profile */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-3 sm:pb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-purple-100 rounded-lg flex items-center justify-center mb-2 sm:mb-3">
                <Edit className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <CardTitle className="text-base sm:text-lg">Update Profile</CardTitle>
              <p className="text-xs sm:text-sm text-gray-600">Manage your personal information</p>
            </CardHeader>
            <CardContent>
              <div className="mt-2 sm:mt-4">
                <UpdateProfileModal user={currentUser} onProfileUpdate={handleProfileUpdate} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto h-12">
            <TabsTrigger value="upcoming" className="text-sm">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="history" className="text-sm">
              History
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-sm">
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Upcoming Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 border rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-medium text-base">
                              {cleanAppointmentType(appointment.appointment_type)}
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 mt-1 gap-1 sm:gap-3">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDate(appointment.appointment_date)}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {formatTime(appointment.appointment_time)}
                              </div>
                            </div>
                            {appointment.notes && <p className="text-sm text-gray-500 mt-1">{appointment.notes}</p>}

                            {/* Action Buttons for Approved Appointments */}
                            <div className="flex flex-col sm:flex-row gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleGetDirections}
                                className="flex items-center bg-transparent text-sm"
                              >
                                <MapPin className="w-4 h-4 mr-1" />
                                Get Directions
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCallClinic}
                                className="flex items-center bg-transparent text-sm"
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Call Clinic
                              </Button>
                            </div>
                          </div>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No upcoming appointments</h3>
                    <p className="text-gray-600 mb-4">Book your next appointment to maintain your dental health</p>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleBookAppointment}>
                      Book New Appointment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="w-5 h-5 mr-2" />
                  Appointment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {completedAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 border rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-medium text-base">
                              {cleanAppointmentType(appointment.appointment_type)}
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 mt-1 gap-1 sm:gap-3">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDate(appointment.appointment_date)}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {formatTime(appointment.appointment_time)}
                              </div>
                            </div>
                            {appointment.notes && <p className="text-sm text-gray-500 mt-1">{appointment.notes}</p>}
                          </div>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No History Yet</h3>
                    <p className="text-gray-600">Your completed appointments will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {recentPayments.length > 0 ? (
                  <div className="space-y-3">
                    {recentPayments.map((payment) => (
                      <div key={payment.id} className="border rounded-lg bg-white p-3">
                        {/* Mobile-optimized payment card layout */}
                        <div className="space-y-2">
                          {/* Status badge and treatment type */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <Badge className={`${getPaymentStatusColor(payment.payment_status)} text-xs mb-1`}>
                                {getPaymentStatusText(payment.payment_status)}
                              </Badge>
                              <h3 className="font-medium text-sm break-words">
                                {cleanAppointmentType(payment.treatment_type || payment.appointment_type)}
                              </h3>
                            </div>
                          </div>

                          {/* Appointment date */}
                          <div className="flex items-center text-xs text-gray-600">
                            <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span>{formatDate(payment.appointment_date)}</span>
                          </div>

                          {/* Payment amounts in a clean grid */}
                          <div className="grid grid-cols-1 gap-1 text-xs pt-2 border-t">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Total Amount</span>
                              <span className="font-medium">
                                {formatCurrency(payment.total_amount || payment.bill_amount || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Amount Paid</span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(payment.amount_paid || payment.paid_amount || 0)}
                              </span>
                            </div>
                            {payment.outstanding_balance > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Outstanding</span>
                                <span className="font-medium text-red-600">
                                  {formatCurrency(payment.outstanding_balance)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Payments Yet</h3>
                    <p className="text-gray-600">Your payment history will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default PatientDashboard
