"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { X, User, FileText, Clock, Edit, Eye, Save, XCircle } from "lucide-react"
import { getPatientRecord, updatePatientRecord, type PatientRecord } from "@/lib/patient-records"
import { toast } from "sonner"

interface PatientProfileModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  currentUserId: string
  currentUserRole: string
  onPatientUpdated?: () => void
}

export function PatientProfileModal({
  isOpen,
  onClose,
  patientId,
  currentUserId,
  currentUserRole,
  onPatientUpdated,
}: PatientProfileModalProps) {
  const [patient, setPatient] = useState<PatientRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<PatientRecord>>({})
  const [originalData, setOriginalData] = useState<PatientRecord | null>(null)

  const canEdit = currentUserRole === "admin" || currentUserRole === "doctor"

  useEffect(() => {
    if (isOpen && patientId) {
      fetchPatient()
    }
  }, [isOpen, patientId])

  const fetchPatient = async () => {
    try {
      setIsLoading(true)
      console.log("Fetching patient data for ID:", patientId)
      const patientData = await getPatientRecord(patientId)
      console.log("Patient data received:", patientData)
      setPatient(patientData)
      setOriginalData(patientData)
      setFormData(patientData)
    } catch (error: any) {
      console.error("Failed to fetch patient:", error)
      toast.error("Failed to load patient information")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!patient || !formData) return

    try {
      setIsSaving(true)

      // Prepare the update data with only changed fields
      const updateData: Partial<PatientRecord> = {}

      // Compare each field and only include changed ones
      if (formData.first_name !== originalData?.first_name) {
        updateData.first_name = formData.first_name || ""
      }
      if (formData.last_name !== originalData?.last_name) {
        updateData.last_name = formData.last_name || ""
      }
      if (formData.email !== originalData?.email) {
        updateData.email = formData.email || ""
      }
      if (formData.phone !== originalData?.phone) {
        updateData.phone = formData.phone || null
      }
      if (formData.date_of_birth !== originalData?.date_of_birth) {
        updateData.date_of_birth = formData.date_of_birth || null
      }
      if (formData.address !== originalData?.address) {
        updateData.address = formData.address || null
      }
      if (formData.emergency_contact_name !== originalData?.emergency_contact_name) {
        updateData.emergency_contact_name = formData.emergency_contact_name || null
      }
      if (formData.emergency_contact_phone !== originalData?.emergency_contact_phone) {
        updateData.emergency_contact_phone = formData.emergency_contact_phone || null
      }
      if (formData.medical_conditions !== originalData?.medical_conditions) {
        updateData.medical_conditions = formData.medical_conditions || null
      }
      if (formData.allergies !== originalData?.allergies) {
        updateData.allergies = formData.allergies || null
      }
      if (formData.dental_history !== originalData?.dental_history) {
        updateData.dental_history = formData.dental_history || null
      }

      console.log("Saving patient data:", updateData)

      const updatedPatient = await updatePatientRecord(patient.id, updateData)
      setPatient(updatedPatient)
      setOriginalData(updatedPatient)
      setFormData(updatedPatient)
      setIsEditMode(false)
      toast.success("Patient information updated successfully")
      onPatientUpdated?.()
    } catch (error: any) {
      console.error("Failed to update patient:", error)
      toast.error(`Failed to update patient information: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (originalData) {
      setFormData(originalData)
      setPatient(originalData)
    }
    setIsEditMode(false)
  }

  const handleInputChange = (field: keyof PatientRecord, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not provided"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Mobile-optimized header */}
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            {/* Patient name and icon - stacked on mobile */}
            <DialogTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <User className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">
                {patient ? `${patient.first_name} ${patient.last_name}` : "Patient Profile"}
              </span>
            </DialogTitle>

            {/* Action buttons - stacked on mobile */}
            <div className="flex items-center justify-between sm:justify-end space-x-2">
              {canEdit && (
                <Button
                  variant={isEditMode ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    if (isEditMode) {
                      handleCancel()
                    } else {
                      setIsEditMode(true)
                    }
                  }}
                  className="flex items-center space-x-1 text-xs sm:text-sm"
                >
                  {isEditMode ? (
                    <>
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">View Mode</span>
                      <span className="sm:hidden">View</span>
                    </>
                  ) : (
                    <>
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Edit Mode</span>
                      <span className="sm:hidden">Edit</span>
                    </>
                  )}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading patient information...</p>
            </div>
          </div>
        ) : patient ? (
          <div className="space-y-6">
            {/* Mobile-optimized tabs */}
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="basic" className="text-xs sm:text-sm px-2 py-2">
                  <span className="hidden sm:inline">Basic Information</span>
                  <span className="sm:hidden">Basic</span>
                </TabsTrigger>
                <TabsTrigger value="medical" className="text-xs sm:text-sm px-2 py-2">
                  <span className="hidden sm:inline">Medical & Dental</span>
                  <span className="sm:hidden">Medical</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm px-2 py-2">
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                      <User className="w-4 h-4" />
                      <span>Personal Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.first_name || ""}
                          onChange={(e) => handleInputChange("first_name", e.target.value)}
                          disabled={!isEditMode}
                          className={!isEditMode ? "bg-gray-50" : ""}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.last_name || ""}
                          onChange={(e) => handleInputChange("last_name", e.target.value)}
                          disabled={!isEditMode}
                          className={!isEditMode ? "bg-gray-50" : ""}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email || ""}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          disabled={!isEditMode}
                          className={!isEditMode ? "bg-gray-50" : ""}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone || ""}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          disabled={!isEditMode}
                          className={!isEditMode ? "bg-gray-50" : ""}
                        />
                      </div>
                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.date_of_birth || ""}
                          onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                          disabled={!isEditMode}
                          className={!isEditMode ? "bg-gray-50" : ""}
                        />
                        {formData.date_of_birth && (
                          <p className="text-sm text-gray-500 mt-1">
                            Age: {calculateAge(formData.date_of_birth)} years
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={formData.address || ""}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        disabled={!isEditMode}
                        className={!isEditMode ? "bg-gray-50" : ""}
                        rows={3}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Emergency Contact</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="emergencyName">Contact Name</Label>
                          <Input
                            id="emergencyName"
                            value={formData.emergency_contact_name || ""}
                            onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                            disabled={!isEditMode}
                            className={!isEditMode ? "bg-gray-50" : ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergencyPhone">Contact Phone</Label>
                          <Input
                            id="emergencyPhone"
                            value={formData.emergency_contact_phone || ""}
                            onChange={(e) => handleInputChange("emergency_contact_phone", e.target.value)}
                            disabled={!isEditMode}
                            className={!isEditMode ? "bg-gray-50" : ""}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="medical" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                      <FileText className="w-4 h-4" />
                      <span>Medical Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="medicalConditions">Medical Conditions</Label>
                      <Textarea
                        id="medicalConditions"
                        value={formData.medical_conditions || ""}
                        onChange={(e) => handleInputChange("medical_conditions", e.target.value)}
                        disabled={!isEditMode}
                        className={!isEditMode ? "bg-gray-50" : ""}
                        rows={4}
                        placeholder="List any medical conditions, medications, or relevant medical history..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="allergies">Allergies</Label>
                      <Textarea
                        id="allergies"
                        value={formData.allergies || ""}
                        onChange={(e) => handleInputChange("allergies", e.target.value)}
                        disabled={!isEditMode}
                        className={!isEditMode ? "bg-gray-50" : ""}
                        rows={3}
                        placeholder="List any known allergies (medications, foods, materials, etc.)..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="dentalHistory">Dental History</Label>
                      <Textarea
                        id="dentalHistory"
                        value={formData.dental_history || ""}
                        onChange={(e) => handleInputChange("dental_history", e.target.value)}
                        disabled={!isEditMode}
                        className={!isEditMode ? "bg-gray-50" : ""}
                        rows={4}
                        placeholder="Previous dental treatments, procedures, concerns, etc..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                      <Clock className="w-4 h-4" />
                      <span>Account History</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Account Created</Label>
                        <p className="text-sm text-gray-600 mt-1">{formatDate(patient.created_at)}</p>
                      </div>
                      <div>
                        <Label>Last Updated</Label>
                        <p className="text-sm text-gray-600 mt-1">{formatDate(patient.updated_at)}</p>
                      </div>
                      <div>
                        <Label>Patient Role</Label>
                        <Badge variant="secondary" className="mt-1">
                          {patient.role.charAt(0).toUpperCase() + patient.role.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons - Mobile optimized */}
            {isEditMode && canEdit && (
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="w-full sm:w-auto bg-transparent"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Patient information not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
