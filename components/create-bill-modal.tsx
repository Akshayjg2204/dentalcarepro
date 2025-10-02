"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, IndianRupee, AlertCircle, CheckCircle, Clock, Receipt } from "lucide-react"
import { createCustomBill, type Payment, type CreateCustomBillData } from "@/lib/payments"
import { toast } from "sonner"

interface CreateBillModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  patientName: string
  onBillCreated: (createdBill: Payment) => void
}

export function CreateBillModal({ isOpen, onClose, patientId, patientName, onBillCreated }: CreateBillModalProps) {
  const [formData, setFormData] = useState<CreateCustomBillData>({
    patient_id: patientId,
    bill_description: "",
    bill_amount: 0,
    initial_payment: 0,
    payment_method: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.bill_description.trim()) {
      newErrors.bill_description = "Bill description is required"
    }

    if (!formData.bill_amount || formData.bill_amount <= 0) {
      newErrors.bill_amount = "Bill amount must be greater than 0"
    }

    if (formData.initial_payment < 0) {
      newErrors.initial_payment = "Initial payment cannot be negative"
    }

    if (formData.initial_payment > formData.bill_amount) {
      newErrors.initial_payment = "Initial payment cannot exceed bill amount"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const result = await createCustomBill(formData)

      if (result.success && result.data) {
        onBillCreated(result.data)
        toast.success("Custom bill created successfully!")

        // Reset form
        setFormData({
          patient_id: patientId,
          bill_description: "",
          bill_amount: 0,
          initial_payment: 0,
          payment_method: "",
          notes: "",
        })
        setErrors({})
        onClose()
      } else {
        toast.error(result.error || "Failed to create bill")
      }
    } catch (error: any) {
      console.error("Error creating bill:", error)
      toast.error("Failed to create bill")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPaymentStatus = () => {
    if (formData.initial_payment === 0) return "not_paid"
    if (formData.initial_payment >= formData.bill_amount) return "fully_paid"
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

  const currentStatus = getPaymentStatus()
  const outstandingAmount = formData.bill_amount - formData.initial_payment

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-green-600" />
            Create New Custom Bill
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-medium">{patientName}</p>
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

              {formData.bill_amount > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t text-sm">
                  <div>
                    <p className="text-gray-600">Bill Amount</p>
                    <p className="font-semibold text-lg">{formatCurrency(formData.bill_amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Outstanding</p>
                    <p className={`font-semibold text-lg ${outstandingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(outstandingAmount)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bill Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="bill_description">
                Bill Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bill_description"
                value={formData.bill_description}
                onChange={(e) => setFormData((prev) => ({ ...prev, bill_description: e.target.value }))}
                placeholder="e.g., Dental Cleaning, Root Canal Treatment, Consultation Fee"
              />
              {errors.bill_description && <p className="text-sm text-red-600 mt-1">{errors.bill_description}</p>}
            </div>

            <div>
              <Label htmlFor="bill_amount">
                Bill Amount <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="bill_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.bill_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bill_amount: Number.parseFloat(e.target.value) || 0 }))
                  }
                  className="pl-10"
                  placeholder="0.00"
                />
              </div>
              {errors.bill_amount && <p className="text-sm text-red-600 mt-1">{errors.bill_amount}</p>}
            </div>

            <div>
              <Label htmlFor="initial_payment">Initial Payment (Optional)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="initial_payment"
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.bill_amount}
                  value={formData.initial_payment}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, initial_payment: Number.parseFloat(e.target.value) || 0 }))
                  }
                  className="pl-10"
                  placeholder="0.00"
                />
              </div>
              {errors.initial_payment && <p className="text-sm text-red-600 mt-1">{errors.initial_payment}</p>}
              <p className="text-xs text-gray-500 mt-1">Leave as 0 if no payment is made now</p>
            </div>

            {formData.initial_payment > 0 && (
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
            )}

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional notes about this custom bill..."
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700">
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Custom Bill
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
