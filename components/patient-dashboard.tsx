"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar,
  CreditCard,
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  LogOut,
  IndianRupee,
  CheckCircle,
  CalendarPlus,
  History,
  User,
  Receipt,
  MapPin,
  Phone,
  Activity,
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  uploadPatientDocument,
  getPatientDocuments,
  deletePatientDocument,
  downloadDocument,
  formatFileSize,
  getFileIcon,
  type PatientDocument,
} from "@/lib/documents"
import { getPatientPayments } from "@/lib/payments"

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  appointment_type: string
  status: string
  notes?: string
  doctor?: {
    first_name: string
    last_name: string
  }
}

interface PatientTreatment {
  id: string
  treatment_name: string
  teeth_numbers?: string
  cost: number
  treatment_date?: string
  notes?: string
  status: string
  created_at: string
}

interface Payment {
  id: string
  bill_amount: number
  paid_amount: number
  payment_status: "not_paid" | "partial_paid" | "fully_paid"
  created_at: string
  payment_method?: string
  notes?: string
  appointment?: {
    appointment_type: string
    appointment_date: string
  }
  description?: string
}

export function PatientDashboard() {
  const { user, profile, loading: authLoading, updateProfile, signOut } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("upcoming")
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [treatments, setTreatments] = useState<PatientTreatment[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [deletingDocuments, setDeletingDocuments] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setEditedProfile(profile)
    }
  }, [profile])

  useEffect(() => {
    if (user && profile && !authLoading) {
      console.log("User and profile available, fetching dashboard data...")
      fetchDashboardData()
    }
  }, [user, profile, authLoading])

  const fetchDashboardData = async () => {
    if (!user || !profile) {
      console.log("No user or profile available")
      return
    }

    console.log("Starting to fetch dashboard data for user:", user.id)
    setDataLoading(true)
    setError(null)

    try {
      const results = await Promise.allSettled([
        fetchAppointments(),
        fetchPayments(),
        fetchDocuments(),
        fetchTreatments(),
      ])

      results.forEach((result, index) => {
        const names = ["appointments", "payments", "documents", "treatments"]
        if (result.status === "rejected") {
          console.error(`Failed to fetch ${names[index]}:`, result.reason)
        } else {
          console.log(`Successfully fetched ${names[index]}`)
        }
      })
    } catch (error) {
      console.error("Error in fetchDashboardData:", error)
      setError("Failed to load dashboard data")
    } finally {
      setDataLoading(false)
    }
  }

  const fetchAppointments = async () => {
    if (!user) return

    try {
      console.log("Fetching appointments for user:", user.id)

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          doctor:users!appointments_doctor_id_fkey(first_name, last_name)
        `)
        .eq("patient_id", user.id)
        .order("appointment_date", { ascending: true })

      if (error) {
        console.error("Error fetching appointments:", error)
        throw error
      }

      console.log("Appointments fetched:", data?.length || 0)
      setAppointments(data || [])
    } catch (error) {
      console.error("Error in fetchAppointments:", error)
      setAppointments([])
    }
  }

  const fetchPayments = async () => {
    if (!user) return

    try {
      console.log("Fetching payments for user:", user.id)
      const paymentsData = await getPatientPayments(user.id)
      console.log("Payments fetched:", paymentsData.length)
      setPayments(paymentsData)
    } catch (error) {
      console.error("Error in fetchPayments:", error)
      setPayments([])
    }
  }

  const fetchDocuments = async () => {
    if (!user) return

    setDocumentsLoading(true)
    try {
      console.log("Fetching documents for user:", user.id)
      const docs = await getPatientDocuments(user.id)
      console.log("Documents fetched:", docs.length)
      setDocuments(docs)
    } catch (error) {
      console.error("Error fetching documents:", error)
      setDocuments([])
    } finally {
      setDocumentsLoading(false)
    }
  }

  const fetchTreatments = async () => {
    if (!user) return

    try {
      console.log("Fetching treatments for user:", user.id)

      const { data, error } = await supabase
        .from("patient_treatments")
        .select(`
          *,
          treatment:treatments(name)
        `)
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching patient treatments:", error)
        throw error
      }

      const formattedTreatments = (data || []).map((treatment) => ({
        id: treatment.id,
        treatment_name: treatment.treatment?.name || "Unknown Treatment",
        teeth_numbers: treatment.teeth_numbers,
        cost: treatment.cost || 0,
        treatment_date: treatment.treatment_date,
        notes: treatment.notes,
        status: treatment.status || "pending",
        created_at: treatment.created_at,
      }))

      console.log("Treatments fetched:", formattedTreatments.length)
      setTreatments(formattedTreatments)
    } catch (error) {
      console.error("Error in fetchTreatments:", error)
      setTreatments([])
    }
  }

  const handleSaveProfile = async () => {
    if (!editedProfile) return

    setIsSaving(true)
    try {
      const { error } = await updateProfile(editedProfile)
      if (error) throw error

      setIsEditing(false)
      toast.success("Profile updated successfully!")
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile: " + (error.message || "Unknown error"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploadingDocument(true)
    try {
      const document = await uploadPatientDocument(user.id, file)
      toast.success("Document uploaded successfully!")
      await fetchDocuments()
    } catch (error: any) {
      console.error("Error uploading document:", error)
      toast.error("Failed to upload document: " + error.message)
    } finally {
      setUploadingDocument(false)
      event.target.value = ""
    }
  }

  const handleDeleteDocument = async (documentId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return

    setDeletingDocuments((prev) => new Set(prev).add(documentId))

    try {
      await deletePatientDocument(documentId)
      toast.success("Document deleted successfully!")
      await fetchDocuments()
    } catch (error: any) {
      console.error("Error deleting document:", error)
      toast.error("Failed to delete document: " + error.message)
    } finally {
      setDeletingDocuments((prev) => {
        const newSet = new Set(prev)
        newSet.delete(documentId)
        return newSet
      })
    }
  }

  const handleDownloadDocument = async (document: PatientDocument) => {
    try {
      await downloadDocument(document.file_path, document.file_name)
      toast.success("Document downloaded successfully!")
    } catch (error: any) {
      console.error("Error downloading document:", error)
      toast.error("Failed to download document: " + error.message)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to sign out")
    }
  }

  const getStatusColor = (status: string) => {
    const statusLower = (status || "").toLowerCase()
    switch (statusLower) {
      case "confirmed":
      case "approved":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    const statusLower = (status || "").toLowerCase()
    switch (statusLower) {
      case "fully_paid":
        return "bg-green-100 text-green-800"
      case "not_paid":
        return "bg-yellow-100 text-yellow-800"
      case "partial_paid":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const totalPaidAmount = payments.reduce((sum, p) => sum + (p.paid_amount || 0), 0)

  const completedAppointments = appointments.filter((a) => a.status === "completed").length

  const outstandingBalance = payments.reduce((sum, p) => sum + ((p.bill_amount || 0) - (p.paid_amount || 0)), 0)

  const upcomingAppointments = appointments.filter((a) => {
    const appointmentDate = new Date(a.appointment_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Show appointments that are in the future and not completed/cancelled
    return appointmentDate >= today && !["completed", "cancelled", "rejected"].includes(a.status.toLowerCase())
  })

  const pastAppointments = appointments.filter((a) => {
    const appointmentDate = new Date(a.appointment_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Show appointments that are in the past OR have completed/cancelled status
    return appointmentDate < today || ["completed", "cancelled", "rejected"].includes(a.status.toLowerCase())
  })

  console.log("[v0] Total appointments:", appointments.length)
  console.log(
    "[v0] Appointments data:",
    appointments.map((a) => ({
      id: a.id,
      date: a.appointment_date,
      status: a.status,
      type: a.appointment_type,
    })),
  )
  console.log("[v0] Past appointments:", pastAppointments.length)
  console.log("[v0] Upcoming appointments:", upcomingAppointments.length)

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-gray-600">Unable to load your profile. Please try refreshing the page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-3 flex-nowrap">
            <div className="flex items-center space-x-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-900 shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back Home</span>
                <span className="sr-only sm:not-sr-only sm:hidden">Back</span>
              </Button>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
                <p className="text-gray-600">Welcome back, {profile.first_name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-900 shrink-0"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sr-only sm:not-sr-only sm:hidden">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Total Paid Amount</p>
                  <p className="text-2xl font-bold text-green-900">₹{(totalPaidAmount || 0).toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <IndianRupee className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Completed Appointments</p>
                  <p className="text-2xl font-bold text-blue-900">{completedAppointments}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-red-900">₹{(outstandingBalance || 0).toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CalendarPlus className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Book New Appointment</h3>
              <p className="text-sm text-gray-600 mb-4">Schedule your next dental visit</p>
              <Button className="w-full" onClick={() => router.push("/appointments")}>
                <Calendar className="h-4 w-4 mr-2" />
                Book Now
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <History className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Payment History</h3>
              <p className="text-sm text-gray-600 mb-4">View your payment records</p>
              <Button variant="outline" className="w-full bg-transparent" onClick={() => setActiveTab("payments")}>
                <CreditCard className="h-4 w-4 mr-2" />
                View History
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Update Profile</h3>
              <p className="text-sm text-gray-600 mb-4">Manage your personal information</p>
              <Button variant="outline" className="w-full bg-transparent" onClick={() => setActiveTab("profile")}>
                <User className="h-4 w-4 mr-2" />
                Update Profile
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1">
            <TabsTrigger value="upcoming" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              <span className="hidden sm:inline">Upcoming</span>
              <span className="sm:hidden">Up</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
              <History className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">Hist</span>
            </TabsTrigger>
            <TabsTrigger value="treatments" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
              <span className="hidden sm:inline">Treatments</span>
              <span className="sm:hidden">Treat</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
              <span className="hidden sm:inline">Payments</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" />
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
              <User className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600" />
              <span className="hidden sm:inline">Profile</span>
              <span className="sm:hidden">Prof</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
                <CardDescription>Your scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center space-x-4">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <div className="min-w-0">
                            <p className="font-medium">{appointment.appointment_type}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(appointment.appointment_date).toLocaleDateString()} at{" "}
                              {appointment.appointment_time}
                            </p>
                            {appointment.doctor && (
                              <p className="text-sm text-gray-500">
                                Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className={`self-start sm:self-auto ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </Badge>
                      </div>
                      {/* keep action buttons wrapping on mobile */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 bg-transparent w-full sm:w-auto"
                          onClick={() => {
                            // Open Google Maps with clinic address
                            window.open("https://maps.google.com/?q=dental+clinic+near+me", "_blank")
                          }}
                        >
                          <MapPin className="h-4 w-4" />
                          Get Directions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 bg-transparent w-full sm:w-auto"
                          onClick={() => {
                            // Call clinic phone number
                            window.open("tel:+1234567890", "_self")
                          }}
                        >
                          <Phone className="h-4 w-4" />
                          Call Clinic
                        </Button>
                      </div>
                    </div>
                  ))}
                  {upcomingAppointments.length === 0 && (
                    <div className="text-center py-8">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-gray-500">No upcoming appointments</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment History</CardTitle>
                <CardDescription>Your past appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading appointment history...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pastAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg"
                      >
                        <div className="flex items-start sm:items-center space-x-4 min-w-0">
                          <div className="flex items-center space-x-2 shrink-0">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {new Date(appointment.appointment_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium break-words">{appointment.appointment_type}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(appointment.appointment_date).toLocaleDateString()} at{" "}
                              {appointment.appointment_time}
                            </p>
                            {appointment.doctor && (
                              <p className="text-sm text-gray-500">
                                Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                              </p>
                            )}
                            {appointment.notes && <p className="text-sm text-gray-500 mt-1">{appointment.notes}</p>}
                          </div>
                        </div>
                        <Badge className={`self-start sm:self-auto ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                    {pastAppointments.length === 0 && (
                      <div className="text-center py-8">
                        <History className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-gray-500">No appointment history</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {appointments.length === 0
                            ? "You haven't scheduled any appointments yet"
                            : "All your appointments are upcoming"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treatments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Treatments</CardTitle>
                <CardDescription>Your treatment history and records</CardDescription>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading treatments...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {treatments.map((treatment) => (
                      <div
                        key={treatment.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4 min-w-0">
                          <div className="flex items-center space-x-2 shrink-0">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {treatment.treatment_date
                                ? new Date(treatment.treatment_date).toLocaleDateString()
                                : new Date(treatment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium">{treatment.treatment_name}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                              <span>Cost: ₹{treatment.cost.toFixed(2)}</span>
                              {treatment.teeth_numbers && (
                                <>
                                  <span>•</span>
                                  <span>Teeth: {treatment.teeth_numbers}</span>
                                </>
                              )}
                            </div>
                            {treatment.notes && <p className="text-sm text-gray-500 mt-1">{treatment.notes}</p>}
                          </div>
                        </div>
                        <Badge className={getStatusColor(treatment.status)}>{treatment.status}</Badge>
                      </div>
                    ))}
                    {treatments.length === 0 && (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-gray-500">No treatments recorded yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Your treatment history will appear here after appointments
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Your payment records and billing information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">
                              {payment.appointment?.appointment_type
                                ? `${payment.appointment.appointment_type} Appointment`
                                : (payment as any).description || "Custom Bill"}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                              <span>Total: ₹{(payment.bill_amount || 0).toFixed(2)}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>Paid: ₹{(payment.paid_amount || 0).toFixed(2)}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>
                                Balance: ₹{((payment.bill_amount || 0) - (payment.paid_amount || 0)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Badge className={getPaymentStatusColor(payment.payment_status)}>
                            {payment.payment_status === "not_paid"
                              ? "Pending"
                              : payment.payment_status === "partial_paid"
                                ? "Partial"
                                : payment.payment_status === "fully_paid"
                                  ? "Paid"
                                  : payment.payment_status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <div className="text-center py-8">
                      <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-gray-500">No payment records found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Upload Documents</CardTitle>
                    <CardDescription>Upload and manage your medical documents</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      id="document-upload"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileUpload}
                      disabled={uploadingDocument}
                    />
                    <Button
                      onClick={() => document.getElementById("document-upload")?.click()}
                      disabled={uploadingDocument}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {uploadingDocument ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Document
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading documents...</span>
                  </div>
                ) : documents.length > 0 ? (
                  <div className="space-y-4">
                    {documents.map((document) => (
                      <div
                        key={document.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4 min-w-0">
                          <span className="text-2xl">{getFileIcon(document.mime_type)}</span>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{document.file_name}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                              <span>{formatFileSize(document.file_size)}</span>
                              <span>•</span>
                              <span>Uploaded {new Date(document.upload_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(document)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDocument(document.id, document.file_name)}
                            disabled={deletingDocuments.has(document.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {deletingDocuments.has(document.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">No documents uploaded yet</p>
                    <p className="text-sm text-gray-400">Upload your medical documents to keep them organized</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Personal Information</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {profile.first_name} {profile.last_name}
                    </p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm text-gray-600 mt-1">{profile.email}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input
                        value={editedProfile.phone || ""}
                        onChange={(e) => setEditedProfile((prev: any) => ({ ...prev, phone: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">{profile.phone || "Not provided"}</p>
                    )}
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editedProfile.date_of_birth || ""}
                        onChange={(e) => setEditedProfile((prev: any) => ({ ...prev, date_of_birth: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">
                        {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : "Not provided"}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Gender</Label>
                    {isEditing ? (
                      <Input
                        value={editedProfile.gender || ""}
                        onChange={(e) => setEditedProfile((prev: any) => ({ ...prev, gender: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">{profile.gender || "Not provided"}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label>Address</Label>
                    {isEditing ? (
                      <Textarea
                        value={editedProfile.address || ""}
                        onChange={(e) => setEditedProfile((prev: any) => ({ ...prev, address: e.target.value }))}
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">{profile.address || "Not provided"}</p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex space-x-2 pt-4">
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Medical History</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedProfile.medical_history || ""}
                      onChange={(e) => setEditedProfile((prev: any) => ({ ...prev, medical_history: e.target.value }))}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">
                      {profile.medical_history || "No medical history recorded"}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Allergies</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedProfile.allergies || ""}
                      onChange={(e) => setEditedProfile((prev: any) => ({ ...prev, allergies: e.target.value }))}
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">{profile.allergies || "No known allergies"}</p>
                  )}
                </div>
                <div>
                  <Label>Current Medications</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedProfile.current_medications || ""}
                      onChange={(e) =>
                        setEditedProfile((prev: any) => ({ ...prev, current_medications: e.target.value }))
                      }
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">
                      {profile.current_medications || "No current medications"}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Insurance Provider</Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.insurance_provider || ""}
                      onChange={(e) =>
                        setEditedProfile((prev: any) => ({ ...prev, insurance_provider: e.target.value }))
                      }
                    />
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">{profile.insurance_provider || "Not provided"}</p>
                  )}
                </div>
                <div>
                  <Label>Insurance Policy Number</Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.insurance_policy_number || ""}
                      onChange={(e) =>
                        setEditedProfile((prev: any) => ({ ...prev, insurance_policy_number: e.target.value }))
                      }
                    />
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">{profile.insurance_policy_number || "Not provided"}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
