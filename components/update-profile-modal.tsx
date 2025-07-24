"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { User, Edit } from 'lucide-react'
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface UpdateProfileModalProps {
  user: any
  onProfileUpdate: () => void
}

export function UpdateProfileModal({ user, onProfileUpdate }: UpdateProfileModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    postal_code: user?.postal_code || "",
    emergency_contact: user?.emergency_contact || "",
    emergency_phone: user?.emergency_phone || "",
    medical_history: user?.medical_history || "",
    allergies: user?.allergies || "",
    current_medications: user?.current_medications || "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from("users")
        .update(formData)
        .eq("id", user.id)

      if (error) throw error

      toast.success("Profile updated successfully!")
      setIsOpen(false)
      onProfileUpdate()
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full bg-transparent">
          <Edit className="w-4 h-4 mr-2" />
          Update Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Update Profile
          </DialogTitle>
          <DialogDescription>
            Update your personal information and medical details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>

          {/* Address Information */}
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergency_contact">Emergency Contact Name</Label>
              <Input
                id="emergency_contact"
                name="emergency_contact"
                value={formData.emergency_contact}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="emergency_phone">Emergency Contact Phone</Label>
              <Input
                id="emergency_phone"
                name="emergency_phone"
                type="tel"
                value={formData.emergency_phone}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Medical Information */}
          <div>
            <Label htmlFor="medical_history">Medical History</Label>
            <Textarea
              id="medical_history"
              name="medical_history"
              value={formData.medical_history}
              onChange={handleInputChange}
              rows={3}
              placeholder="Any relevant medical history..."
            />
          </div>

          <div>
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              name="allergies"
              value={formData.allergies}
              onChange={handleInputChange}
              rows={2}
              placeholder="List any allergies..."
            />
          </div>

          <div>
            <Label htmlFor="current_medications">Current Medications</Label>
            <Textarea
              id="current_medications"
              name="current_medications"
              value={formData.current_medications}
              onChange={handleInputChange}
              rows={2}
              placeholder="List current medications..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
