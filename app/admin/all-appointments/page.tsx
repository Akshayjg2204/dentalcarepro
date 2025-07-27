"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getAllAppointments, updateAppointmentStatus, deleteAppointment, type Appointment } from "@/lib/appointments"
import { getAllPayments, type Payment } from "@/lib/payments"
import { toast } from "sonner"
import { ArrowLeft, Calendar, Search, RefreshCw, Trash2, Check, X, CreditCard, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CompleteAppointmentModal } from "@/components/complete-appointment-modal"

export default function AllAppointments() {
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

    if (searchTerm) {
      filtered = filtered.filter(
        (appointment) =>
          appointment.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.patient?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.appointment_type.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((appointment) => appointment.status === statusFilter)
    }

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
      }
    }

    setFilteredAppointments(filtered)
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

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) {
      return
    }

    setDeletingAppointments((prev) => new Set(prev).add(appointmentId))

    try {
      await deleteAppointment(appointmentId)
      toast.success("Appointment deleted successfully!")
      fetchAppointments()
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
      <div className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link href="/admin" className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline ml-2">Back to Admin</span>
            </Link>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800">All Appointments</h1>
              <p className="text-xs sm:text-sm text-gray-600">View and manage all clinic appointments</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchAppointments} className="bg-transparent" size="sm">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <CardTitle className="text-lg sm:text-xl">All Appointments</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {filteredAppointments.length} total
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4 mb-6">
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
                <SelectTrigger className="w-full sm:w-40">
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
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warning Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-6">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Warning:</p>
                  <p className="text-xs sm:text-sm text-yellow-700">
                    Deleting appointments will permanently remove them and any associated payment records. This action
                    cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Appointments List */}
            {filteredAppointments.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {filteredAppointments
                  .sort((a, b) => {
                    const statusOrder = { pending: 0, approved: 1, completed: 2, rejected: 3, cancelled: 4 }
                    const aOrder = statusOrder[a.status] ?? 5
                    const bOrder = statusOrder[b.status] ?? 5
                    if (aOrder !== bOrder) return aOrder - bOrder
                    return new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
                  })
                  .map((appointment) => {
                    const payment = getAppointmentPayment(appointment.id)
                    const isProcessing = processingAppointments.has(appointment.id)
                    const isDeleting = deletingAppointments.has(appointment.id)

                    return (
                      <div key={appointment.id} className="p-3 sm:p-4 border rounded-lg hover:bg-gray-50">
                        {/* Mobile Layout */}
                        <div className="block sm:hidden space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">{appointment.appointment_type}</h3>
                              <p className="text-xs text-gray-600 truncate">
                                {appointment.patient?.first_name} {appointment.patient?.last_name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{appointment.patient?.email}</p>
                            </div>
                            <Badge className={`${getStatusColor(appointment.status)} text-xs ml-2 flex-shrink-0`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </Badge>
                          </div>

                          {/* Date and Time */}
                          <div className="flex items-center justify-between text-xs">
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

                          {/* Payment Details */}
                          {payment && appointment.status === "completed" && (
                            <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                              <div className="flex justify-between">
                                <span>Bill: ₹{payment.bill_amount.toFixed(2)}</span>
                                <span>Paid: ₹{payment.paid_amount.toFixed(2)}</span>
                              </div>
                              {payment.bill_amount > payment.paid_amount && (
                                <div className="text-red-600 font-medium text-center">
                                  Outstanding: ₹{(payment.bill_amount - payment.paid_amount).toFixed(2)}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Notes */}
                          {appointment.notes && (
                            <div className="text-xs">
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
                                  disabled={isProcessing || isDeleting}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-7"
                                >
                                  {isProcessing ? (
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
                                  disabled={isProcessing || isDeleting}
                                  className="border-red-600 text-red-600 hover:bg-red-50 text-xs px-2 py-1 h-7"
                                >
                                  {isProcessing ? (
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
                                onClick={() => setCompleteModalAppointment(appointment)}
                                disabled={isDeleting}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-7"
                              >
                                Complete
                              </Button>
                            )}
                            {payment && payment.payment_status === "partial_paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCompleteModalAppointment(appointment)}
                                disabled={isDeleting}
                                className="border-yellow-600 text-yellow-600 hover:bg-yellow-50 text-xs px-2 py-1 h-7"
                              >
                                <CreditCard className="w-3 h-3 mr-1" />
                                Update Payment
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteAppointment(appointment.id)}
                              disabled={isProcessing || isDeleting}
                              className="border-red-600 text-red-600 hover:bg-red-50 text-xs px-2 py-1 h-7"
                            >
                              {isDeleting ? (
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
                            <div className="flex items-center gap-6">
                              <div className="flex-1">
                                <h3 className="font-medium text-base">{appointment.appointment_type}</h3>
                                <p className="text-sm text-gray-600">
                                  {appointment.patient?.first_name} {appointment.patient?.last_name}
                                </p>
                                <p className="text-sm text-gray-500">{appointment.patient?.email}</p>
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
                          <div className="flex items-center gap-3">
                            {appointment.status === "pending" && (
                              <div className="flex gap-2">
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
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
