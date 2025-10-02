"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, AlertTriangle, Wand2, AlertCircle, RefreshCw, Trash2 } from "lucide-react"
import { createUser, cleanupOrphanedAuthUsers, checkAuthUserStatus, forceDeleteAuthUser } from "@/lib/auth"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserCreated: () => void
  currentUserRole?: "admin" | "doctor" | "staff" | "patient"
  initialFirstName?: string
  initialLastName?: string
}

export function CreateUserModal({
  isOpen,
  onClose,
  onUserCreated,
  currentUserRole = "admin",
  initialFirstName = "",
  initialLastName = "",
}: CreateUserModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [autoGenerate, setAutoGenerate] = useState(true)
  const [isCheckingUniqueness, setIsCheckingUniqueness] = useState(false)
  const [nameExists, setNameExists] = useState(false)
  const [existingUserInfo, setExistingUserInfo] = useState<{
    firstName: string
    lastName: string
    email: string
  } | null>(null)
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const [orphanedUsers, setOrphanedUsers] = useState<{ email: string; created_at: string; id: string }[]>([])
  const [isLoadingOrphaned, setIsLoadingOrphaned] = useState(false)
  const [isDeletingOrphaned, setIsDeletingOrphaned] = useState<Set<string>>(new Set())
  const [checkingTimeout, setCheckingTimeout] = useState<NodeJS.Timeout | null>(null)
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
      firstName: initialFirstName,
      lastName: initialLastName,
      email: "",
      password: "",
      phone: "",
      role: "patient",
      dateOfBirth: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
    })
    setAutoGenerate(true)
    setNameExists(false)
    setExistingUserInfo(null)
    setIsCheckingUniqueness(false)

    if (checkingTimeout) {
      clearTimeout(checkingTimeout)
      setCheckingTimeout(null)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadOrphanedUsers()
      if (initialFirstName || initialLastName) {
        setFormData((prev) => ({
          ...prev,
          firstName: initialFirstName,
          lastName: initialLastName,
        }))
        if (initialFirstName && initialLastName) {
          generateEmailAndPassword(initialFirstName, initialLastName)
        }
      }
    } else {
      resetForm()
    }
  }, [isOpen, initialFirstName, initialLastName])

  const loadOrphanedUsers = async () => {
    setIsLoadingOrphaned(true)
    try {
      console.log("Loading orphaned users...")
      const { data, error } = await supabase.rpc("list_orphaned_auth_users")

      if (error) {
        console.error("Error loading orphaned users:", error)
        toast.error("Failed to load orphaned users: " + error.message)
        setOrphanedUsers([])
      } else {
        console.log("Raw orphaned users data:", data)

        let orphanedList = []
        if (data) {
          if (Array.isArray(data)) {
            orphanedList = data
          } else if (typeof data === "object" && data !== null) {
            orphanedList = [data]
          } else if (typeof data === "string") {
            try {
              orphanedList = JSON.parse(data)
            } catch (parseError) {
              console.error("Error parsing orphaned users data:", parseError)
              orphanedList = []
            }
          }
        }

        const filteredOrphanedList = orphanedList.filter(
          (user: { email: string }) => user.email !== "admin@dentalcare.com",
        )

        console.log("Processed orphaned users:", filteredOrphanedList)
        setOrphanedUsers(filteredOrphanedList || [])
      }
    } catch (error) {
      console.error("Exception loading orphaned users:", error)
      toast.error("Failed to load orphaned users")
      setOrphanedUsers([])
    } finally {
      setIsLoadingOrphaned(false)
    }
  }

  const handleDeleteOrphanedUser = async (email: string) => {
    console.log("Attempting to delete orphaned user:", email)
    setIsDeletingOrphaned((prev) => new Set(prev).add(email))

    try {
      const result = await forceDeleteAuthUser(email)
      console.log("Delete result:", result)

      if (result) {
        toast.success(`Successfully deleted orphaned auth user: ${email}`)
        await loadOrphanedUsers()
      } else {
        toast.error(`Failed to delete ${email}. Please check the console for details.`)
      }
    } catch (error: any) {
      console.error("Error deleting orphaned user:", error)
      toast.error(`Error deleting ${email}: ${error.message}`)
    } finally {
      setIsDeletingOrphaned((prev) => {
        const newSet = new Set(prev)
        newSet.delete(email)
        return newSet
      })
    }
  }

  const checkNameUniqueness = async (firstName: string, lastName: string): Promise<boolean> => {
    if (!firstName.trim() || !lastName.trim()) {
      setNameExists(false)
      setExistingUserInfo(null)
      setIsCheckingUniqueness(false)
      return false
    }

    setIsCheckingUniqueness(true)

    try {
      const { data: existingUsers, error } = await supabase
        .from("users")
        .select("first_name, last_name, email")
        .ilike("first_name", firstName.trim())
        .ilike("last_name", lastName.trim())

      if (error) {
        console.error("Error checking name uniqueness:", error)
        setNameExists(false)
        setExistingUserInfo(null)
        return false
      }

      const userExists = existingUsers && existingUsers.length > 0
      setNameExists(userExists)

      if (userExists) {
        setExistingUserInfo({
          firstName: existingUsers[0].first_name,
          lastName: existingUsers[0].last_name,
          email: existingUsers[0].email,
        })
        setFormData((prev) => ({
          ...prev,
          email: "",
          password: "",
        }))
        toast.error(`User with name "${firstName} ${lastName}" already exists!`)
        return true
      } else {
        setExistingUserInfo(null)
        return false
      }
    } catch (error) {
      console.error("Error checking name uniqueness:", error)
      setNameExists(false)
      setExistingUserInfo(null)
      return false
    } finally {
      setIsCheckingUniqueness(false)
    }
  }

  const generateEmailAndPassword = async (firstName: string, lastName: string) => {
    if (!firstName.trim() || !lastName.trim()) return

    if (checkingTimeout) {
      clearTimeout(checkingTimeout)
    }

    const timeout = setTimeout(() => {
      setIsCheckingUniqueness(false)
      console.warn("Name uniqueness check timed out")
    }, 10000)

    setCheckingTimeout(timeout)

    const exists = await checkNameUniqueness(firstName, lastName)

    clearTimeout(timeout)
    setCheckingTimeout(null)

    if (!exists && autoGenerate) {
      const cleanFirstName = firstName.trim().toLowerCase().replace(/\s+/g, "")
      const cleanLastName = lastName.trim().toLowerCase().replace(/\s+/g, "")
      const generatedEmail = `${cleanFirstName}${cleanLastName}@gmail.com`

      setFormData((prev) => ({
        ...prev,
        email: generatedEmail,
        password: generatedEmail,
      }))

      toast.success("Email and password auto-generated!")
    }
  }

  const handleAutoGenerateChange = (checked: boolean) => {
    setAutoGenerate(checked)
    if (checked && formData.firstName.trim() && formData.lastName.trim() && !nameExists) {
      const cleanFirstName = formData.firstName.trim().toLowerCase().replace(/\s+/g, "")
      const cleanLastName = formData.lastName.trim().toLowerCase().replace(/\s+/g, "")
      const generatedEmail = `${cleanFirstName}${cleanLastName}@gmail.com`

      setFormData((prev) => ({
        ...prev,
        email: generatedEmail,
        password: generatedEmail,
      }))
    }
  }

  const handleNameChange = (field: "firstName" | "lastName", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    const firstName = field === "firstName" ? value : formData.firstName
    const lastName = field === "lastName" ? value : formData.lastName

    if (checkingTimeout) {
      clearTimeout(checkingTimeout)
      setCheckingTimeout(null)
    }
    setIsCheckingUniqueness(false)
    setNameExists(false)
    setExistingUserInfo(null)

    if (firstName.trim() && lastName.trim()) {
      const timeout = setTimeout(() => {
        generateEmailAndPassword(firstName, lastName)
      }, 1000)

      setCheckingTimeout(timeout)
    } else {
      setNameExists(false)
      setExistingUserInfo(null)
      if (autoGenerate) {
        setFormData((prev) => ({
          ...prev,
          email: "",
          password: "",
        }))
      }
    }
  }

  const handleCleanupOrphanedUsers = async () => {
    setIsCleaningUp(true)
    try {
      const result = await cleanupOrphanedAuthUsers()
      if (result.success) {
        toast.success(result.message || "Cleanup completed successfully")
        await loadOrphanedUsers()
      } else {
        toast.error(`Cleanup failed: ${result.error}`)
      }
    } catch (error) {
      toast.error("Failed to cleanup orphaned users")
      console.error("Cleanup error:", error)
    } finally {
      setIsCleaningUp(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isCheckingUniqueness) {
      toast.error("Please wait for name validation to complete")
      return
    }

    setIsLoading(true)

    try {
      if (!formData.firstName.trim()) {
        throw new Error("First name is required")
      }
      if (!formData.lastName.trim()) {
        throw new Error("Last name is required")
      }

      const nameAlreadyExists = await checkNameUniqueness(formData.firstName, formData.lastName)
      if (nameAlreadyExists) {
        throw new Error(
          `A user with the name "${formData.firstName} ${formData.lastName}" already exists. Please use a different name.`,
        )
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

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        throw new Error("Please enter a valid email address")
      }

      const normalizedEmail = formData.email.trim().toLowerCase()

      const { data: emailExists } = await supabase.from("users").select("email").eq("email", normalizedEmail).single()

      if (emailExists) {
        throw new Error("A user with this email already exists. Please use a different email.")
      }

      const authStatus = await checkAuthUserStatus(normalizedEmail)
      if (authStatus.exists) {
        throw new Error(
          `An authentication user with email ${normalizedEmail} already exists. Please delete it from the orphaned users list below or use a different email.`,
        )
      }

      console.log("Creating user with data:", {
        email: normalizedEmail,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
      })

      await createUser({
        email: normalizedEmail,
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

      let errorMessage = "Failed to create user"
      if (
        error.message?.includes("User already registered") ||
        error.message?.includes("already exists in the authentication system")
      ) {
        errorMessage = `${error.message} Check the orphaned users list below.`
      } else if (error.message?.includes("duplicate key value")) {
        errorMessage = "A user with this email or ID already exists. Try running the cleanup function."
      } else if (error.message?.includes("already exists")) {
        errorMessage = error.message + " Try running the cleanup function to resolve conflicts."
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
    if (!isLoading && !isCheckingUniqueness) {
      onClose()
      resetForm()
    }
  }

  const handleManualGenerate = () => {
    if (formData.firstName.trim() && formData.lastName.trim()) {
      if (!nameExists && !isCheckingUniqueness) {
        const cleanFirstName = formData.firstName.trim().toLowerCase().replace(/\s+/g, "")
        const cleanLastName = formData.lastName.trim().toLowerCase().replace(/\s+/g, "")
        const generatedEmail = `${cleanFirstName}${cleanLastName}@gmail.com`

        setFormData((prev) => ({
          ...prev,
          email: generatedEmail,
          password: generatedEmail,
        }))

        toast.success("Email and password generated!")
      } else if (isCheckingUniqueness) {
        toast.error("Please wait for name validation to complete")
      } else {
        toast.error("Cannot generate email for duplicate name")
      }
    } else {
      toast.error("Please enter first name and last name first")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">Create New User</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
            disabled={isLoading || isCheckingUniqueness}
          ></Button>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                This will create a complete user account. The user can login immediately with the provided credentials.
              </AlertDescription>
            </Alert>

            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Important:</strong> Users with duplicate first name and last name combinations are not allowed.
                Each user must have a unique name combination.
              </AlertDescription>
            </Alert>

            {nameExists && existingUserInfo && (
              <Alert className="border-red-500 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Duplicate Name Detected!</strong>
                  <br />A user named "{existingUserInfo.firstName} {existingUserInfo.lastName}" already exists with
                  email: {existingUserInfo.email}
                  <br />
                  Please use a different name combination.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>

                <div className="flex items-center space-x-2 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <Checkbox
                    id="autoGenerate"
                    checked={autoGenerate}
                    onCheckedChange={handleAutoGenerateChange}
                    disabled={isLoading || nameExists || isCheckingUniqueness}
                  />
                  <Label htmlFor="autoGenerate" className="text-sm font-medium text-green-800 cursor-pointer">
                    Auto-generate email and password from name (Recommended)
                  </Label>
                  <Wand2 className="h-4 w-4 text-green-600" />
                  {isCheckingUniqueness && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleNameChange("firstName", e.target.value)}
                      required
                      disabled={isLoading}
                      className={`border-2 ${nameExists ? "border-red-500 bg-red-50" : "border-blue-500"} focus:border-blue-600`}
                    />
                    {nameExists && <p className="text-xs text-red-600">This name combination already exists</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleNameChange("lastName", e.target.value)}
                      required
                      disabled={isLoading}
                      className={`${nameExists ? "border-red-500 bg-red-50" : ""}`}
                    />
                    {nameExists && <p className="text-xs text-red-600">This name combination already exists</p>}
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      disabled={isLoading || (autoGenerate && !nameExists) || nameExists || isCheckingUniqueness}
                      placeholder="user@example.com"
                      className={`${(autoGenerate && !nameExists) || nameExists || isCheckingUniqueness ? "bg-gray-100" : ""}`}
                    />
                    {!autoGenerate && !nameExists && !isCheckingUniqueness && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleManualGenerate}
                        disabled={
                          isLoading ||
                          !formData.firstName.trim() ||
                          !formData.lastName.trim() ||
                          isCheckingUniqueness ||
                          nameExists
                        }
                        className="whitespace-nowrap bg-transparent"
                      >
                        <Wand2 className="h-4 w-4 mr-1" />
                        Generate
                      </Button>
                    )}
                  </div>
                  {autoGenerate &&
                    formData.firstName.trim() &&
                    formData.lastName.trim() &&
                    !nameExists &&
                    !isCheckingUniqueness && (
                      <p className="text-xs text-green-600">
                        Email will be auto-generated as: {formData.firstName.toLowerCase().replace(/\s+/g, "")}
                        {formData.lastName.toLowerCase().replace(/\s+/g, "")}@gmail.com
                      </p>
                    )}
                  {nameExists && (
                    <p className="text-xs text-red-600">Cannot generate email for duplicate name combination</p>
                  )}
                  {isCheckingUniqueness && <p className="text-xs text-blue-600">Checking name uniqueness...</p>}
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
                    disabled={isLoading || (autoGenerate && !nameExists) || nameExists || isCheckingUniqueness}
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    className={`${(autoGenerate && !nameExists) || nameExists || isCheckingUniqueness ? "bg-gray-100" : ""}`}
                  />
                  {autoGenerate && !nameExists && !isCheckingUniqueness ? (
                    <p className="text-xs text-green-600">
                      Password will be the same as the email address for easy login.
                    </p>
                  ) : nameExists ? (
                    <p className="text-xs text-red-600">Cannot generate password for duplicate name combination</p>
                  ) : isCheckingUniqueness ? (
                    <p className="text-xs text-blue-600">Waiting for name validation...</p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Consider using a temporary password that the user should change on first login.
                    </p>
                  )}
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
                      disabled={isLoading || currentUserRole !== "admin"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patient">Patient</SelectItem>
                        {currentUserRole === "admin" && (
                          <>
                            <SelectItem value="doctor">Doctor</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {currentUserRole !== "admin" && (
                      <p className="text-xs text-gray-500">You can only create patient accounts</p>
                    )}
                  </div>
                </div>
              </div>

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

              <div className="flex justify-end pt-4 border-t">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading || isCheckingUniqueness}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || isCheckingUniqueness || nameExists || isCleaningUp}
                    className={`${nameExists || isCheckingUniqueness ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </div>
                    ) : isCheckingUniqueness ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Checking...
                      </div>
                    ) : nameExists ? (
                      "Cannot Create - Duplicate Name"
                    ) : (
                      "Create User"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Orphaned Auth Users</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadOrphanedUsers}
                  disabled={isLoadingOrphaned}
                  className="text-xs bg-transparent"
                >
                  {isLoadingOrphaned ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </div>

              <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-xs">
                  These are authentication users without corresponding profiles. Delete them to resolve "User already
                  registered" errors.
                </AlertDescription>
              </Alert>

              {isLoadingOrphaned ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-2">Loading...</p>
                </div>
              ) : orphanedUsers.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">No orphaned users found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {orphanedUsers.map((user) => (
                    <div key={user.email} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.email}</p>
                        <p className="text-gray-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteOrphanedUser(user.email)}
                        disabled={isDeletingOrphaned.has(user.email)}
                        className="ml-2 h-6 w-6 p-0 border-red-600 text-red-600 hover:bg-red-50"
                      >
                        {isDeletingOrphaned.has(user.email) ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {orphanedUsers.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCleanupOrphanedUsers}
                    disabled={isCleaningUp || isLoading}
                    className="w-full text-xs bg-transparent"
                  >
                    {isCleaningUp ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Cleaning All...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Clean All Orphaned Users
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
