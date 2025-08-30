"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText } from "lucide-react"
import { createCustomBill } from "@/lib/custom-bills"
import { toast } from "sonner"

interface CreateCustomBillModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  currentUserId: string
  onBillCreated: () => void
}

export function CreateCustomBillModal({
  isOpen,
  onClose,
  patientId,
  currentUserId,
  onBillCreated,
}: CreateCustomBillModalProps) {
  const [formData, setFormData] = useState({
    billName: "",
    billDate: new Date().toISOString().split("T")[0],
    billAmount: "",
    paidAmount: "",
    paymentMethod: "",
    assignedTo: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const billAmount = Number.parseFloat(formData.billAmount)
      const paidAmount = Number.parseFloat(formData.paidAmount) || 0

      if (paidAmount > billAmount) {
        throw new Error("Paid amount cannot exceed bill amount")
      }

      await createCustomBill({
        patient_id: patientId,
        bill_name: formData.billName,
        bill_date: formData.billDate,
        bill_amount: billAmount,
        paid_amount: paidAmount,
        payment_method: formData.paymentMethod || null,
        assigned_to: formData.assignedTo || null,
        notes: formData.notes || null,
        created_by: currentUserId,
      })

      onBillCreated()
      onClose()

      // Reset form
      setFormData({
        billName: "",
        billDate: new Date().toISOString().split("T")[0],
        billAmount: "",
        paidAmount: "",
        paymentMethod: "",
        assignedTo: "",
        notes: "",
      })
    } catch (error: any) {
      console.error("Error creating custom bill:", error)
      toast.error("Failed to create custom bill: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Create Custom Bill</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billName">Bill Name *</Label>
                <Input
                  id="billName"
                  value={formData.billName}
                  onChange={(e) => handleInputChange("billName", e.target.value)}
                  placeholder="e.g., Consultation Fee, X-Ray, etc."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billDate">Bill Date *</Label>
                <Input
                  id="billDate"
                  type="date"
                  value={formData.billDate}
                  onChange={(e) => handleInputChange("billDate", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billAmount">Bill Amount (Rs) *</Label>
                <Input
                  id="billAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.billAmount}
                  onChange={(e) => handleInputChange("billAmount", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidAmount">Paid Amount (Rs)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.paidAmount}
                  onChange={(e) => handleInputChange("paidAmount", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => handleInputChange("paymentMethod", value)}
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) => handleInputChange("assignedTo", e.target.value)}
                  placeholder="Doctor/Staff name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes about this bill..."
                rows={3}
              />
            </div>
          </form>
        </div>

        <div className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? "Creating..." : "Create Bill"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
