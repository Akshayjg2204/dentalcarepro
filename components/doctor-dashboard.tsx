"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  Users,
  Clock,
  Stethoscope,
  FileText,
  Plus,
  AlertTriangle,
  User,
  TrendingUp,
  Activity,
  CheckCircle,
  LogOut,
  RefreshCw,
  CalendarIcon,
  Trash2,
  UserCheck,
  CreditCard,
  Check,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  getDoctorAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  type Appointment,
} from "@/lib/appointments"
import { getPaymentsByPatientId } from "@/lib/payments"
import { AppointmentAssignmentModal } from "@/components/appointment-assignment-modal"
import { RescheduleAppointmentModal } from "@/components/reschedule-appointment-modal"
import { CompleteAppointmentModal } from "@/components/complete-appointment-modal"
import { UpdatePaymentModal } from "@/components/update-payment-modal"
import { PatientProfileModal } from "@/components/patient-profile-modal"
import { toast } from "sonner"
import { PatientManagementSection } from "@/components/patient-management"
import { LeadsManagement } from "@/components/leads-management"
import { DueAppointmentsModal } from "@/components/due-appointments-modal"
import { EmergencyAppointmentModal } from "@/components/emergency-appointment-modal"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { TreatmentPlansModal } from "@/components/treatment-plans-modal"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface DoctorDashboardProps {
  user: any
}

interface DashboardStats {
  totalAppointments: number
  pendingAppointments: number
  completedAppointments: number
  todayAppointments: number
}

export function DoctorDashboard({ user }: DoctorDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    todayAppointments: 0,
  })
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dueAppointmentsModal, setDueAppointmentsModal] = useState(false)
  const [walkInModal, setWalkInModal] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [appointmentFilter, setAppointmentFilter] = useState("all")
  const [processingAppointments, setProcessingAppointments] = useState<Set<string>>(new Set())
  const [deletingAppointments, setDeletingAppointments] = useState<Set<string>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [assignmentModalAppointment, setAssignmentModalAppointment] = useState<Appointment | null>(null)
  const [rescheduleModalAppointment, setRescheduleModalAppointment] = useState<Appointment | null>(null)
  const [completeModalAppointment, setCompleteModalAppointment] = useState<Appointment | null>(null)
  const [updatePaymentModal, setUpdatePaymentModal] = useState<any>(null)
  const [patientProfileModal, setPatientProfileModal] = useState<string | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [highlightMyAppointments, setHighlightMyAppointments] = useState(false)
  const [treatmentPlansModal, setTreatmentPlansModal] = useState(false)

  const { signOut } = useAuth()
  const router = useRouter()

  const searchParams = useSearchParams()
  const highlightId = searchParams.get("highlight")

  useEffect(() => {
    fetchDashboardData()
  }, [user.id])

  useEffect(() => {
    const tab = searchParams.get("tab")
    const highlight = searchParams.get("highlight")

    if (tab && highlight && ["overview", "appointments", "patients", "leads"].includes(tab)) {
      setActiveTab(tab)

      setTimeout(() => {
        const url = new URL(window.location.href)
        url.searchParams.delete("tab")
        window.history.replaceState({}, "", url.toString())
      }, 500)
    }
  }, [searchParams])

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
  }

  useEffect(() => {
    if (highlightId && appointments.length > 0) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const element = document.getElementById(`appointment-${highlightId}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })

          // Remove highlight after 3 seconds
          setTimeout(() => {
            const url = new URL(window.location.href)
            url.searchParams.delete("highlight")
            window.history.replaceState({}, "", url.toString())
          }, 3000)
        }
      }, 100)
    }
  }, [highlightId, appointments])

  useEffect(() => {
    filterAppointments()
  }, [appointments, appointmentFilter, highlightMyAppointments])

  useEffect(() => {
    if (appointments.length > 0) {
      fetchPaymentsForAppointments()
    }
  }, [appointments])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      const doctorAppointments = await getDoctorAppointments(user.id)
      const allAppointments = await getAllAppointments()
      setAppointments(allAppointments)

      const today = new Date().toISOString().split("T")[0]
      const totalAppointments = doctorAppointments.length
      const pendingAppointments = doctorAppointments.filter((apt) => apt.status === "pending").length
      const completedAppointments = doctorAppointments.filter((apt) => apt.status === "completed").length
      const todayAppointments = doctorAppointments.filter((apt) => apt.appointment_date === today).length

      setStats({
        totalAppointments,
        pendingAppointments,
        completedAppointments,
        todayAppointments,
      })

      setRecentAppointments(doctorAppointments.slice(0, 5))
    } catch (error: any) {
      console.error("Failed to fetch dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPaymentsForAppointments = async () => {
    try {
      const uniquePatientIds = [...new Set(appointments.map((apt) => apt.patient_id))]
      const allPayments = []

      for (const patientId of uniquePatientIds) {
        const patientPayments = await getPaymentsByPatientId(patientId)
        allPayments.push(...patientPayments)
      }

      setPayments(allPayments)
    } catch (error: any) {
      console.error("Failed to fetch payments:", error)
    }
  }

  const filterAppointments = useCallback(() => {
    let filtered = appointments

    console.log("[v0] Debug - filterAppointments called")
    console.log("[v0] Debug - user.id:", user.id)
    console.log("[v0] Debug - highlightMyAppointments:", highlightMyAppointments)
    console.log(
      "[v0] Debug - appointments:",
      appointments.map((apt) => ({
        id: apt.id,
        assigned_to: apt.assigned_to,
        assigned_doctor_id: apt.assigned_doctor_id,
        doctor_id: apt.doctor_id,
        status: apt.status,
      })),
    )

    if (highlightMyAppointments) {
      filtered = filtered.filter((appointment) => {
        const isAssigned =
          appointment.assigned_to === user.id ||
          appointment.assigned_doctor_id === user.id ||
          appointment.doctor_id === user.id
        console.log("[v0] Debug - appointment", appointment.id, "assigned check:", isAssigned)
        return isAssigned
      })
      console.log("[v0] Debug - filtered appointments count:", filtered.length)
    }

    if (appointmentFilter !== "all") {
      filtered = filtered.filter((appointment) => appointment.status === appointmentFilter)
    }

    setFilteredAppointments(filtered)
  }, [appointments, appointmentFilter, highlightMyAppointments, user.id])

  const fetchAppointments = useCallback(async () => {
    try {
      const appointmentsData = await getAllAppointments()
      setAppointments(appointmentsData)
    } catch (error: any) {
      console.error("Failed to fetch appointments:", error)
      toast.error("Failed to fetch appointments")
    }
  }, [])

  const handleRefreshAppointments = async () => {
    setIsRefreshing(true)
    await fetchAppointments()
    setIsRefreshing(false)
    toast.success("Appointments refreshed!")
  }

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await signOut()
      router.push("/login")
    } catch (error: any) {
      toast.error("Failed to sign out")
      setSigningOut(false)
    }
  }

  const handleAppointmentAction = async (appointmentId: string, action: "approved" | "rejected") => {
    setProcessingAppointments((prev) => new Set(prev).add(appointmentId))

    try {
      await updateAppointmentStatus(appointmentId, action)
      toast.success(`Appointment ${action} successfully!`)
      fetchAppointments()
      fetchDashboardData()
    } catch (error: any) {
      toast.error(`Failed to ${action.slice(0, -1)} appointment: ` + (error.message || "Unknown error"))
    } finally {
      setProcessingAppointments((prev) => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  const getAppointmentPayment = (appointmentId: string) => {
    return payments.find((payment) => payment.appointment_id === appointmentId)
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

  const handleUpdatePayment = (appointment: Appointment) => {
    const payment = getAppointmentPayment(appointment.id)
    if (payment) {
      setUpdatePaymentModal(payment)
    } else {
      toast.error("No payment record found for this appointment")
    }
  }

  const handleCompleteAppointment = async (appointment: Appointment) => {
    setCompleteModalAppointment(appointment)
  }

  const handleAppointmentCompleted = (patientId?: string, shouldOpenProfile?: boolean) => {
    fetchAppointments()
    fetchDashboardData()
    if (shouldOpenProfile && patientId) {
      setPatientProfileModal(patientId)
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) {
      return
    }

    setDeletingAppointments((prev) => new Set(prev).add(appointmentId))

    try {
      const { error } = await supabase.from("appointments").delete().eq("id", appointmentId)

      if (error) throw error

      toast.success("Appointment deleted successfully!")
      fetchAppointments()
      fetchDashboardData()
    } catch (error: any) {
      toast.error("Failed to delete appointment: " + (error.message || "Unknown error"))
    } finally {
      setDeletingAppointments((prev) => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "normal":
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const [loading, setLoading] = useState(false)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back, Dr. {user.first_name}</h1>
            <p className="text-gray-600 mt-1">Here's what's happening with your patients today</p>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center bg-transparent p-2 sm:px-3 sm:py-2"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Sign Out</span>
          </Button>
        </div>

        {/* Stats Cards - Above Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Appointments</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalAppointments}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.pendingAppointments}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.completedAppointments}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Today</p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.todayAppointments}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Appointments</span>
              {stats.pendingAppointments > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                  {stats.pendingAppointments}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Patient Management</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Leads</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <p className="text-sm text-gray-600">Common tasks for doctors</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 bg-transparent hover:bg-orange-50 border-orange-200 text-xs sm:text-sm"
                        onClick={() => setDueAppointmentsModal(true)}
                      >
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                        <div className="text-center">
                          <div className="font-medium text-orange-900">Due Assignments</div>
                          <div className="text-xs text-orange-600 hidden sm:block">
                            Appointments not completed today
                          </div>
                        </div>
                      </Button>

                      <Link href="/doctor/patient-records" className="w-full">
                        <Button
                          variant="outline"
                          className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 bg-transparent hover:bg-green-50 border-green-200 text-xs sm:text-sm w-full"
                        >
                          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                          <div className="text-center">
                            <div className="font-medium text-green-900">Patient Records</div>
                            <div className="text-xs text-green-600 hidden sm:block">View patient information</div>
                          </div>
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 bg-transparent hover:bg-red-50 border-red-200 text-xs sm:text-sm"
                        onClick={() => setWalkInModal(true)}
                      >
                        <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                        <div className="text-center">
                          <div className="font-medium text-red-900">Walk-in</div>
                          <div className="text-xs text-red-600 hidden sm:block">Schedule urgent care</div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 bg-transparent hover:bg-blue-50 border-blue-200 text-xs sm:text-sm"
                        onClick={() => setTreatmentPlansModal(true)}
                      >
                        <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        <div className="text-center">
                          <div className="font-medium text-blue-900">Treatment Plans</div>
                          <div className="text-xs text-blue-600 hidden sm:block">Manage treatment plans</div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <CardTitle>Recent Appointments</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recentAppointments.length === 0 ? (
                      <div className="text-center py-6">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments yet</h3>
                        <p className="text-gray-600 text-sm">Your assigned appointments will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentAppointments.map((appointment) => (
                          <div key={appointment.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">
                                  {appointment.patient?.first_name} {appointment.patient?.last_name}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">{appointment.appointment_type}</p>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {formatDate(appointment.appointment_date)}
                                  <Clock className="w-3 h-3 ml-2 mr-1" />
                                  {formatTime(appointment.appointment_time)}
                                </div>
                              </div>
                              <Badge className={`${getStatusColor(appointment.status)} text-xs ml-2`}>
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-5 h-5" />
                    <CardTitle>Appointments Management</CardTitle>
                    <Badge variant="secondary">{appointments.length} total</Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <Button
                      onClick={handleRefreshAppointments}
                      variant="outline"
                      size="sm"
                      disabled={isRefreshing}
                      className="flex items-center gap-2 bg-transparent"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>

                    <Button
                      onClick={() => setHighlightMyAppointments(!highlightMyAppointments)}
                      variant={highlightMyAppointments ? "default" : "outline"}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <UserCheck className="h-4 w-4" />
                      My Appointments
                    </Button>

                    <Select value={appointmentFilter} onValueChange={setAppointmentFilter}>
                      <SelectTrigger className="w-32 sm:w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
                    <p className="text-gray-600">
                      {appointmentFilter === "all"
                        ? "No appointments have been scheduled yet."
                        : `No ${appointmentFilter} appointments found.`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAppointments
                      .sort((a, b) => {
                        const isAAssignedToMe = a.assigned_to === user.id
                        const isBAssignedToMe = b.assigned_to === user.id

                        // If one is assigned to current doctor and other isn't, prioritize the assigned one
                        if (isAAssignedToMe && !isBAssignedToMe) return -1
                        if (!isAAssignedToMe && isBAssignedToMe) return 1

                        // If both or neither are assigned to current doctor, use existing sorting logic
                        const statusOrder = { pending: 0, approved: 1, outstanding: 2, completed: 3, cancelled: 4 }
                        const aOrder = statusOrder[a.status] ?? 5
                        const bOrder = statusOrder[b.status] ?? 5
                        if (aOrder !== bOrder) return aOrder - bOrder
                        return new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
                      })
                      .map((appointment) => {
                        const isMyAppointment = appointment.assigned_to === user.id
                        const shouldHighlight = highlightMyAppointments && isMyAppointment
                        const payment = getAppointmentPayment(appointment.id)

                        return (
                          <div
                            key={appointment.id}
                            id={`appointment-${appointment.id}`}
                            className={`bg-white rounded-lg border p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow ${
                              shouldHighlight ? "ring-2 ring-blue-500 bg-blue-50" : ""
                            } ${
                              highlightId === appointment.id ? "ring-2 ring-blue-500 bg-blue-50 border-blue-300" : ""
                            }`}
                          >
                            {/* Mobile Layout */}
                            <div className="block sm:hidden space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-base">{appointment.appointment_type}</h3>
                                  <p className="text-sm text-gray-600 truncate">
                                    {appointment.patient?.first_name} {appointment.patient?.last_name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">{appointment.patient?.email}</p>
                                </div>
                                <Badge className={`${getStatusColor(appointment.status)} text-xs ml-2 flex-shrink-0`}>
                                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <div>
                                  <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
                                  <p className="text-gray-600">{formatTime(appointment.appointment_time)}</p>
                                </div>
                                {payment && (
                                  <div className="text-right">
                                    <Badge className={`${getPaymentStatusColor(payment.payment_status)} text-xs`}>
                                      {payment.payment_status === "fully_paid" && "Fully Paid"}
                                      {payment.payment_status === "partial_paid" && "Partial Paid"}
                                      {payment.payment_status === "not_paid" && "Not Paid"}
                                    </Badge>
                                  </div>
                                )}
                              </div>

                              {/* Staff and Doctor Assignment */}
                              {(appointment.doctor || appointment.staff || appointment.preferred_doctor) && (
                                <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                                  {appointment.doctor && (
                                    <div className="flex items-center">
                                      <Stethoscope className="w-3 h-3 mr-1 text-green-600" />
                                      <span>
                                        Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                                      </span>
                                    </div>
                                  )}
                                  {appointment.staff && (
                                    <div className="flex items-center">
                                      <Users className="w-3 h-3 mr-1 text-blue-600" />
                                      <span>
                                        {appointment.staff.first_name} {appointment.staff.last_name}
                                      </span>
                                    </div>
                                  )}
                                  {!appointment.doctor && !appointment.staff && appointment.preferred_doctor && (
                                    <div className="flex items-center text-orange-600">
                                      <UserCheck className="w-3 h-3 mr-1" />
                                      <span>Prefers: {appointment.preferred_doctor}</span>
                                    </div>
                                  )}
                                  {!appointment.doctor && !appointment.staff && !appointment.preferred_doctor && (
                                    <div className="flex items-center text-gray-500">
                                      <UserCheck className="w-3 h-3 mr-1" />
                                      <span>No staff assigned</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Payment Details */}
                              {payment && appointment.status === "completed" && (
                                <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span>Bill Amount:</span>
                                    <span>Rs {payment.bill_amount.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Paid Amount:</span>
                                    <span>Rs {payment.paid_amount.toFixed(2)}</span>
                                  </div>
                                  {payment.bill_amount > payment.paid_amount && (
                                    <div className="flex justify-between text-red-600 font-medium">
                                      <span>Outstanding:</span>
                                      <span>Rs {(payment.bill_amount - payment.paid_amount).toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {appointment.notes && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">Notes: </span>
                                  <span className="text-gray-600">{appointment.notes}</span>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2">
                                {appointment.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAppointmentAction(appointment.id, "approved")}
                                      disabled={processingAppointments.has(appointment.id)}
                                      className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-7"
                                    >
                                      {processingAppointments.has(appointment.id) ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                      ) : (
                                        <>
                                          <Check className="w-3 h-3 mr-1" />
                                          Approve
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAppointmentAction(appointment.id, "rejected")}
                                      disabled={processingAppointments.has(appointment.id)}
                                      className="border-red-600 text-red-600 hover:bg-red-50 text-xs px-2 py-1 h-7"
                                    >
                                      {processingAppointments.has(appointment.id) ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                      ) : (
                                        <>
                                          <X className="w-3 h-3 mr-1" />
                                          Reject
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}
                                {appointment.status === "approved" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleCompleteAppointment(appointment)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-7"
                                  >
                                    <CreditCard className="w-3 h-3 mr-1" />
                                    Complete
                                  </Button>
                                )}
                                {payment &&
                                  appointment.status === "completed" &&
                                  payment.bill_amount > payment.paid_amount && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUpdatePayment(appointment)}
                                      className="border-yellow-600 text-yellow-600 hover:bg-yellow-50 text-xs px-2 py-1 h-7"
                                    >
                                      <CreditCard className="w-3 h-3 mr-1" />
                                      Update Payment
                                    </Button>
                                  )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAssignmentModalAppointment(appointment)}
                                  className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 text-xs px-2 py-1 h-7"
                                >
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  Assign
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRescheduleModalAppointment(appointment)}
                                  className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 text-xs px-2 py-1 h-7"
                                >
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Reschedule
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteAppointment(appointment.id)}
                                  disabled={deletingAppointments.has(appointment.id)}
                                  className="border-red-600 text-red-600 hover:bg-red-50 text-xs px-2 py-1 h-7"
                                >
                                  {deletingAppointments.has(appointment.id) ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden sm:flex sm:items-center justify-between">
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                  <div className="flex-1">
                                    <h3 className="font-medium text-base">{appointment.appointment_type}</h3>
                                    <p className="text-sm text-gray-600">
                                      {appointment.patient?.first_name} {appointment.patient?.last_name}
                                    </p>
                                    <p className="text-sm text-gray-500">{appointment.patient?.email}</p>
                                  </div>
                                  <div className="text-left sm:text-center">
                                    <p className="text-sm font-medium">{formatDate(appointment.appointment_date)}</p>
                                    <p className="text-sm text-gray-600">{formatTime(appointment.appointment_time)}</p>
                                  </div>
                                  {/* Staff and Doctor Assignment */}
                                  <div className="text-left sm:text-center">
                                    <p className="text-xs text-gray-500 mb-1">Assigned to</p>
                                    {appointment.doctor && (
                                      <div className="flex items-center text-xs text-green-600 mb-1">
                                        <Stethoscope className="w-3 h-3 mr-1" />
                                        <span>
                                          Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                                        </span>
                                      </div>
                                    )}
                                    {appointment.staff && (
                                      <div className="flex items-center text-xs text-blue-600 mb-1">
                                        <Users className="w-3 h-3 mr-1" />
                                        <span>
                                          {appointment.staff.first_name} {appointment.staff.last_name}
                                        </span>
                                      </div>
                                    )}
                                    {!appointment.doctor && !appointment.staff && appointment.preferred_doctor && (
                                      <div className="flex items-center text-xs text-orange-600">
                                        <UserCheck className="w-3 h-3 mr-1" />
                                        <span>Prefers: {appointment.preferred_doctor}</span>
                                      </div>
                                    )}
                                    {!appointment.doctor && !appointment.staff && !appointment.preferred_doctor && (
                                      <div className="flex items-center text-xs text-gray-400">
                                        <UserCheck className="w-3 h-3 mr-1" />
                                        <span>Not assigned</span>
                                      </div>
                                    )}
                                  </div>
                                  {appointment.notes && (
                                    <div className="max-w-full sm:max-w-xs">
                                      <p className="text-sm text-gray-600">
                                        <strong>Notes:</strong> {appointment.notes}
                                      </p>
                                    </div>
                                  )}
                                  {/* Payment Status */}
                                  {payment && (
                                    <div className="text-left sm:text-center">
                                      <p className="text-xs text-gray-500 mb-1">Payment</p>
                                      <Badge className={`text-xs ${getPaymentStatusColor(payment.payment_status)}`}>
                                        {payment.payment_status === "fully_paid" && "Fully Paid"}
                                        {payment.payment_status === "partial_paid" && "Partial Paid"}
                                        {payment.payment_status === "not_paid" && "Not Paid"}
                                      </Badge>
                                      {appointment.status === "completed" && (
                                        <>
                                          <p className="text-xs text-gray-500 mt-1">
                                            Bill Amount: Rs {payment.bill_amount.toFixed(2)}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            Paid Amount: Rs {payment.paid_amount.toFixed(2)}
                                          </p>
                                          {payment.bill_amount > payment.paid_amount && (
                                            <p className="text-xs text-red-600 font-medium">
                                              Outstanding: Rs {(payment.bill_amount - payment.paid_amount).toFixed(2)}
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-3">
                                {appointment.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleAppointmentAction(appointment.id, "approved")}
                                      disabled={processingAppointments.has(appointment.id)}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      {processingAppointments.has(appointment.id) ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      ) : (
                                        <Check className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAppointmentAction(appointment.id, "rejected")}
                                      disabled={processingAppointments.has(appointment.id)}
                                      className="border-red-600 text-red-600 hover:bg-red-50"
                                    >
                                      {processingAppointments.has(appointment.id) ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                      ) : (
                                        <X className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </div>
                                )}
                                {appointment.status === "approved" && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleCompleteAppointment(appointment)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      <CreditCard className="w-4 h-4 mr-1" />
                                      Complete
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setAssignmentModalAppointment(appointment)}
                                      className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                                    >
                                      <UserCheck className="w-4 h-4 mr-1" />
                                      Assign
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setRescheduleModalAppointment(appointment)}
                                      className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                                    >
                                      <Calendar className="w-4 h-4 mr-1" />
                                      Reschedule
                                    </Button>
                                  </div>
                                )}
                                {appointment.status !== "pending" &&
                                  appointment.status !== "rejected" &&
                                  appointment.status !== "approved" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setAssignmentModalAppointment(appointment)}
                                        className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                                      >
                                        <UserCheck className="w-4 h-4 mr-1" />
                                        Assign
                                      </Button>
                                      {appointment.status !== "completed" && appointment.status !== "cancelled" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setRescheduleModalAppointment(appointment)}
                                          className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                                        >
                                          <Calendar className="w-4 h-4 mr-1" />
                                          Reschedule
                                        </Button>
                                      )}
                                    </>
                                  )}
                                {payment &&
                                  appointment.status === "completed" &&
                                  payment.bill_amount > payment.paid_amount && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUpdatePayment(appointment)}
                                      className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                                    >
                                      <CreditCard className="w-4 h-4 mr-1" />
                                      Update Payment
                                    </Button>
                                  )}
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteAppointment(appointment.id)}
                                    disabled={deletingAppointments.has(appointment.id)}
                                    className="border-red-600 text-red-600 hover:bg-red-50"
                                  >
                                    {deletingAppointments.has(appointment.id) ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients">
            <PatientManagementSection currentUserId={user.id} currentUserRole={user.role} />
          </TabsContent>

          <TabsContent value="leads">
            <LeadsManagement currentUserId={user.id} currentUserRole={user.role} />
          </TabsContent>
        </Tabs>

        <DueAppointmentsModal
          isOpen={dueAppointmentsModal}
          onClose={() => setDueAppointmentsModal(false)}
          appointments={appointments}
          payments={payments}
          onCompleteAppointment={handleCompleteAppointment}
          onAssignAppointment={(appointment) => setAssignmentModalAppointment(appointment)}
          onAppointmentUpdated={fetchAppointments}
        />

        <EmergencyAppointmentModal
          isOpen={walkInModal}
          onClose={() => setWalkInModal(false)}
          onAppointmentCreated={fetchDashboardData}
          currentUserRole="doctor"
        />

        <AppointmentAssignmentModal
          isOpen={!!assignmentModalAppointment}
          onClose={() => setAssignmentModalAppointment(null)}
          appointment={assignmentModalAppointment}
          onAssignmentUpdated={() => {
            fetchAppointments()
            fetchDashboardData()
          }}
        />

        <RescheduleAppointmentModal
          isOpen={!!rescheduleModalAppointment}
          onClose={() => setRescheduleModalAppointment(null)}
          appointment={rescheduleModalAppointment}
          onAppointmentRescheduled={() => {
            fetchAppointments()
            fetchDashboardData()
          }}
        />

        <CompleteAppointmentModal
          isOpen={!!completeModalAppointment}
          onClose={() => setCompleteModalAppointment(null)}
          appointment={completeModalAppointment}
          onAppointmentCompleted={handleAppointmentCompleted}
        />

        {updatePaymentModal && (
          <UpdatePaymentModal
            isOpen={!!updatePaymentModal}
            onClose={() => setUpdatePaymentModal(null)}
            payment={updatePaymentModal}
            onPaymentUpdated={() => {
              fetchPaymentsForAppointments()
              setUpdatePaymentModal(null)
            }}
          />
        )}

        {patientProfileModal && (
          <PatientProfileModal
            isOpen={!!patientProfileModal}
            onClose={() => setPatientProfileModal(null)}
            patientId={patientProfileModal}
            currentUserId={user.id}
            currentUserRole={user.role}
            defaultTab="billing"
          />
        )}
        <TreatmentPlansModal
          isOpen={treatmentPlansModal}
          onClose={() => setTreatmentPlansModal(false)}
          currentUserId={user.id}
          currentUserRole={user.role}
        />
      </div>
    </div>
  )
}
