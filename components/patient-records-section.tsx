"use client"

import { useState, useEffect } from "react"
import { Search, RefreshCw, Eye, Users, FileText, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PatientProfileModal } from "@/components/patient-profile-modal"
import { getAllPatientRecords, type PatientRecord } from "@/lib/patient-records"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase-client"

interface PatientRecordsSectionProps {
  currentUserId: string
  currentUserRole: string
}

export function PatientRecordsSection({ currentUserId, currentUserRole }: PatientRecordsSectionProps) {
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [filteredPatients, setFilteredPatients] = useState<PatientRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalPatients: 0,
    completedTreatments: 0,
    ongoingTreatments: 0,
    opdNotConvertedTreatments: 0,
  })

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    filterAndSortPatients()
  }, [patients, searchTerm, sortBy])

  const fetchPatients = async () => {
    try {
      setIsLoading(true)
      const patientsData = await getAllPatientRecords()
      setPatients(patientsData)

      const totalPatients = patientsData.length

      const timestamp = Date.now()
      const { data: treatmentsData, error: treatmentsError } = await supabase
        .from("patient_treatments")
        .select("status")
        .limit(10000) // Force query execution

      if (treatmentsError) {
        console.error("Error fetching treatments:", treatmentsError)
        toast.error("Failed to load treatment statistics")
        return
      }

      const allTreatments = treatmentsData || []
      const completedTreatments = allTreatments.filter((t) => t.status === "completed").length
      const ongoingTreatments = allTreatments.filter((t) => t.status === "ongoing").length
      const opdNotConvertedTreatments = allTreatments.filter((t) => t.status === "opd_not_converted").length

      console.log("[v0] Fresh treatment stats:", {
        total: allTreatments.length,
        completed: completedTreatments,
        ongoing: ongoingTreatments,
        opdNotConverted: opdNotConvertedTreatments,
        timestamp,
      })

      setStats({
        totalPatients,
        completedTreatments,
        ongoingTreatments,
        opdNotConvertedTreatments,
      })
    } catch (error: any) {
      console.error("Failed to fetch patients:", error)
      toast.error("Failed to load patient records")
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortPatients = () => {
    let filtered = [...patients]

    if (searchTerm) {
      filtered = filtered.filter(
        (patient) =>
          `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (patient.medical_conditions && patient.medical_conditions.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (patient.allergies && patient.allergies.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        case "recent":
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        default:
          return 0
      }
    })

    setFilteredPatients(filtered)
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

  const handlePatientUpdated = () => {
    console.log("[v0] Patient updated, refreshing stats...")
    fetchPatients()
    setSelectedPatient(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-3xl font-bold">{stats.totalPatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Treatments</p>
                <p className="text-3xl font-bold">{stats.completedTreatments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-sky-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ongoing Treatments</p>
                <p className="text-3xl font-bold">{stats.ongoingTreatments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">OPD Not Converted</p>
                <p className="text-3xl font-bold">{stats.opdNotConvertedTreatments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Patient Records
            </CardTitle>
            <Button variant="outline" onClick={fetchPatients} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search patients by name, email, conditions, or allergies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="recent">Recently Updated</SelectItem>
                <SelectItem value="oldest">Recently Added</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No patient records found</h3>
              <p className="text-gray-600">
                {searchTerm ? "Try adjusting your search criteria" : "No patient records available"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => {
                const age = calculateAge(patient.date_of_birth)
                return (
                  <Card key={patient.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-lg">
                              {patient.first_name[0]}
                              {patient.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {patient.first_name} {patient.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">{patient.email}</p>
                            {age && <p className="text-sm text-gray-500">{age} years old</p>}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {patient.phone && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Phone</p>
                            <p className="text-sm text-gray-600">{patient.phone}</p>
                          </div>
                        )}

                        {patient.medical_conditions && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Medical Conditions</p>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {patient.medical_conditions.length > 100
                                ? `${patient.medical_conditions.substring(0, 100)}...`
                                : patient.medical_conditions}
                            </p>
                          </div>
                        )}

                        {patient.allergies && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Allergies</p>
                            <p className="text-sm text-red-600 line-clamp-2">
                              {patient.allergies.length > 100
                                ? `${patient.allergies.substring(0, 100)}...`
                                : patient.allergies}
                            </p>
                          </div>
                        )}

                        {patient.emergency_contact_name && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Emergency Contact</p>
                            <p className="text-sm text-gray-600">
                              {patient.emergency_contact_name}
                              {patient.emergency_contact_phone && ` - ${patient.emergency_contact_phone}`}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          Added {new Date(patient.created_at).toLocaleDateString()}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log("Opening patient profile for:", patient.id)
                            setSelectedPatient(patient.id)
                          }}
                          className="flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Profile</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <PatientProfileModal
        isOpen={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        patientId={selectedPatient || ""}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onPatientUpdated={handlePatientUpdated}
      />
    </div>
  )
}
