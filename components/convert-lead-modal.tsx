"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { UserCheck, Mail, Lock, Calendar, MapPin, Phone } from 'lucide-react'
import { convertLeadToUser, type Lead } from "@/lib/leads"

interface ConvertLeadModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onLeadConverted: () => void
}

export function ConvertLeadModal({ isOpen, onClose, lead, onLeadConverted }: ConvertLeadModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    date_of_birth: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email.trim() || !formData.password.trim()) {
      toast.error("Email and password are required")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long")
      return
    }

    if (!lead) {
      toast.error("No lead selected")
      return
    }

    setIsLoading(true)
    try {
      const userData = {
        email: formData.email.trim(),
        password: formData.password,
        date_of_birth: formData.date_of_birth || undefined,
        address: formData.address.trim() || undefined,
        emergency_contact_name: formData.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || undefined,
      }

      await convertLeadToUser(lead.id, userData)
      toast.success("Lead converted to user successfully!")
      onLeadConverted()
      handleClose()
    } catch (error: any) {
      console.error("Error converting lead:", error)
      toast.error("Failed to convert lead: " + (error.message || "Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        date_of_birth: "",
        address: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
      })
      onClose()
    }
  }

  if (!lead) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-green-600">
            <UserCheck className="w-5 h-5 mr-2" />
            Convert Lead to User
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Convert {lead.first_name} {lead.last_name} to a full user account
          </p>
        </DialogHeader>

        {/* Lead Info */}
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <h4 className="font-medium text-sm mb-2">Lead Information</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Name:</strong> {lead.first_name} {lead.last_name}</p>
            <p><strong>Phone:</strong> {lead.phone}</p>
            <p><strong>Reason:</strong> {lead.consultation_reason}</p>
            {lead.assigned_user && (
              <p><strong>Assigned to:</strong> {lead.assigned_user.role === "doctor" ? "Dr. " : ""}{lead.assigned_user.first_name} {lead.assigned_user.last_name}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center">
              <Mail className="w-4 h-4 mr-1 text-blue-600" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center">
              <Lock className="w-4 h-4 mr-1 text-red-600" />
              Password *
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password (min 6 characters)"
              required
              minLength={6}
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirm password"
              required
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label htmlFor="date_of_birth" className="flex items-center">
              <Calendar className="w-4 h-4 mr-1 text-purple-600" />
              Date of Birth
            </Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-green-600" />
              Address
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter full address"
              rows={2}
            />
          </div>

          {/* Emergency Contact */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Emergency Contact (Optional)</Label>
            <div className="space-y-2">
              <Input
                placeholder="Emergency contact name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              />
              <Input
                placeholder="Emergency contact phone"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Converting...
                </div>
              ) : (
                "Convert to User"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
