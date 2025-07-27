"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, CreditCard, Receipt } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getPatientPayments, type PatientPayment } from "@/lib/patient-payments"
import { toast } from "sonner"

export default function PaymentsPage() {
  const [user, setUser] = useState<any>(null)
  const [payments, setPayments] = useState<PatientPayment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
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
      await fetchPaymentData(userData.id)
    } catch (error) {
      console.error("Auth error:", error)
      window.location.href = "/login"
    }
  }

  const fetchPaymentData = async (userId: string) => {
    try {
      const paymentsData = await getPatientPayments(userId)
      setPayments(paymentsData)
    } catch (error) {
      console.error("Error fetching payment data:", error)
      toast.error("Failed to load payment data")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "fully_paid":
        return "bg-green-100 text-green-800"
      case "partial":
      case "partial_paid":
        return "bg-yellow-100 text-yellow-800"
      case "pending":
      case "not_paid":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "fully_paid":
        return "PAID"
      case "partial_paid":
        return "PARTIAL"
      case "not_paid":
        return "NOT_PAID"
      default:
        return status.toUpperCase()
    }
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
          <p className="text-gray-600">Loading payment history...</p>
        </div>
      </div>
    )
  }

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount_paid, 0)
  const totalOutstanding = payments.reduce((sum, payment) => sum + payment.outstanding_balance, 0)
  const totalBilled = payments.reduce((sum, payment) => sum + payment.total_amount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
                <p className="text-gray-600">View your bills and payment records</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Billed</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBilled)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payment records</h3>
                <p className="text-gray-600">Your payment history will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="border rounded-lg p-4 bg-white">
                    {/* Mobile-optimized layout */}
                    <div className="space-y-3">
                      {/* Header with status and treatment */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Badge className={`${getStatusColor(payment.payment_status)} text-xs mb-2`}>
                            {getStatusText(payment.payment_status)}
                          </Badge>
                          <h3 className="font-medium text-base break-words">
                            {cleanAppointmentType(payment.treatment_type)}
                          </h3>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm text-gray-600">Total:</div>
                          <div className="font-semibold">{formatCurrency(payment.total_amount)}</div>
                        </div>
                      </div>

                      {/* Appointment date */}
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>Appointment: {formatDate(payment.appointment_date)}</span>
                      </div>

                      {/* Payment details in a grid for mobile */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div>
                          <div className="text-xs text-gray-600">Amount Paid</div>
                          <div className="font-medium text-green-600">{formatCurrency(payment.amount_paid)}</div>
                        </div>
                        {payment.outstanding_balance > 0 && (
                          <div>
                            <div className="text-xs text-gray-600">Outstanding</div>
                            <div className="font-medium text-red-600">
                              {formatCurrency(payment.outstanding_balance)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Payment date if available */}
                      {payment.payment_date && (
                        <div className="flex items-center text-sm text-gray-600">
                          <CreditCard className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>Payment Date: {formatDate(payment.payment_date)}</span>
                        </div>
                      )}

                      {/* Payment method if available */}
                      {payment.payment_method && (
                        <div className="flex items-center text-sm text-gray-600">
                          <CreditCard className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>Method: {payment.payment_method}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
