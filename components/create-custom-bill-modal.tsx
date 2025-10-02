"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Stethoscope, Users } from "lucide-react"
import { createCustomBill } from "@/lib/custom-bills"
import { supabase } from "@/lib/supabase"
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
    assignedDoctor: "",
    assignedStaff: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchDoctorsAndStaff()
    }
  }, [isOpen])

  const fetchDoctorsAndStaff = async () => {
    try {
      // Fetch doctors
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("users")
        .select("id, first_name, last_name, role")
        .eq("role", "doctor")
        .order("first_name")

      if (doctorsError) throw doctorsError
      setDoctors(doctorsData || [])

      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from("users")
        .select("id, first_name, last_name, role")
        .eq("role", "staff")
        .order("first_name")

      if (staffError) throw staffError
      setStaff(staffData || [])
    } catch (error: any) {
      console.error("Error fetching doctors and staff:", error)
      toast.error("Failed to load doctors and staff")
    }
  }

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
        assigned_doctor: formData.assignedDoctor || null,
        assigned_staff: formData.assignedStaff || null,
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
        assignedDoctor: "",
        assignedStaff: "",
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Create Custom Bill</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bill Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Bill Details</h3>
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
            </div>
          </div>

          {/* Payment Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="space-y-2 md:col-span-2">
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
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Assignment (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-green-600" />
                  <span>Assign Doctor</span>
                </Label>
                <Select
                  value={formData.assignedDoctor}
                  onValueChange={(value) => handleInputChange("assignedDoctor", value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No doctor assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No doctor assigned</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Assign Staff</span>
                </Label>
                <Select
                  value={formData.assignedStaff}
                  onValueChange={(value) => handleInputChange("assignedStaff", value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No staff assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No staff assigned</SelectItem>
                    {staff.map((staffMember) => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.first_name} {staffMember.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Additional Information</h3>
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
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-gray-900 hover:bg-gray-800">
              {isSubmitting ? "Creating..." : "Create Bill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
