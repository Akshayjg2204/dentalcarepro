"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { UserPlus, Phone, Stethoscope, Users } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { createLead } from "@/lib/leads"

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onLeadCreated: () => void
}

export function CreateLeadModal({ isOpen, onClose, onLeadCreated }: CreateLeadModalProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    assigned_doctor: "",
    assigned_staff: "",
    consultation_reason: "",
    consultation_date: "",
    consultation_time: "",
    notes: "",
  })
  const [isLoading, setIsLoading] = useState(false)
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

    if (
      !formData.first_name.trim() ||
      !formData.last_name.trim() ||
      !formData.phone.trim() ||
      !formData.consultation_reason.trim()
    ) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    try {
      const leadData: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        consultation_reason: formData.consultation_reason.trim(),
      }

      if (formData.assigned_doctor) {
        leadData.assigned_doctor = formData.assigned_doctor
      }

      if (formData.assigned_staff) {
        leadData.assigned_staff = formData.assigned_staff
      }

      if (formData.consultation_date) {
        leadData.consultation_date = formData.consultation_date
      }

      if (formData.consultation_time) {
        leadData.consultation_time = formData.consultation_time
      }

      if (formData.notes.trim()) {
        leadData.notes = formData.notes.trim()
      }

      await createLead(leadData)
      toast.success("Lead created successfully!")
      onLeadCreated()
      handleClose()
    } catch (error: any) {
      console.error("Error creating lead:", error)
      toast.error("Failed to create lead: " + (error.message || "Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        first_name: "",
        last_name: "",
        phone: "",
        assigned_doctor: "",
        assigned_staff: "",
        consultation_reason: "",
        consultation_date: "",
        consultation_time: "",
        notes: "",
      })
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-blue-600">
            <UserPlus className="w-5 h-5 mr-2" />
            Create New Lead
          </DialogTitle>
          <p className="text-sm text-gray-600">Add a potential patient for consultation</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="flex items-center">
                <Stethoscope className="w-4 h-4 mr-1 text-blue-600" />
                First Name *
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Enter first name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Enter last name"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center">
              <Phone className="w-4 h-4 mr-1 text-green-600" />
              Phone Number *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              required
            />
          </div>

          {/* Doctor Assignment */}
          <div className="space-y-2">
            <Label className="flex items-center">
              <Stethoscope className="w-4 h-4 mr-1 text-green-600" />
              Assign Doctor (Optional)
            </Label>
            <Select
              value={formData.assigned_doctor}
              onValueChange={(value) => setFormData({ ...formData, assigned_doctor: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No doctor assigned</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    <div className="flex items-center">
                      <Stethoscope className="w-3 h-3 mr-1 text-green-600" />
                      Dr. {doctor.first_name} {doctor.last_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff Assignment */}
          <div className="space-y-2">
            <Label className="flex items-center">
              <Users className="w-4 h-4 mr-1 text-blue-600" />
              Assign Staff (Optional)
            </Label>
            <Select
              value={formData.assigned_staff}
              onValueChange={(value) => setFormData({ ...formData, assigned_staff: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No staff assigned</SelectItem>
                {staff.map((staffMember) => (
                  <SelectItem key={staffMember.id} value={staffMember.id}>
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1 text-blue-600" />
                      {staffMember.first_name} {staffMember.last_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Consultation Reason */}
          <div className="space-y-2">
            <Label htmlFor="consultation_reason">Consultation Reason *</Label>
            <Textarea
              id="consultation_reason"
              value={formData.consultation_reason}
              onChange={(e) => setFormData({ ...formData, consultation_reason: e.target.value })}
              placeholder="Describe the reason for consultation..."
              rows={3}
              required
            />
          </div>

          {/* Consultation Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="consultation_date">Consultation Date</Label>
              <Input
                id="consultation_date"
                type="date"
                value={formData.consultation_date}
                onChange={(e) => setFormData({ ...formData, consultation_date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultation_time">Time</Label>
              <Input
                id="consultation_time"
                type="time"
                value={formData.consultation_time}
                onChange={(e) => setFormData({ ...formData, consultation_time: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                "Create Lead"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
