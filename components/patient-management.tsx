"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Search,
  Phone,
  Mail,
  Calendar,
  Clock,
  Plus,
  User,
  MapPin,
  Cake,
  IndianRupee,
  AlertTriangle,
  UserPlus,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { EmergencyAppointmentModal } from "@/components/emergency-appointment-modal"
import { PatientProfileModal } from "@/components/patient-profile-modal"
import { CreateUserModal } from "@/components/create-user-modal"
import { getBillingRecords } from "@/lib/treatments"
import { getPatientPayments } from "@/lib/patient-payments"

interface Patient {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  gender?: string
  address?: string
  created_at: string
}

interface PatientFinancialSummary {
  patientId: string
  totalPaid: number
  outstandingBalance: number
  totalBilled: number
}

interface PatientManagementSectionProps {
  currentUserId: string
  currentUserRole: string
}

export function PatientManagementSection({ currentUserId, currentUserRole }: PatientManagementSectionProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false)
  const [selectedPatientForWalkIn, setSelectedPatientForWalkIn] = useState<Patient | null>(null)
  const [financialSummaries, setFinancialSummaries] = useState<Map<string, PatientFinancialSummary>>(new Map())
  const [isCreatePatientModalOpen, setIsCreatePatientModalOpen] = useState(false)
  const [patientProfileModal, setPatientProfileModal] = useState<{
    isOpen: boolean
    patientId: string
    initialTab?: string
  }>({
    isOpen: false,
    patientId: "",
    initialTab: "",
  })

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [patients, searchTerm])

  useEffect(() => {
    if (patients.length > 0) {
      fetchFinancialSummaries()
    }
  }, [patients])

  const fetchPatients = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "patient")
        .order("created_at", { ascending: false })

      if (error) throw error
      setPatients(data || [])
    } catch (error: any) {
      console.error("Error fetching patients:", error)
      toast.error("Failed to fetch patients")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFinancialSummaries = async () => {
    try {
      const summaries = new Map<string, PatientFinancialSummary>()

      // Fetch financial data for each patient in parallel
      const financialPromises = patients.map(async (patient) => {
        try {
          const [appointmentPayments, billingRecords] = await Promise.all([
            getPatientPayments(patient.id),
            getBillingRecords(patient.id),
          ])

          const appointmentTotals = appointmentPayments.reduce(
            (acc, payment) => ({
              totalBilled: acc.totalBilled + payment.bill_amount,
              totalPaid: acc.totalPaid + payment.paid_amount,
            }),
            { totalBilled: 0, totalPaid: 0 },
          )

          const customBillTotals = billingRecords
            .filter((record) => {
              if (record.isCustomBill) return true
              return record.appointment_type && record.appointment_type !== "undefined"
            })
            .reduce(
              (acc, record) => ({
                totalBilled: acc.totalBilled + (record.amount || 0),
                totalPaid: acc.totalPaid + (record.amount_paid || 0),
              }),
              { totalBilled: 0, totalPaid: 0 },
            )

          const totalBilled = appointmentTotals.totalBilled + customBillTotals.totalBilled
          const totalPaid = appointmentTotals.totalPaid + customBillTotals.totalPaid
          const outstandingBalance = Math.max(0, totalBilled - totalPaid)

          return {
            patientId: patient.id,
            totalPaid,
            outstandingBalance,
            totalBilled,
          }
        } catch (error) {
          console.error(`Error fetching financial data for patient ${patient.id}:`, error)
          return {
            patientId: patient.id,
            totalPaid: 0,
            outstandingBalance: 0,
            totalBilled: 0,
          }
        }
      })

      const results = await Promise.all(financialPromises)

      results.forEach((summary) => {
        summaries.set(summary.patientId, summary)
      })

      setFinancialSummaries(summaries)
    } catch (error) {
      console.error("Error fetching financial summaries:", error)
    }
  }

  const filterPatients = () => {
    if (!searchTerm) {
      setFilteredPatients(patients)
      return
    }

    const filtered = patients.filter(
      (patient) =>
        patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.phone && patient.phone.includes(searchTerm)),
    )
    setFilteredPatients(filtered)
  }

  const getPatientFinancialSummary = (patientId: string): PatientFinancialSummary => {
    return financialSummaries.get(patientId) || { patientId, totalPaid: 0, outstandingBalance: 0, totalBilled: 0 }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  const handleWalkInAppointment = (patient?: Patient) => {
    if (patient) {
      setSelectedPatientForWalkIn(patient)
    } else {
      setSelectedPatientForWalkIn(null)
    }
    setIsWalkInModalOpen(true)
  }

  const handleViewProfile = (patientId: string) => {
    setPatientProfileModal({ isOpen: true, patientId, initialTab: "" })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <CardTitle>Patient Management</CardTitle>
              <Badge variant="secondary">{patients.length} patients</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsCreatePatientModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Patient
              </Button>
              <Button
                onClick={() => handleWalkInAppointment()}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Walk-in Appointment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search patients by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Patients List */}
          {filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{searchTerm ? "No patients found" : "No patients yet"}</h3>
              <p className="text-gray-600">
                {searchTerm ? "Try adjusting your search criteria" : "Patients will appear here once they register"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPatients.map((patient) => {
                const financialSummary = getPatientFinancialSummary(patient.id)

                return (
                  <div key={patient.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    {/* Mobile Layout */}
                    <div className="block sm:hidden space-y-3">
                      {/* Patient Info */}
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-sm">
                            {patient.first_name[0]}
                            {patient.last_name[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-base truncate">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <div className="flex items-center text-xs text-gray-600 mt-1">
                            <Mail className="w-3 h-3 mr-1" />
                            <span className="truncate">{patient.email}</span>
                          </div>
                          {patient.phone && (
                            <div className="flex items-center text-xs text-gray-600 mt-1">
                              <Phone className="w-3 h-3 mr-1" />
                              <span>{patient.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-blue-600">
                            <IndianRupee className="w-3 h-3 mr-1" />
                            <span>Total Billed:</span>
                          </div>
                          <span className="font-medium">Rs {financialSummary.totalBilled.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-green-600">
                            <IndianRupee className="w-3 h-3 mr-1" />
                            <span>Total Paid:</span>
                          </div>
                          <span className="font-medium">Rs {financialSummary.totalPaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-red-600">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            <span>Outstanding:</span>
                          </div>
                          <span className="font-medium">Rs {financialSummary.outstandingBalance.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                        {patient.date_of_birth && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Cake className="w-3 h-3 mr-1 text-gray-500" />
                              <span>Age: {calculateAge(patient.date_of_birth)} years</span>
                            </div>
                            <span className="text-gray-500">{formatDate(patient.date_of_birth)}</span>
                          </div>
                        )}
                        {patient.gender && (
                          <div className="flex items-center">
                            <User className="w-3 h-3 mr-1 text-gray-500" />
                            <span>Gender: {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}</span>
                          </div>
                        )}
                        {patient.address && (
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-gray-500" />
                            <span className="truncate">{patient.address}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-gray-500" />
                          <span>Registered: {formatDate(patient.created_at)}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleViewProfile(patient.id)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 h-7 flex-1"
                        >
                          View Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWalkInAppointment(patient)}
                          className="border-red-600 text-red-600 hover:bg-red-50 text-xs px-3 py-1 h-7 flex-1"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Walk-in
                        </Button>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex sm:items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {patient.first_name[0]}
                            {patient.last_name[0]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-lg">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Mail className="w-4 h-4 mr-1" />
                            <span className="mr-4">{patient.email}</span>
                            {patient.phone && (
                              <>
                                <Phone className="w-4 h-4 mr-1" />
                                <span>{patient.phone}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                            {patient.date_of_birth && (
                              <div className="flex items-center">
                                <Cake className="w-4 h-4 mr-1" />
                                <span>Age: {calculateAge(patient.date_of_birth)}</span>
                              </div>
                            )}
                            {patient.gender && (
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-1" />
                                <span>{patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span>Registered: {formatDate(patient.created_at)}</span>
                            </div>
                          </div>
                          {patient.address && (
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span>{patient.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1 text-right mr-4">
                          <div className="flex items-center text-sm text-blue-600">
                            <IndianRupee className="w-4 h-4 mr-1" />
                            <span className="font-medium">Rs {financialSummary.totalBilled.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-gray-500">Total Billed</div>
                          <div className="flex items-center text-sm text-green-600 mt-1">
                            <IndianRupee className="w-4 h-4 mr-1" />
                            <span className="font-medium">Rs {financialSummary.totalPaid.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-gray-500">Total Paid</div>
                          <div className="flex items-center text-sm text-red-600 mt-1">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            <span className="font-medium">Rs {financialSummary.outstandingBalance.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-gray-500">Outstanding</div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleViewProfile(patient.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          View Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWalkInAppointment(patient)}
                          className="border-red-600 text-red-600 hover:bg-red-50"
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Walk-in Appointment
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EmergencyAppointmentModal
        isOpen={isWalkInModalOpen}
        onClose={() => {
          setIsWalkInModalOpen(false)
          setSelectedPatientForWalkIn(null)
        }}
        onAppointmentCreated={() => {
          setIsWalkInModalOpen(false)
          setSelectedPatientForWalkIn(null)
          toast.success("Walk-in appointment created successfully!")
        }}
        preSelectedPatient={selectedPatientForWalkIn}
        currentUserRole={currentUserRole}
      />

      <CreateUserModal
        isOpen={isCreatePatientModalOpen}
        onClose={() => setIsCreatePatientModalOpen(false)}
        onUserCreated={() => {
          fetchPatients() // Refresh the patient list
          toast.success("Patient created successfully!")
        }}
        currentUserRole={currentUserRole as "admin" | "doctor" | "staff" | "patient"}
      />

      <PatientProfileModal
        isOpen={patientProfileModal.isOpen}
        onClose={() => setPatientProfileModal({ isOpen: false, patientId: "", initialTab: "" })}
        patientId={patientProfileModal.patientId}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        initialTab={patientProfileModal.initialTab}
      />
    </>
  )
}
