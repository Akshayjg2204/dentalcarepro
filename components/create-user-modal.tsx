"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, CheckCircle, AlertTriangle } from "lucide-react"
import { createUser } from "@/lib/auth"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserCreated: () => void
}

export function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: "patient" as "doctor" | "staff" | "patient",
    dateOfBirth: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  })

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      role: "patient",
      dateOfBirth: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate required fields
      if (!formData.firstName.trim()) {
        throw new Error("First name is required")
      }
      if (!formData.lastName.trim()) {
        throw new Error("Last name is required")
      }
      if (!formData.email.trim()) {
        throw new Error("Email is required")
      }
      if (!formData.password.trim()) {
        throw new Error("Password is required")
      }
      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters long")
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        throw new Error("Please enter a valid email address")
      }

      await createUser({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        role: formData.role,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.address.trim() || undefined,
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
      })

      toast.success("User created successfully! They can now login with their credentials.")
      onUserCreated()
      onClose()
      resetForm()
    } catch (error: any) {
      console.error("Create user error:", error)

      // Handle specific errors
      let errorMessage = "Failed to create user"
      if (error.message?.includes("User already registered")) {
        errorMessage = "A user with this email already exists"
      } else if (error.message?.includes("duplicate key value")) {
        errorMessage = "A user with this email already exists"
      } else if (error.message?.includes("already exists")) {
        errorMessage = "A user with this email already exists"
      } else if (error.message?.includes("Password should be at least")) {
        errorMessage = "Password must be at least 6 characters long"
      } else if (error.message?.includes("Invalid email")) {
        errorMessage = "Please enter a valid email address"
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage)
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">Create New User</DialogTitle>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0" disabled={isLoading}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Alert className="mb-4">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            This will create a complete user account. The user can login immediately with the provided credentials.
          </AlertDescription>
        </Alert>

        <Alert className="mb-4 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Make sure to provide the login credentials to the user securely. Consider using a temporary password that
            they should change on first login.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  required
                  disabled={isLoading}
                  className="border-2 border-blue-500 focus:border-blue-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                disabled={isLoading}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                placeholder="Minimum 6 characters"
              />
              <p className="text-xs text-gray-500">
                Consider using a temporary password that the user should change on first login.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  disabled={isLoading}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange("role", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="text-lg font-medium mb-4">Additional Information</h3>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                rows={3}
                disabled={isLoading}
                placeholder="Street address, city, state, zip code"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleInputChange("emergencyContactName", e.target.value)}
                  disabled={isLoading}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)}
                  disabled={isLoading}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <div className="flex gap-3">
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
                  "Create User"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
