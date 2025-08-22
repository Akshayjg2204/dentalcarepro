"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, IndianRupee, AlertCircle, CheckCircle, Clock, Calendar, Receipt } from "lucide-react"
import { updatePayment, type Payment, type PaymentUpdateData } from "@/lib/payments"
import { updateCustomBillPayment } from "@/lib/custom-bills"
import { toast } from "sonner"

interface UpdatePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  payment: Payment | null
  onPaymentUpdated: (updatedPayment: Payment) => void
  isCustomBill?: boolean // Added prop to identify custom bills
}

export function UpdatePaymentModal({
  isOpen,
  onClose,
  payment,
  onPaymentUpdated,
  isCustomBill = false,
}: UpdatePaymentModalProps) {
  const [formData, setFormData] = useState<PaymentUpdateData>({
    paid_amount: 0,
    payment_method: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (payment && isOpen) {
      setFormData({
        paid_amount: payment.paid_amount,
        payment_method: payment.payment_method || "",
        notes: payment.notes || "",
      })
      setErrors({})
    }
  }, [payment, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!payment) {
      newErrors.general = "Payment data not available"
      setErrors(newErrors)
      return false
    }

    if (formData.paid_amount < 0) {
      newErrors.paid_amount = "Paid amount cannot be negative"
    }

    if (formData.paid_amount > payment.bill_amount) {
      newErrors.paid_amount = "Paid amount cannot exceed bill amount"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payment || !validateForm()) return

    setIsSubmitting(true)
    try {
      if (isCustomBill) {
        const updateData = {
          paid_amount: formData.paid_amount,
          payment_method: formData.payment_method,
          notes: formData.notes,
        }

        await updateCustomBillPayment(payment.id, updateData)
        onPaymentUpdated(payment) // Trigger refresh in parent component
        toast.success("Custom bill payment updated successfully!")
        onClose()
      } else {
        const updateData = {
          paidAmount: formData.paid_amount,
          paymentMethod: formData.payment_method,
          notes: formData.notes,
        }

        const result = await updatePayment(payment.id, updateData)

        if (result.success && result.data) {
          onPaymentUpdated(result.data)
          toast.success("Payment updated successfully!")
          onClose()
        } else {
          toast.error(result.error || "Failed to update payment")
        }
      }
    } catch (error: any) {
      console.error("Error updating payment:", error)
      toast.error("Failed to update payment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPaymentStatus = () => {
    if (!payment) return "not_paid"
    if (formData.paid_amount === 0) return "not_paid"
    if (formData.paid_amount >= payment.bill_amount) return "fully_paid"
    return "partial_paid"
  }

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "fully_paid":
        return <CheckCircle className="w-3 h-3" />
      case "partial_paid":
        return <Clock className="w-3 h-3" />
      case "not_paid":
        return <AlertCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (!payment) return null

  const currentStatus = getPaymentStatus()
  const outstandingAmount = payment.bill_amount - formData.paid_amount
  const isAppointmentPayment = !!payment.appointment_id && !isCustomBill

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            {isCustomBill ? "Update Custom Bill Payment" : "Update Payment"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    {isAppointmentPayment ? (
                      <Calendar className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Receipt className="w-4 h-4 text-green-600" />
                    )}
                    <p className="font-medium">
                      {isAppointmentPayment
                        ? payment.appointment?.appointment_type || "Appointment Payment"
                        : payment.bill_description}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Patient: {payment.patient?.first_name} {payment.patient?.last_name}
                  </p>
                  {isAppointmentPayment && payment.appointment && (
                    <p className="text-sm text-gray-600">Date: {formatDate(payment.appointment.appointment_date)}</p>
                  )}
                </div>
                <Badge className={`text-xs ${getStatusColor(currentStatus)}`}>
                  {getStatusIcon(currentStatus)}
                  <span className="ml-1">
                    {currentStatus === "fully_paid" && "Fully Paid"}
                    {currentStatus === "partial_paid" && "Partial Payment"}
                    {currentStatus === "not_paid" && "Not Paid"}
                  </span>
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Bill Amount</p>
                  <p className="font-semibold text-lg">{formatCurrency(payment.bill_amount)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Outstanding</p>
                  <p className={`font-semibold text-lg ${outstandingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(outstandingAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="paid_amount">
                Paid Amount <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="paid_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={payment.bill_amount}
                  value={formData.paid_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paid_amount: Number.parseFloat(e.target.value) || 0 }))
                  }
                  className="pl-10"
                  placeholder="0.00"
                />
              </div>
              {errors.paid_amount && <p className="text-sm text-red-600 mt-1">{errors.paid_amount}</p>}
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional notes about this payment..."
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Update Payment
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
