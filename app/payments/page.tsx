"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getAppointmentById, updateAppointmentStatus, type Appointment } from "@/lib/appointments"
import { createPayment, getPaymentByAppointmentId, updatePayment, getAllPayments, type Payment } from "@/lib/payments"
import { createAppointmentBill } from "@/lib/treatments"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, IndianRupee, AlertCircle, Receipt, CreditCard, Calendar, Clock, Stethoscope } from "lucide-react"
import Link from "next/link"

function PaymentsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [existingPayment, setExistingPayment] = useState<Payment | null>(null)
  const [allPayments, setAllPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    billAmount: "",
    paidAmount: "",
    paymentStatus: "not_paid" as "fully_paid" | "partial_paid" | "not_paid",
    notes: "",
    paymentMethod: "",
  })

  const appointmentId = searchParams.get("appointmentId")
  const patientId = searchParams.get("patientId")
  const action = searchParams.get("action")

  useEffect(() => {
    checkAuth()
    if (appointmentId) {
      loadAppointmentData()
    }
    loadAllPayments()
  }, [appointmentId])

  useEffect(() => {
    // Auto-calculate payment status based on amounts
    if (formData.billAmount && formData.paidAmount) {
      const billAmount = Number.parseFloat(formData.billAmount)
      const paidAmount = Number.parseFloat(formData.paidAmount)

      if (paidAmount === 0) {
        setFormData((prev) => ({ ...prev, paymentStatus: "not_paid" }))
      } else if (paidAmount >= billAmount) {
        setFormData((prev) => ({ ...prev, paymentStatus: "fully_paid" }))
      } else {
        setFormData((prev) => ({ ...prev, paymentStatus: "partial_paid" }))
      }
    }
  }, [formData.billAmount, formData.paidAmount])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      if (!user || !["admin", "doctor", "staff"].includes(user.profile.role)) {
        toast.error("Access denied. Admin, doctor, or staff privileges required.")
        router.push("/login")
        return
      }
      setCurrentUser(user)
    } catch (error: any) {
      console.error("Auth check error:", error)
      toast.error("Authentication failed")
      router.push("/login")
    }
  }

  const loadAppointmentData = async () => {
    if (!appointmentId) return

    try {
      const appointmentData = await getAppointmentById(appointmentId)
      setAppointment(appointmentData)

      // Load existing payment if any
      const payment = await getPaymentByAppointmentId(appointmentId)
      if (payment) {
        setExistingPayment(payment)
        setFormData({
          billAmount: payment.bill_amount.toString(),
          paidAmount: payment.paid_amount.toString(),
          paymentStatus: payment.payment_status,
          notes: payment.notes || "",
          paymentMethod: payment.payment_method || "",
        })
      } else {
        // Reset form for new payment
        setFormData({
          billAmount: "",
          paidAmount: "0",
          paymentStatus: "not_paid",
          notes: "",
          paymentMethod: "",
        })
      }
    } catch (error: any) {
      console.error("Error loading appointment data:", error)
      toast.error("Failed to load appointment data")
    } finally {
      setIsLoading(false)
    }
  }

  const loadAllPayments = async () => {
    try {
      const payments = await getAllPayments()
      setAllPayments(payments)
    } catch (error: any) {
      console.error("Error loading payments:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appointment) return

    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.billAmount.trim()) {
        throw new Error("Bill amount is required")
      }

      const billAmount = Number.parseFloat(formData.billAmount)
      const paidAmount = Number.parseFloat(formData.paidAmount) || 0

      if (billAmount <= 0) {
        throw new Error("Bill amount must be greater than 0")
      }

      if (paidAmount < 0) {
        throw new Error("Paid amount cannot be negative")
      }

      if (paidAmount > billAmount) {
        throw new Error("Paid amount cannot exceed bill amount")
      }

      // Create or update payment
      if (existingPayment) {
        await updatePayment(existingPayment.id, {
          paid_amount: paidAmount,
          payment_method: formData.paymentMethod.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        })
      } else {
        await createPayment({
          appointmentId: appointment.id,
          patientId: appointment.patient_id,
          billAmount,
          paidAmount,
          paymentStatus: formData.paymentStatus,
          notes: formData.notes.trim() || undefined,
          paymentMethod: formData.paymentMethod.trim() || undefined,
        })
      }

      // Create billing record for the appointment
      await createAppointmentBill({
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        treatments: [
          {
            treatment_id: "default",
            treatment_name: appointment.appointment_type,
            price: billAmount,
            quantity: 1,
          },
        ],
        total_amount: billAmount,
        payment_method: formData.paymentMethod.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        created_by: currentUser?.profile?.id, // Pass current user ID to avoid foreign key constraint error
      })

      // Update appointment status to completed
      await updateAppointmentStatus(appointment.id, "completed")

      toast.success("Payment recorded and appointment completed successfully!")

      // Navigate back to admin dashboard
      router.push("/admin")
    } catch (error: any) {
      console.error("Payment submission error:", error)
      toast.error(error.message || "Failed to process payment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fully_paid":
        return "text-green-600"
      case "partial_paid":
        return "text-yellow-600"
      case "not_paid":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "fully_paid":
        return "Fully Paid"
      case "partial_paid":
        return "Partial Paid"
      case "not_paid":
        return "Not Paid"
      default:
        return "Unknown"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment information...</p>
        </div>
      </div>
    )
  }

  if (!appointment && appointmentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Appointment Not Found</h2>
          <p className="text-gray-600 mb-4">The requested appointment could not be found.</p>
          <Link href="/admin">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const billAmount = Number.parseFloat(formData.billAmount) || 0
  const paidAmount = Number.parseFloat(formData.paidAmount) || 0
  const outstandingAmount = billAmount - paidAmount

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link href="/admin" className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Back to Dashboard</span>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                {action === "complete" ? "Complete Appointment & Record Payment" : "Payment Management"}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                {appointment
                  ? `${appointment.appointment_type} - ${appointment.patient?.first_name} ${appointment.patient?.last_name}`
                  : "Payment Processing"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {appointment && (
          <>
            {/* Appointment Details Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Patient</p>
                    <p className="font-medium">
                      {appointment.patient?.first_name} {appointment.patient?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{appointment.patient?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Appointment Type</p>
                    <p className="font-medium">{appointment.appointment_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date & Time</p>
                    <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(appointment.appointment_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assigned Staff</p>
                    {appointment.doctor && (
                      <p className="font-medium flex items-center text-green-600">
                        <Stethoscope className="w-3 h-3 mr-1" />
                        Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                      </p>
                    )}
                    {appointment.staff && (
                      <p className="text-sm text-blue-600">
                        Staff: {appointment.staff.first_name} {appointment.staff.last_name}
                      </p>
                    )}
                    {!appointment.doctor && !appointment.staff && <p className="text-sm text-gray-500">Not assigned</p>}
                  </div>
                </div>
                {appointment.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Notes:</p>
                    <p className="text-sm">{appointment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Form Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <IndianRupee className="w-5 h-5 mr-2" />
                  {existingPayment ? "Update Payment Information" : "Record Payment Information"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billAmount">
                        Bill Amount (Rs) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="billAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.billAmount}
                        onChange={(e) => handleInputChange("billAmount", e.target.value)}
                        required
                        disabled={isSubmitting}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paidAmount">Paid Amount (Rs)</Label>
                      <Input
                        id="paidAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        max={formData.billAmount}
                        value={formData.paidAmount}
                        onChange={(e) => handleInputChange("paidAmount", e.target.value)}
                        disabled={isSubmitting}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Payment Summary */}
                  {billAmount > 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-3">Payment Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Bill Amount:</p>
                          <p className="font-medium text-lg">{formatCurrency(billAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Paid Amount:</p>
                          <p className="font-medium text-lg">{formatCurrency(paidAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Outstanding:</p>
                          <p
                            className={`font-medium text-lg ${outstandingAmount > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            {formatCurrency(outstandingAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-gray-600">Payment Status:</p>
                        <Badge className={`${getStatusColor(formData.paymentStatus)} bg-transparent border`}>
                          {getStatusText(formData.paymentStatus)}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentStatus">Payment Status</Label>
                      <Select
                        value={formData.paymentStatus}
                        onValueChange={(value) => handleInputChange("paymentStatus", value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_paid">Not Paid</SelectItem>
                          <SelectItem value="partial_paid">Partial Paid</SelectItem>
                          <SelectItem value="fully_paid">Fully Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Input
                        id="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
                        disabled={isSubmitting}
                        placeholder="e.g., Cash, Card, UPI, Bank Transfer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      rows={3}
                      disabled={isSubmitting}
                      placeholder="Additional payment notes or comments..."
                    />
                  </div>

                  {/* Warning for outstanding amount */}
                  {outstandingAmount > 0 && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <strong>Outstanding Amount:</strong> {formatCurrency(outstandingAmount)} will remain unpaid.
                        This will be tracked in the patient's billing records.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <div className="flex gap-3">
                      <Link href="/admin">
                        <Button type="button" variant="outline" disabled={isSubmitting}>
                          Cancel
                        </Button>
                      </Link>
                      <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                        {isSubmitting ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {existingPayment ? "Updating..." : "Processing..."}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Receipt className="w-4 h-4 mr-2" />
                            {existingPayment ? "Update Payment" : "Complete & Record Payment"}
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {/* All Payments Overview */}
        {!appointmentId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                All Payments Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allPayments.length > 0 ? (
                <div className="space-y-4">
                  {allPayments.map((payment) => (
                    <div key={payment.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {payment.patient?.first_name} {payment.patient?.last_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {payment.appointment
                              ? `${payment.appointment.appointment_type} - ${formatDate(payment.appointment.appointment_date)}`
                              : payment.bill_description || "Custom Bill"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(payment.bill_amount)}</p>
                          <Badge
                            className={`text-xs ${payment.payment_status === "fully_paid" ? "bg-green-100 text-green-800" : payment.payment_status === "partial_paid" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                          >
                            {getStatusText(payment.payment_status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No payments found</h3>
                  <p className="text-gray-600">No payment records available at the moment.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <PaymentsPageContent />
    </Suspense>
  )
}
