"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, CreditCard, AlertCircle } from "lucide-react"
import { createPayment, getPaymentByAppointmentId, updatePayment, type Payment } from "@/lib/payments"
import { updateAppointmentStatus, type Appointment } from "@/lib/appointments"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CompleteAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment | null
  onAppointmentCompleted: () => void
}

export function CompleteAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onAppointmentCompleted,
}: CompleteAppointmentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [existingPayment, setExistingPayment] = useState<Payment | null>(null)
  const [formData, setFormData] = useState({
    billAmount: "",
    paidAmount: "",
    paymentStatus: "not_paid" as "fully_paid" | "partial_paid" | "not_paid",
    notes: "",
  })

  useEffect(() => {
    if (appointment && isOpen) {
      loadExistingPayment()
    }
  }, [appointment, isOpen])

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

  const loadExistingPayment = async () => {
    if (!appointment) return

    try {
      const payment = await getPaymentByAppointmentId(appointment.id)
      if (payment) {
        setExistingPayment(payment)
        setFormData({
          billAmount: payment.bill_amount.toString(),
          paidAmount: payment.paid_amount.toString(),
          paymentStatus: payment.payment_status,
          notes: payment.notes || "",
        })
      } else {
        // Reset form for new payment
        setFormData({
          billAmount: "",
          paidAmount: "0",
          paymentStatus: "not_paid",
          notes: "",
        })
      }
    } catch (error) {
      console.error("Error loading payment:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      billAmount: "",
      paidAmount: "0",
      paymentStatus: "not_paid",
      notes: "",
    })
    setExistingPayment(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appointment) return

    setIsLoading(true)

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
          billAmount,
          paidAmount,
          paymentStatus: formData.paymentStatus,
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
        })
      }

      // Update appointment status to completed
      await updateAppointmentStatus(appointment.id, "completed")

      toast.success("Appointment completed and payment recorded successfully!")
      onAppointmentCompleted()
      onClose()
      resetForm()
    } catch (error: any) {
      console.error("Complete appointment error:", error)
      toast.error(error.message || "Failed to complete appointment")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      resetForm()
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

  if (!appointment) return null

  const billAmount = Number.parseFloat(formData.billAmount) || 0
  const paidAmount = Number.parseFloat(formData.paidAmount) || 0
  const outstandingAmount = billAmount - paidAmount

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {existingPayment ? "Update Payment" : "Complete Appointment & Record Payment"}
          </DialogTitle>
        </DialogHeader>

        {/* Appointment Details */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">Appointment Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Patient:</p>
              <p className="font-medium">
                {appointment.patient?.first_name} {appointment.patient?.last_name}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Type:</p>
              <p className="font-medium">{appointment.appointment_type}</p>
            </div>
            <div>
              <p className="text-gray-600">Date:</p>
              <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
            </div>
            <div>
              <p className="text-gray-600">Time:</p>
              <p className="font-medium">{formatTime(appointment.appointment_time)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Information */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Payment Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billAmount">
                  Bill Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.billAmount}
                  onChange={(e) => handleInputChange("billAmount", e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Paid Amount</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.billAmount}
                  value={formData.paidAmount}
                  onChange={(e) => handleInputChange("paidAmount", e.target.value)}
                  disabled={isLoading || formData.paymentStatus !== "partial_paid"}
                  placeholder="0.00"
                />
                {formData.paymentStatus !== "partial_paid" && (
                  <p className="text-xs text-gray-500">Paid amount is only editable for partial payments</p>
                )}
              </div>
            </div>

            {/* Payment Summary */}
            {billAmount > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">Payment Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Bill Amount:</p>
                    <p className="font-medium">₹{billAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Paid Amount:</p>
                    <p className="font-medium">₹{paidAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Outstanding:</p>
                    <p className={`font-medium ${outstandingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                      ₹{outstandingAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-gray-600">Status:</p>
                  <p className={`font-medium ${getStatusColor(formData.paymentStatus)}`}>
                    {getStatusText(formData.paymentStatus)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2 mt-4">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select
                value={formData.paymentStatus}
                onValueChange={(value) => handleInputChange("paymentStatus", value)}
                disabled={isLoading}
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

            <div className="space-y-2 mt-4">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
                disabled={isLoading}
                placeholder="Additional payment notes or comments..."
              />
            </div>
          </div>

          {/* Warning for outstanding amount */}
          {outstandingAmount > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Outstanding Amount:</strong> ₹{outstandingAmount.toFixed(2)} will remain unpaid. You can update
                this payment later if needed.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {existingPayment ? "Updating..." : "Completing..."}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    {existingPayment ? "Update Payment" : "Complete Appointment"}
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
