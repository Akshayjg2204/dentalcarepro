"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getAllAppointments, updateAppointmentStatus, type Appointment } from "@/lib/appointments"
import { getAllPayments, type Payment } from "@/lib/payments"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Search, CalendarIcon, Trash2, Check, X, CreditCard, ArrowLeft, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CompleteAppointmentModal } from "@/components/complete-appointment-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export default function AllAppointmentsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [processingAppointments, setProcessingAppointments] = useState<Set<string>>(new Set())
  const [deletingAppointments, setDeletingAppointments] = useState<Set<string>>(new Set())
  const [completeModalAppointment, setCompleteModalAppointment] = useState<Appointment | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchAppointments()
    fetchPayments()
  }, [])

  useEffect(() => {
    filterAppointments()
  }, [appointments, searchTerm, statusFilter, dateFilter])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      if (!user || user.profile.role !== "admin") {
        toast.error("Access denied. Admin privileges required.")
        router.push("/login")
        return
      }
      setCurrentUser(user)
    } catch (error: any) {
      console.error("Auth check error:", error)
      toast.error("Authentication failed")
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAppointments = async () => {
    try {
      const appointmentsData = await getAllAppointments()
      setAppointments(appointmentsData)
    } catch (error: any) {
      console.error("Failed to fetch appointments:", error)
      toast.error("Failed to fetch appointments")
    }
  }

  const fetchPayments = async () => {
    try {
      const paymentsData = await getAllPayments()
      setPayments(paymentsData)
    } catch (error: any) {
      console.error("Failed to fetch payments:", error)
    }
  }

  const filterAppointments = () => {
    let filtered = appointments

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (appointment) =>
          appointment.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.patient?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.appointment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.notes?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((appointment) => appointment.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== "all") {
      const today = new Date()
      const todayStr = today.toISOString().split("T")[0]

      switch (dateFilter) {
        case "today":
          filtered = filtered.filter((appointment) => appointment.appointment_date === todayStr)
          break
        case "upcoming":
          filtered = filtered.filter((appointment) => appointment.appointment_date >= todayStr)
          break
        case "past":
          filtered = filtered.filter((appointment) => appointment.appointment_date < todayStr)
          break
        case "this_week":
          const weekStart = new Date(today)
          weekStart.setDate(today.getDate() - today.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          filtered = filtered.filter((appointment) => {
            const appointmentDate = new Date(appointment.appointment_date)
            return appointmentDate >= weekStart && appointmentDate <= weekEnd
          })
          break
        case "this_month":
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          filtered = filtered.filter((appointment) => {
            const appointmentDate = new Date(appointment.appointment_date)
            return appointmentDate >= monthStart && appointmentDate <= monthEnd
          })
          break
      }
    }

    // Sort appointments by priority: pending → approved → outstanding → completed → cancelled
    filtered.sort((a, b) => {
      const statusOrder = { pending: 0, approved: 1, outstanding: 2, completed: 3, cancelled: 4 }
      const aOrder = statusOrder[a.status] ?? 5
      const bOrder = statusOrder[b.status] ?? 5
      if (aOrder !== bOrder) return aOrder - bOrder
      // Secondary sort by date (newest first)
      return new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
    })

    setFilteredAppointments(filtered)
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) {
      return
    }

    setDeletingAppointments((prev) => new Set(prev).add(appointmentId))

    try {
      // First delete any associated payment
      const payment = getAppointmentPayment(appointmentId)
      if (payment) {
        const { error: paymentError } = await supabase.from("payments").delete().eq("appointment_id", appointmentId)

        if (paymentError) {
          console.error("Error deleting payment:", paymentError)
          throw new Error("Failed to delete associated payment")
        }
      }

      // Then delete the appointment
      const { error } = await supabase.from("appointments").delete().eq("id", appointmentId)

      if (error) {
        console.error("Error deleting appointment:", error)
        throw error
      }

      toast.success("Appointment deleted successfully!")
      fetchAppointments()
      fetchPayments()
    } catch (error: any) {
      console.error("Delete appointment error:", error)
      toast.error("Failed to delete appointment: " + (error.message || "Unknown error"))
    } finally {
      setDeletingAppointments((prev) => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  const handleAppointmentAction = async (appointmentId: string, action: "approved" | "rejected") => {
    setProcessingAppointments((prev) => new Set(prev).add(appointmentId))

    try {
      await updateAppointmentStatus(appointmentId, action)
      toast.success(`Appointment ${action} successfully!`)
      fetchAppointments()
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

  const handleCompleteAppointment = () => {
    fetchAppointments()
    fetchPayments()
    setCompleteModalAppointment(null)
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
      weekday: "short",
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

  const getAppointmentPayment = (appointmentId: string) => {
    return payments.find((payment) => payment.appointment_id === appointmentId)
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
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">All Appointments</h1>
              <p className="text-gray-600">View and manage all clinic appointments</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              fetchAppointments()
              fetchPayments()
            }}
            className="flex items-center bg-transparent"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5" />
                <CardTitle>All Appointments</CardTitle>
                <Badge variant="secondary">{appointments.length} total</Badge>
                {filteredAppointments.length !== appointments.length && (
                  <Badge variant="outline">{filteredAppointments.length} filtered</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search appointments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
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
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warning Alert */}
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> Deleting appointments will permanently remove them and any associated payment
                records. This action cannot be undone.
              </AlertDescription>
            </Alert>

            {/* Appointments List */}
            {filteredAppointments.length > 0 ? (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => {
                  const payment = getAppointmentPayment(appointment.id)
                  const isProcessing = processingAppointments.has(appointment.id)
                  const isDeleting = deletingAppointments.has(appointment.id)

                  return (
                    <div key={appointment.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-lg">{appointment.appointment_type}</h3>
                              <p className="text-sm text-gray-600">
                                {appointment.patient?.first_name} {appointment.patient?.last_name}
                              </p>
                              <p className="text-sm text-gray-500">{appointment.patient?.email}</p>
                              {appointment.patient?.phone && (
                                <p className="text-sm text-gray-500">{appointment.patient.phone}</p>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium">{formatDate(appointment.appointment_date)}</p>
                              <p className="text-sm text-gray-600">{formatTime(appointment.appointment_time)}</p>
                            </div>
                            {appointment.notes && (
                              <div className="max-w-xs">
                                <p className="text-sm text-gray-600">
                                  <strong>Notes:</strong> {appointment.notes}
                                </p>
                              </div>
                            )}
                            {/* Payment Status */}
                            {payment && (
                              <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">Payment</p>
                                <Badge className={`text-xs ${getPaymentStatusColor(payment.payment_status)}`}>
                                  {payment.payment_status === "fully_paid" && "Fully Paid"}
                                  {payment.payment_status === "partial_paid" && "Partial Paid"}
                                  {payment.payment_status === "not_paid" && "Not Paid"}
                                </Badge>
                                {appointment.status === "completed" && (
                                  <>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Bill: ₹{payment.bill_amount.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-500">Paid: ₹{payment.paid_amount.toFixed(2)}</p>
                                    {payment.bill_amount > payment.paid_amount && (
                                      <p className="text-xs text-red-600 font-medium">
                                        Outstanding: ₹{(payment.bill_amount - payment.paid_amount).toFixed(2)}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {/* Action Buttons */}
                          {appointment.status === "pending" && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleAppointmentAction(appointment.id, "approved")}
                                disabled={isProcessing || isDeleting}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {isProcessing ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAppointmentAction(appointment.id, "rejected")}
                                disabled={isProcessing || isDeleting}
                                className="border-red-600 text-red-600 hover:bg-red-50"
                              >
                                {isProcessing ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          )}
                          {appointment.status === "approved" && (
                            <Button
                              size="sm"
                              onClick={() => setCompleteModalAppointment(appointment)}
                              disabled={isDeleting}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Complete
                            </Button>
                          )}
                          {/* Update Payment Button for Partial Payments */}
                          {payment && payment.payment_status === "partial_paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCompleteModalAppointment(appointment)}
                              disabled={isDeleting}
                              className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                            >
                              <CreditCard className="w-4 h-4 mr-1" />
                              Update Payment
                            </Button>
                          )}
                          {/* Delete Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteAppointment(appointment.id)}
                            disabled={isProcessing || isDeleting}
                            className="border-red-600 text-red-600 hover:bg-red-50"
                          >
                            {isDeleting ? (
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
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "No appointments have been scheduled yet"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CompleteAppointmentModal
        isOpen={!!completeModalAppointment}
        onClose={() => setCompleteModalAppointment(null)}
        appointment={completeModalAppointment}
        onAppointmentCompleted={handleCompleteAppointment}
      />
    </div>
  )
}
