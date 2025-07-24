"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { getAllPayments } from "@/lib/payments"
import { getAllAppointments } from "@/lib/appointments"
import { toast } from "sonner"
import { Search, Users, Calendar, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PatientProfileModal } from "@/components/patient-profile-modal"

interface PatientWithStats {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  created_at: string
  appointmentCount: number
  totalPaid: number
  totalBilled: number
  outstandingBalance: number
  lastVisit?: string
  upcomingAppointments: number
}

interface PatientManagementSectionProps {
  currentUserId: string
  currentUserRole: string
}

export function PatientManagementSection({ currentUserId, currentUserRole }: PatientManagementSectionProps) {
  const [patients, setPatients] = useState<PatientWithStats[]>([])
  const [filteredPatients, setFilteredPatients] = useState<PatientWithStats[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [patientProfileModal, setPatientProfileModal] = useState<{ isOpen: boolean; patientId: string }>({
    isOpen: false,
    patientId: "",
  })

  useEffect(() => {
    fetchPatientsWithStats()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [patients, searchTerm])

  const fetchPatientsWithStats = async () => {
    try {
      setIsLoading(true)

      // Fetch all patients
      const { data: patientsData, error: patientsError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "patient")
        .order("created_at", { ascending: false })

      if (patientsError) throw patientsError

      // Fetch all appointments and payments
      const [appointments, payments] = await Promise.all([getAllAppointments(), getAllPayments()])

      // Calculate stats for each patient
      const patientsWithStats: PatientWithStats[] = patientsData.map((patient) => {
        const patientAppointments = appointments.filter((apt) => apt.patient_id === patient.id)
        const patientPayments = payments.filter((payment) =>
          patientAppointments.some((apt) => apt.id === payment.appointment_id),
        )

        const totalPaid = patientPayments.reduce((sum, payment) => sum + payment.paid_amount, 0)
        const totalBilled = patientPayments.reduce((sum, payment) => sum + payment.bill_amount, 0)
        const outstandingBalance = totalBilled - totalPaid

        // Find last completed appointment
        const completedAppointments = patientAppointments
          .filter((apt) => apt.status === "completed")
          .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())

        const lastVisit = completedAppointments.length > 0 ? completedAppointments[0].appointment_date : undefined

        // Count upcoming appointments (approved status)
        const upcomingAppointments = patientAppointments.filter(
          (apt) => apt.status === "approved" && new Date(apt.appointment_date) >= new Date(),
        ).length

        return {
          ...patient,
          appointmentCount: patientAppointments.length,
          totalPaid,
          totalBilled,
          outstandingBalance,
          lastVisit,
          upcomingAppointments,
        }
      })

      setPatients(patientsWithStats)
    } catch (error: any) {
      console.error("Failed to fetch patients with stats:", error)
      toast.error("Failed to load patient data")
    } finally {
      setIsLoading(false)
    }
  }

  const filterPatients = () => {
    let filtered = patients

    if (searchTerm) {
      filtered = filtered.filter(
        (patient) =>
          patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredPatients(filtered)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getOutstandingBadgeColor = (amount: number) => {
    if (amount === 0) return "bg-green-100 text-green-800"
    if (amount > 0) return "bg-red-100 text-red-800"
    return "bg-gray-100 text-gray-800"
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Patient Management Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <CardTitle>Patient Management</CardTitle>
              <Badge variant="secondary">{patients.length} patients</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search patients..."
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
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No patients found</h3>
              <p className="text-gray-600">
                {searchTerm ? "Try adjusting your search criteria" : "No patients have been registered yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-lg">
                          {patient.first_name[0]}
                          {patient.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">
                          {patient.first_name} {patient.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{patient.email}</p>
                        {patient.phone && <p className="text-sm text-gray-500">{patient.phone}</p>}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      {/* Appointments */}
                      <div className="text-center">
                        <div className="flex items-center space-x-1 mb-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <p className="text-xs text-gray-500">Appointments</p>
                        </div>
                        <p className="font-semibold">{patient.appointmentCount}</p>
                        {patient.upcomingAppointments > 0 && (
                          <p className="text-xs text-blue-600">{patient.upcomingAppointments} upcoming</p>
                        )}
                      </div>

                      {/* Financial Info */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Total Paid</p>
                        <p className="font-semibold text-green-600">₹{patient.totalPaid.toFixed(2)}</p>
                      </div>

                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Outstanding</p>
                        <Badge className={`text-xs ${getOutstandingBadgeColor(patient.outstandingBalance)}`}>
                          ₹{patient.outstandingBalance.toFixed(2)}
                        </Badge>
                      </div>

                      {/* Last Visit */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Last Visit</p>
                        <p className="text-sm font-medium">
                          {patient.lastVisit ? formatDate(patient.lastVisit) : "Never"}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPatientProfileModal({ isOpen: true, patientId: patient.id })}
                          className="bg-transparent"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PatientProfileModal
        isOpen={patientProfileModal.isOpen}
        onClose={() => setPatientProfileModal({ isOpen: false, patientId: "" })}
        patientId={patientProfileModal.patientId}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </div>
  )
}
