"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CreateUserModal } from "@/components/create-user-modal"
import { signOut, updateUserRole, deleteUser, cleanupOrphanedAuthUsers } from "@/lib/auth"
import { getAllAppointments, updateAppointmentStatus, type Appointment } from "@/lib/appointments"
import { getAllPayments, getPaymentByAppointmentId, type Payment, getDuePayments } from "@/lib/payments"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import {
  Search,
  UserPlus,
  UsersIcon,
  Trash2,
  Check,
  X,
  CalendarIcon,
  AlertTriangle,
  UserCheck,
  Target,
  RefreshCw,
  CreditCard,
  Stethoscope,
  ArrowLeft,
  LogOut,
  Calendar,
  IndianRupee,
  Users,
  CalendarDays,
  FileText,
  Settings,
  Plus,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CompleteAppointmentModal } from "@/components/complete-appointment-modal"
import { getPaymentStats } from "@/lib/payments"
import { EmergencyAppointmentModal } from "@/components/emergency-appointment-modal"
import { PatientProfileModal } from "@/components/patient-profile-modal"
import { PatientManagementSection } from "@/components/patient-management"
import { AppointmentAssignmentModal } from "@/components/appointment-assignment-modal"
import { DueAppointmentsModal } from "@/components/due-appointments-modal"
import { LeadsManagement } from "@/components/leads-management"
import { UpdatePaymentModal } from "@/components/update-payment-modal"
import { RescheduleAppointmentModal } from "@/components/reschedule-appointment-modal"

export default function AdminDashboard() {
  const { user, profile, loading } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  const [signingOut, setSigningOut] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [appointmentFilter, setAppointmentFilter] = useState("all")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const [processingAppointments, setProcessingAppointments] = useState<Set<string>>(new Set())
  const [deletingAppointments, setDeletingAppointments] = useState<Set<string>>(new Set())
  const router = useRouter()
  const [completeModalAppointment, setCompleteModalAppointment] = useState<Appointment | null>(null)
  const [assignmentModalAppointment, setAssignmentModalAppointment] = useState<Appointment | null>(null)
  const [rescheduleModalAppointment, setRescheduleModalAppointment] = useState<Appointment | null>(null)
  const [paymentStats, setPaymentStats] = useState({
    totalRevenue: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    fullyPaidCount: 0,
    partialPaidCount: 0,
    notPaidCount: 0,
  })
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false)
  const [patientProfileModal, setPatientProfileModal] = useState<{
    isOpen: boolean
    patientId: string
    initialTab?: string
    appointmentId?: string
  }>({
    isOpen: false,
    patientId: "",
    initialTab: "",
  })
  const [isDueAppointmentsModalOpen, setIsDueAppointmentsModalOpen] = useState(false)
  const [updatePaymentModal, setUpdatePaymentModal] = useState<{
    isOpen: boolean
    payment: Payment | null
    appointment: Appointment | null
  }>({
    isOpen: false,
    payment: null,
    appointment: null,
  })

  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<string | null>(null)

  // State for new features
  const [duePayments, setDuePayments] = useState<Payment[]>([])
  const [isDuePaymentsExpanded, setIsDuePaymentsExpanded] = useState(false)
  const [isDuePaymentsModalOpen, setIsDuePaymentsModalOpen] = useState(false) // Added this line

  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get("tab")
    const highlight = searchParams.get("highlight")

    if (tab && ["overview", "appointments", "patients", "leads", "users"].includes(tab) && tab !== activeTab) {
      setActiveTab(tab)
    }

    // Handle appointment highlighting
    if (highlight && tab === "appointments") {
      setHighlightedAppointmentId(highlight)
      // Clear highlight after 3 seconds and clean URL
      setTimeout(() => {
        setHighlightedAppointmentId(null)
        router.replace("/admin?tab=appointments", { scroll: false })
      }, 3000)
    }
  }, [searchParams, activeTab, router])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Clear any URL parameters when switching tabs manually
    router.replace(`/admin?tab=${value}`, { scroll: false })
  }

  // Memoized computed values for better performance
  const pendingAppointments = useMemo(() => appointments.filter((apt) => apt.status === "pending"), [appointments])

  const memoizedPaymentLookup = useMemo(() => {
    const lookup = new Map<string, Payment>()
    payments.forEach((payment) => {
      if (payment.appointment_id) {
        lookup.set(payment.appointment_id, payment)
      }
    })
    return lookup
  }, [payments])

  // Optimized filter functions with debouncing
  const filterAppointments = useCallback(() => {
    let filtered = appointments

    if (appointmentFilter !== "all") {
      filtered = filtered.filter((appointment) => appointment.status === appointmentFilter)
    }

    setFilteredAppointments(filtered)
  }, [appointments, appointmentFilter])

  const filterUsers = useCallback(() => {
    let filtered = users

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.first_name.toLowerCase().includes(searchLower) ||
          user.last_name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower),
      )
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter])

  // Memoized data fetching functions
  const fetchPaymentStats = useCallback(async () => {
    try {
      const stats = await getPaymentStats()
      setPaymentStats(stats)
    } catch (error: any) {
      console.error("Failed to fetch payment stats:", error)
    }
  }, [])

  const fetchPayments = useCallback(async () => {
    try {
      const paymentsData = await getAllPayments()
      setPayments(paymentsData)
    } catch (error: any) {
      console.error("Failed to fetch payments:", error)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Fetch users error:", error)
        throw error
      }

      setUsers(data || [])
    } catch (error: any) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to fetch users: " + (error.message || "Unknown error"))
    }
  }, [])

  const fetchAppointments = useCallback(async () => {
    try {
      const appointmentsData = await getAllAppointments()
      setAppointments(appointmentsData)
    } catch (error: any) {
      console.error("Failed to fetch appointments:", error)
      toast.error("Failed to fetch appointments")
    }
  }, [])

  // New fetch function for due payments
  const fetchDuePayments = useCallback(async () => {
    try {
      const duePaymentsData = await getDuePayments()
      setDuePayments(duePaymentsData)
    } catch (error: any) {
      console.error("Failed to fetch due payments:", error)
    }
  }, [])

  // Debounced filter effects
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      filterUsers()
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [filterUsers])

  useEffect(() => {
    filterAppointments()
  }, [filterAppointments])

  // Optimized helper functions
  const getAppointmentPaymentLookup = useCallback(
    (appointmentId: string) => {
      return memoizedPaymentLookup.get(appointmentId)
    },
    [memoizedPaymentLookup],
  )

  useEffect(() => {
    if (loading || signingOut) return

    if (!user || !profile) {
      console.log("No user or profile, redirecting to login")
      toast.error("Access denied. Please log in.")
      router.push("/login")
      return
    }

    if (profile.role !== "admin") {
      console.log("User role is not admin:", profile.role)
      toast.error("Access denied. Admin privileges required.")
      router.push("/login")
      return
    }

    console.log("Admin access granted for user:", profile.email)

    // Initialize dashboard data
    const initializeDashboard = async () => {
      try {
        await Promise.all([fetchUsers(), fetchAppointments(), fetchPaymentStats(), fetchPayments(), fetchDuePayments()])
      } catch (error) {
        console.error("Dashboard initialization error:", error)
      }
    }

    initializeDashboard()
  }, [
    user,
    profile,
    loading,
    signingOut,
    router,
    fetchUsers,
    fetchAppointments,
    fetchPaymentStats,
    fetchPayments,
    fetchDuePayments,
  ])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await signOut()
      toast.success("Signed out successfully")
      router.push("/login")
    } catch (error: any) {
      console.error("Sign out error:", error)
      toast.error("Signed out (with errors)")
      router.push("/login")
    } finally {
      setSigningOut(false)
    }
  }

  const handleRefreshAppointments = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([fetchAppointments(), fetchPaymentStats(), fetchPayments(), fetchDuePayments()])
      toast.success("Appointments refreshed successfully!")
    } catch (error: any) {
      console.error("Failed to refresh appointments:", error)
      toast.error("Failed to refresh appointments")
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchAppointments, fetchPaymentStats, fetchPayments, fetchDuePayments])

  const handleUserCreated = useCallback(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole as "doctor" | "staff" | "patient")
      toast.success("User role updated successfully!")
      fetchUsers()
      setEditingUserId(null)
    } catch (error: any) {
      toast.error("Failed to update user role: " + (error.message || "Unknown error"))
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    setDeletingUserId(userId)
    try {
      const result = await deleteUser(userId)

      if (result.success) {
        if (result.authUserDeleted) {
          toast.success("User deleted successfully from both profile and authentication!")
        } else {
          toast.success("User profile deleted successfully!")
          if (result.warning) {
            toast.warning(result.warning)
          }
          if (result.message && result.message.includes("cleanup function")) {
            toast.info("Use the 'Create User' modal to clean up orphaned authentication users if needed.")
          }
        }
        fetchUsers()
      } else {
        toast.error("Failed to delete user: " + (result.message || "Unknown error"))
      }
    } catch (error: any) {
      toast.error("Failed to delete user: " + (error.message || "Unknown error"))
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleAppointmentAction = async (appointmentId: string, action: "approved" | "rejected") => {
    setProcessingAppointments((prev) => new Set(prev).add(appointmentId))

    try {
      await updateAppointmentStatus(appointmentId, action)
      toast.success(`Appointment ${action} successfully!`)
      fetchAppointments()
      fetchPaymentStats()
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
      fetchPaymentStats()
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

  const handleCleanupOrphanedUsers = async () => {
    if (!confirm("This will remove any authentication users that don't have profiles. Continue?")) {
      return
    }

    setIsCleaningUp(true)
    try {
      await cleanupOrphanedAuthUsers()
      toast.success("Cleanup completed successfully!")
    } catch (error: any) {
      toast.error("Cleanup failed: " + (error.message || "Unknown error"))
    } finally {
      setIsCleaningUp(false)
    }
  }

  const handleDueAppointmentsClick = () => {
    const today = new Date().toISOString().split("T")[0]
    const dueAppointments = appointments.filter((apt) => apt.status === "approved" && apt.appointment_date <= today)

    if (dueAppointments.length === 0) {
      toast.info("No due appointments for today")
    } else {
      setIsDueAppointmentsModalOpen(true)
    }
  }

  const handleCompleteAppointmentNav = (appointment: Appointment) => {
    // Navigate to payments page with appointment context
    const searchParams = new URLSearchParams({
      appointmentId: appointment.id,
      patientId: appointment.patient_id,
      action: "complete",
    })

    router.push(`/payments?${searchParams.toString()}`)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200"
      case "doctor":
        return "bg-green-100 text-green-800 border-green-200"
      case "staff":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "patient":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
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

  // Get payment for an appointment
  const getAppointmentPayment = useCallback(
    (appointmentId: string) => {
      return payments.find((payment) => payment.appointment_id === appointmentId)
    },
    [payments],
  )

  const handleCompleteAppointment = useCallback(
    (appointment: Appointment) => {
      // Navigate to payments page with appointment context
      const searchParams = new URLSearchParams({
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        action: "complete",
      })

      router.push(`/payments?${searchParams.toString()}`)
    },
    [router],
  )

  const handleAssignmentUpdated = useCallback(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const handleUpdatePayment = useCallback(
    async (appointment: Appointment) => {
      try {
        const payment = await getPaymentByAppointmentId(appointment.id)
        if (payment) {
          setUpdatePaymentModal({
            isOpen: true,
            payment,
            appointment,
          })
        } else {
          toast.error("No payment record found for this appointment")
        }
      } catch (error) {
        console.error("Error fetching payment:", error)
        toast.error("Failed to load payment information")
      }
    },
    [getPaymentByAppointmentId],
  )

  const handlePaymentUpdated = useCallback(
    (updatedPayment: Payment) => {
      // Refresh the appointments data to show updated payment info
      fetchAppointments()
      setUpdatePaymentModal({
        isOpen: false,
        payment: null,
        appointment: null,
      })
      toast.success("Payment updated successfully!")
    },
    [fetchAppointments],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || profile.role !== "admin") {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Back to Home</span>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Welcome back, {profile?.first_name}</p>
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
        {/* Stats Cards - Above Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Pending Appointments</p>
                  <p className="text-2xl sm:text-3xl font-bold">{pendingAppointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                  <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl sm:text-3xl font-bold">Rs {paymentStats.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Outstanding Balance</p>
                  <p className="text-2xl sm:text-3xl font-bold">Rs {paymentStats.totalOutstanding.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl sm:text-3xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6 sm:space-y-8">
          <TabsList className="grid w-full grid-cols-5 max-w-4xl mx-auto h-14 sm:h-16 p-1 sm:p-2 bg-gray-100 rounded-xl">
            <TabsTrigger
              value="overview"
              className="flex items-center justify-center space-x-1 h-10 sm:h-12 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger
              value="appointments"
              className="flex items-center justify-center space-x-1 h-10 sm:h-12 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 relative"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Appointments</span>
              <span className="sm:hidden">Appts</span>
              {pendingAppointments.length > 0 && (
                <Badge className="ml-1 bg-red-500 text-white text-xs px-1 py-0 min-w-[1.25rem] h-5 rounded-full">
                  {pendingAppointments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="patients"
              className="flex items-center justify-center space-x-1 h-10 sm:h-12 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Patient Management</span>
              <span className="sm:hidden">Patients</span>
            </TabsTrigger>
            <TabsTrigger
              value="leads"
              className="flex items-center justify-center space-x-1 h-10 sm:h-12 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Leads</span>
              <span className="sm:hidden">Leads</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="flex items-center justify-center space-x-1 h-10 sm:h-12 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">User Management</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions and Recent Users */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <p className="text-sm text-gray-600">Common administrative tasks</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <Button
                      variant="outline"
                      className="h-16 sm:h-20 flex-col space-y-1 sm:space-y-2 bg-transparent w-full text-xs sm:text-sm"
                      onClick={handleDueAppointmentsClick}
                    >
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                      <div className="text-center">
                        <p className="font-medium">Due Assignments</p>
                        <p className="text-xs text-gray-500 hidden sm:block">Appointments not completed today</p>
                      </div>
                    </Button>

                    <Link href="/admin/patient-records" className="w-full">
                      <Button
                        variant="outline"
                        className="h-16 sm:h-20 flex-col space-y-1 sm:space-y-2 bg-transparent w-full text-xs sm:text-sm"
                      >
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                        <div className="text-center">
                          <p className="font-medium">Patient Records</p>
                          <p className="text-xs text-gray-500 hidden sm:block">View patient information</p>
                        </div>
                      </Button>
                    </Link>

                    <Link href="/admin/settings">
                      <Button
                        variant="outline"
                        className="h-16 sm:h-20 flex-col space-y-1 sm:space-y-2 bg-transparent w-full text-xs sm:text-sm"
                      >
                        <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                        <div className="text-center">
                          <p className="font-medium">Clinic Settings</p>
                          <p className="text-xs text-gray-500 hidden sm:block">Configure clinic details</p>
                        </div>
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      className="h-16 sm:h-20 flex-col space-y-1 sm:space-y-2 bg-transparent text-xs sm:text-sm"
                      onClick={() => setIsWalkInModalOpen(true)}
                    >
                      <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                      <div className="text-center">
                        <p className="font-medium">Walk-in</p>
                        <p className="text-xs text-gray-500 hidden sm:block">Schedule urgent care</p>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-16 sm:h-20 flex-col space-y-1 sm:space-y-2 bg-transparent w-full text-xs sm:text-sm col-span-2"
                      onClick={() => setIsDuePaymentsModalOpen(true)}
                    >
                      <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                      <div className="text-center">
                        <p className="font-medium">Payment Due</p>
                        <p className="text-xs text-gray-500 hidden sm:block">
                          {duePayments.length} outstanding payment{duePayments.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Users */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0">
                  <div className="flex-1">
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Recent Users
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {users.slice(0, 5).length > 0 ? (
                    <div className="space-y-3">
                      {users.slice(0, 5).map((user) => (
                        <div key={user.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {user.first_name[0]}
                                {user.last_name[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No users yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshAppointments}
                      disabled={isRefreshing}
                      className="flex items-center gap-2 bg-transparent"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Select value={appointmentFilter} onValueChange={setAppointmentFilter}>
                      <SelectTrigger className="w-32 sm:w-40">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {filteredAppointments
                      .sort((a, b) => {
                        const statusOrder = { pending: 0, approved: 1, outstanding: 2, completed: 3, cancelled: 4 }
                        const aOrder = statusOrder[a.status] ?? 5
                        const bOrder = statusOrder[b.status] ?? 5
                        if (aOrder !== bOrder) return aOrder - bOrder
                        // Secondary sort by date (newest first)
                        return new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
                      })
                      .map((appointment) => {
                        const payment = getAppointmentPayment(appointment.id)
                        const isHighlighted = highlightedAppointmentId === appointment.id
                        const highlightClass = isHighlighted ? "ring-2 ring-blue-500 bg-blue-50" : ""

                        return (
                          <div key={appointment.id} className={`p-3 sm:p-4 border rounded-lg ${highlightClass}`}>
                            {/* Mobile Layout */}
                            <div className="block sm:hidden space-y-3">
                              {/* Header with appointment type and status */}
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-base truncate">{appointment.appointment_type}</h3>
                                  <p className="text-sm text-gray-600 truncate">
                                    {appointment.patient?.first_name} {appointment.patient?.last_name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">{appointment.patient?.email}</p>
                                </div>
                                <Badge className={`${getStatusColor(appointment.status)} text-xs ml-2 flex-shrink-0`}>
                                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                </Badge>
                              </div>

                              {/* Date and Time */}
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

                              {/* Notes */}
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
                                      {payment.payment_status === "partial_paid" && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          Rs {payment.paid_amount.toFixed(2)} / Rs {payment.bill_amount.toFixed(2)}
                                        </p>
                                      )}
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
                                {/* Show Assign button for all appointments except pending and rejected */}
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
                                  <Badge className={getStatusColor(appointment.status)}>
                                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
                    <p className="text-gray-600">
                      {appointmentFilter !== "all"
                        ? `No ${appointmentFilter} appointments at the moment`
                        : "No appointments have been scheduled yet"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients">
            <PatientManagementSection currentUserId={profile?.id || ""} currentUserRole={profile?.role || ""} />
          </TabsContent>

          <TabsContent value="leads">
            <LeadsManagement currentUserId={profile?.id || ""} currentUserRole={profile?.role || ""} />
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <UsersIcon className="w-5 h-5" />
                    <CardTitle>User Management</CardTitle>
                    <Badge variant="secondary">{users.length} total</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
                      size="sm"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create User
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="patient">Patient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Users List */}
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <UsersIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No users found</h3>
                    <p className="text-gray-600">
                      {searchTerm || roleFilter !== "all"
                        ? "Try adjusting your search or filter criteria"
                        : "Create your first user to get started"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-3 sm:p-4 border rounded-lg hover:bg-gray-50 space-y-3 sm:space-y-0"
                      >
                        {/* Mobile Layout */}
                        <div className="block sm:hidden">
                          {/* User Info */}
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 font-semibold text-sm">
                                {user.first_name[0]}
                                {user.last_name[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-gray-600 truncate">{user.email}</p>
                              {user.phone && <p className="text-xs text-gray-500 truncate">{user.phone}</p>}
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </Badge>
                              <p className="text-xs text-gray-500">
                                {new Date(user.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          {editingUserId === user.id ? (
                            <div className="flex items-center space-x-2">
                              <Select value={user.role} onValueChange={(value) => handleRoleUpdate(user.id, value)}>
                                <SelectTrigger className="flex-1 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="patient">Patient</SelectItem>
                                  <SelectItem value="doctor">Doctor</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUserId(null)}
                                className="h-8 px-2 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            user.role !== "admin" && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingUserId(user.id)}
                                    className="text-blue-600 hover:text-blue-700 h-8 px-2 text-xs"
                                  >
                                    Change Role
                                  </Button>
                                  {user.role === "patient" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setPatientProfileModal({ isOpen: true, patientId: user.id })}
                                      className="text-green-600 hover:text-green-700 h-8 px-2 text-xs"
                                    >
                                      View Profile
                                    </Button>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                  disabled={deletingUserId === user.id}
                                >
                                  {deletingUserId === user.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            )
                          )}
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:flex sm:items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold">
                                {user.first_name[0]}
                                {user.last_name[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              {user.phone && <p className="text-sm text-gray-500">{user.phone}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {editingUserId === user.id ? (
                              <div className="flex items-center space-x-2">
                                <Select value={user.role} onValueChange={(value) => handleRoleUpdate(user.id, value)}>
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="patient">Patient</SelectItem>
                                    <SelectItem value="doctor">Doctor</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button variant="outline" size="sm" onClick={() => setEditingUserId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                {user.role !== "admin" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingUserId(user.id)}
                                      className="text-blue-600 hover:text-blue-700 text-xs"
                                    >
                                      Change Role
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="text-red-600 hover:text-red-700"
                                      disabled={deletingUserId === user.id}
                                    >
                                      {deletingUserId === user.id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </>
                                )}
                                {user.role === "patient" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPatientProfileModal({ isOpen: true, patientId: user.id })}
                                    className="text-green-600 hover:text-green-700 text-xs"
                                  >
                                    View Profile
                                  </Button>
                                )}
                                <div className="flex items-center gap-2">
                                  <Badge className={getRoleBadgeColor(user.role)}>
                                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                  </Badge>
                                  <p className="text-sm text-gray-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            )}
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
      </div>

      <UpdatePaymentModal
        isOpen={updatePaymentModal.isOpen}
        onClose={() => setUpdatePaymentModal({ isOpen: false, payment: null, appointment: null })}
        payment={updatePaymentModal.payment}
        onPaymentUpdated={handlePaymentUpdated}
      />

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
        currentUserRole="admin"
      />
      <CompleteAppointmentModal
        isOpen={!!completeModalAppointment}
        onClose={() => setCompleteModalAppointment(null)}
        appointment={completeModalAppointment}
        onAppointmentCompleted={handleCompleteAppointment}
      />
      <AppointmentAssignmentModal
        isOpen={!!assignmentModalAppointment}
        onClose={() => setAssignmentModalAppointment(null)}
        appointment={assignmentModalAppointment}
        onAssignmentUpdated={handleAssignmentUpdated}
      />
      <EmergencyAppointmentModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        onAppointmentCreated={() => {
          fetchAppointments()
          fetchPaymentStats()
          setIsWalkInModalOpen(false)
        }}
        currentUserRole={profile?.role}
      />
      <PatientProfileModal
        isOpen={patientProfileModal.isOpen}
        onClose={() => setPatientProfileModal({ isOpen: false, patientId: "" })}
        patientId={patientProfileModal.patientId}
        currentUserId={profile?.id || ""}
        currentUserRole={profile?.role || ""}
        initialTab={patientProfileModal.initialTab}
        appointmentId={patientProfileModal.appointmentId}
      />
      <DueAppointmentsModal
        isOpen={isDueAppointmentsModalOpen}
        onClose={() => setIsDueAppointmentsModalOpen(false)}
        appointments={appointments}
        payments={payments}
        onCompleteAppointment={(appointment) => handleCompleteAppointment(appointment)}
        onAssignAppointment={(appointment) => setAssignmentModalAppointment(appointment)}
        onAppointmentUpdated={() => {
          fetchAppointments()
          fetchPaymentStats()
          fetchPayments()
        }}
      />
      <RescheduleAppointmentModal
        isOpen={!!rescheduleModalAppointment}
        onClose={() => setRescheduleModalAppointment(null)}
        appointment={rescheduleModalAppointment}
        onAppointmentRescheduled={() => {
          fetchAppointments()
          setRescheduleModalAppointment(null)
        }}
      />

      {isDuePaymentsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-red-600" />
                Payment Due
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDuePaymentsModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {duePayments.length > 0 ? (
                <div className="space-y-3">
                  {duePayments.map((payment) => (
                    <div key={payment.id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {payment.appointment?.patient?.first_name} {payment.appointment?.patient?.last_name}
                          </p>
                          <p className="text-xs text-gray-600 truncate">{payment.appointment?.patient?.email}</p>
                        </div>
                        <Badge className="bg-red-100 text-red-800 text-xs ml-2 flex-shrink-0">
                          Rs {(payment.bill_amount - payment.paid_amount).toFixed(2)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div>
                          <p className="text-gray-600">Bill Amount</p>
                          <p className="font-medium">Rs {payment.bill_amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Paid Amount</p>
                          <p className="font-medium">Rs {payment.paid_amount.toFixed(2)}</p>
                        </div>
                      </div>
                      {payment.appointment?.appointment_type && (
                        <p className="text-xs text-gray-600 mb-3">{payment.appointment.appointment_type}</p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleUpdatePayment(payment.appointment!)
                          setIsDuePaymentsModalOpen(false)
                        }}
                        className="w-full text-xs h-8 border-red-300 text-red-700 hover:bg-red-100"
                      >
                        <CreditCard className="w-3 h-3 mr-1" />
                        Update Payment
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600">No outstanding payments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
