"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Search, UserPlus, Clock, Stethoscope, Users } from 'lucide-react'
import { supabase } from "@/lib/supabase"
import { createAppointment } from "@/lib/appointments"
import { EnhancedTimeSelector } from "@/components/enhanced-time-selector"

interface Patient {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

interface EmergencyAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAppointmentCreated: () => void
  preSelectedPatient?: Patient | null
  currentUserRole?: string
}

export function EmergencyAppointmentModal({
  isOpen,
  onClose,
  onAppointmentCreated,
  preSelectedPatient,
  currentUserRole,
}: EmergencyAppointmentModalProps) {
  const [step, setStep] = useState<"search" | "create" | "appointment">("search")
  const [searchTerm, setSearchTerm] = useState("")
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [doctors, setDoctors] = useState<User[]>([])
  const [staff, setStaff] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // New patient form
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
  })

  // Appointment form
  const [appointmentData, setAppointmentData] = useState({
    appointmentType: "",
    appointmentDate: "",
    appointmentTime: "",
    notes: "",
    doctorId: "none",
    staffId: "none",
  })

  const appointmentTypes = [
    "General Consultation",
    "Dental Cleaning",
    "Tooth Extraction",
    "Filling",
    "Root Canal",
    "Crown/Bridge",
    "Orthodontic Consultation",
    "Emergency Treatment",
  ]

  useEffect(() => {
    if (isOpen) {
      if (preSelectedPatient) {
        // If a patient is pre-selected, skip to appointment step
        setSelectedPatient(preSelectedPatient)
        setStep("appointment")
      } else {
        // Otherwise, start with search
        fetchPatients()
        setStep("search")
      }
      fetchDoctorsAndStaff()
      resetForm()
    }
  }, [isOpen, preSelectedPatient])

  useEffect(() => {
    if (searchTerm) {
      const filtered = patients.filter(
        (patient) =>
          patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (patient.phone && patient.phone.includes(searchTerm)),
      )
      setFilteredPatients(filtered)
    } else {
      setFilteredPatients(patients)
    }
  }, [searchTerm, patients])

  const resetForm = () => {
    if (!preSelectedPatient) {
      setStep("search")
      setSelectedPatient(null)
    }
    setSearchTerm("")
    setNewPatient({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      address: "",
    })
    setAppointmentData({
      appointmentType: "",
      appointmentDate: "",
      appointmentTime: "",
      notes: "",
      doctorId: "none",
      staffId: "none",
    })
  }

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, phone")
        .eq("role", "patient")
        .order("first_name")

      if (error) throw error
      setPatients(data || [])
      setFilteredPatients(data || [])
    } catch (error: any) {
      console.error("Error fetching patients:", error)
      toast.error("Failed to load patients")
    }
  }

  const fetchDoctorsAndStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, role")
        .in("role", ["doctor", "staff"])
        .order("first_name")

      if (error) throw error

      const doctors = data?.filter((user) => user.role === "doctor") || []
      const staff = data?.filter((user) => user.role === "staff") || []

      setDoctors(doctors)
      setStaff(staff)
    } catch (error: any) {
      console.error("Error fetching doctors and staff:", error)
    }
  }

  const handleCreateNewPatient = async () => {
    if (!newPatient.firstName || !newPatient.lastName || !newPatient.email) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from("users")
        .insert({
          first_name: newPatient.firstName,
          last_name: newPatient.lastName,
          email: newPatient.email,
          phone: newPatient.phone || null,
          date_of_birth: newPatient.dateOfBirth || null,
          gender: newPatient.gender || null,
          address: newPatient.address || null,
          role: "patient",
        })
        .select()
        .single()

      if (error) throw error

      const patient: Patient = {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
      }

      setSelectedPatient(patient)
      setStep("appointment")
      toast.success("New patient created successfully!")
    } catch (error: any) {
      console.error("Error creating patient:", error)
      toast.error("Failed to create patient: " + (error.message || "Unknown error"))
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateAppointment = async () => {
    if (
      !selectedPatient ||
      !appointmentData.appointmentType ||
      !appointmentData.appointmentDate ||
      !appointmentData.appointmentTime
    ) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsCreating(true)
    try {
      const result = await createAppointment({
        patientId: selectedPatient.id,
        doctorId: appointmentData.doctorId !== "none" ? appointmentData.doctorId : undefined,
        staffId: appointmentData.staffId !== "none" ? appointmentData.staffId : undefined,
        appointmentType: appointmentData.appointmentType,
        appointmentDate: appointmentData.appointmentDate,
        appointmentTime: appointmentData.appointmentTime,
        notes: appointmentData.notes,
        priority: "urgent",
      })

      if (result.success) {
        // Auto-approve if created by admin
        if (currentUserRole === "admin") {
          const { updateAppointmentStatus } = await import("@/lib/appointments")
          await updateAppointmentStatus(result.data.id, "approved")
          toast.success("Walk-in appointment created and auto-approved!")
        } else {
          toast.success("Walk-in appointment created successfully!")
        }
        onAppointmentCreated()
        onClose()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Error creating appointment:", error)
      toast.error("Failed to create appointment: " + (error.message || "Unknown error"))
    } finally {
      setIsCreating(false)
    }
  }

  const handleTimeSelect = (time: string) => {
    setAppointmentData((prev) => ({ ...prev, appointmentTime: time }))
  }

  const handleBackToSearch = () => {
    if (preSelectedPatient) {
      // If there was a pre-selected patient, close the modal instead of going back
      onClose()
    } else {
      setStep("search")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-blue-600">
            <Clock className="w-5 h-5 mr-2" />
            Walk-in Appointment
          </DialogTitle>
          <p className="text-sm text-gray-600">For patients who came directly to the clinic without booking</p>
        </DialogHeader>

        {step === "search" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search existing patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {filteredPatients.length > 0 && (
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        setSelectedPatient(patient)
                        setStep("appointment")
                      }}
                    >
                      <div className="font-medium">
                        {patient.first_name} {patient.last_name}
                      </div>
                      <div className="text-sm text-gray-600">{patient.email}</div>
                      {patient.phone && <div className="text-sm text-gray-600">{patient.phone}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-gray-600 mb-4">Patient not found?</p>
              <Button onClick={() => setStep("create")} variant="outline" className="bg-transparent">
                <UserPlus className="w-4 h-4 mr-2" />
                Create New Patient
              </Button>
            </div>
          </div>
        )}

        {step === "create" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newPatient.firstName}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newPatient.lastName}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={newPatient.dateOfBirth}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={newPatient.gender}
                  onValueChange={(value) => setNewPatient((prev) => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={newPatient.address}
                onChange={(e) => setNewPatient((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Enter full address"
                rows={2}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("search")} className="bg-transparent">
                Back to Search
              </Button>
              <Button onClick={handleCreateNewPatient} disabled={isCreating} className="bg-blue-600 hover:bg-blue-700">
                {isCreating ? "Creating..." : "Create Patient & Continue"}
              </Button>
            </div>
          </div>
        )}

        {step === "appointment" && selectedPatient && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900">Patient Information</h3>
              <p className="text-blue-800">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </p>
              <p className="text-sm text-blue-600">{selectedPatient.email}</p>
              {selectedPatient.phone && <p className="text-sm text-blue-600">{selectedPatient.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointmentType">Appointment Type *</Label>
              <Select
                value={appointmentData.appointmentType}
                onValueChange={(value) => setAppointmentData((prev) => ({ ...prev, appointmentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select appointment type" />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center">
                  <Stethoscope className="w-4 h-4 mr-2 text-green-600" />
                  Assign Doctor (Optional)
                </Label>
                <Select
                  value={appointmentData.doctorId}
                  onValueChange={(value) => setAppointmentData((prev) => ({ ...prev, doctorId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
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
                <Label className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-blue-600" />
                  Assign Staff (Optional)
                </Label>
                <Select
                  value={appointmentData.staffId}
                  onValueChange={(value) => setAppointmentData((prev) => ({ ...prev, staffId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
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

            <div className="space-y-2">
              <Label htmlFor="appointmentDate">Date *</Label>
              <Input
                id="appointmentDate"
                type="date"
                value={appointmentData.appointmentDate}
                onChange={(e) => setAppointmentData((prev) => ({ ...prev, appointmentDate: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {appointmentData.appointmentDate && (
              <div className="space-y-2">
                <Label>Select Time *</Label>
                <EnhancedTimeSelector selectedTime={appointmentData.appointmentTime} onTimeChange={handleTimeSelect} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={appointmentData.notes}
                onChange={(e) => setAppointmentData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBackToSearch} className="bg-transparent">
                {preSelectedPatient ? "Cancel" : "Back to Patient Search"}
              </Button>
              <Button onClick={handleCreateAppointment} disabled={isCreating} className="bg-blue-600 hover:bg-blue-700">
                {isCreating ? "Creating..." : "Create Walk-in Appointment"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
