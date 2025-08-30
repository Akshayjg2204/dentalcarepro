"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase-client"
import {
  Calendar,
  CreditCard,
  FileText,
  Phone,
  Mail,
  MapPin,
  User,
  Heart,
  Pill,
  Loader2,
  X,
  Edit,
  Save,
  UserCheck,
  Clock,
  Trash2,
  Activity,
  Plus,
} from "lucide-react"
import {
  uploadPatientDocument,
  getPatientDocuments,
  deletePatientDocument,
  downloadDocument,
  isImageFile,
  previewDocument as getDocumentPreviewUrl, // renamed import to avoid naming conflict
  type PatientDocument,
} from "@/lib/documents"
import { updateAppointmentStatus } from "@/lib/appointments"
import { ImagePreviewModal } from "./image-preview-modal"
import { UpdatePaymentModal } from "./update-payment-modal"
import { CreateCustomBillModal } from "./create-custom-bill-modal"
import { getBillingRecords, type BillingRecordWithPatient } from "@/lib/treatments"
import { getPatientPayments } from "@/lib/payments"
import { AppointmentAssignmentModal } from "./appointment-assignment-modal"
import { CompleteAppointmentModal } from "@/components/complete-appointment-modal"
import { useRouter } from "next/navigation"

interface PatientProfileModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  currentUserId: string
  currentUserRole: string
  initialTab?: string
  appointmentId?: string
}

interface PatientProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  date_of_birth?: string
  address?: string
  gender?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  medical_history?: string
  allergies?: string
  current_medications?: string
  insurance_provider?: string
  insurance_policy_number?: string
  created_at: string
  updated_at: string
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  appointment_type: string
  status: string
  notes?: string
  assigned_doctor?: string
  assigned_staff?: string
  bill_amount?: number
  paid_amount?: number
  payment_status?: string
  payment_method?: string
  doctor?: {
    first_name: string
    last_name: string
  }
  staff?: {
    first_name: string
    last_name: string
  }
  payment_id?: string
  patient_id: string
}

interface Payment {
  id: string
  appointment_id?: string
  bill_amount: number
  paid_amount: number
  payment_status: string
  payment_method?: string
  payment_date: string
  description?: string
}

interface Treatment {
  id: string
  patient_id: string
  treatment_date: string
  treatment_type: string
  description?: string
  notes?: string
  created_at: string
  updated_at: string
}

export function PatientProfileModal({
  isOpen,
  onClose,
  patientId,
  currentUserId,
  currentUserRole,
  initialTab = "profile",
}: PatientProfileModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [billingRecords, setBillingRecords] = useState<BillingRecordWithPatient[]>([])
  const [appointmentPayments, setAppointmentPayments] = useState<Payment[]>([])
  const [isCreateBillModalOpen, setIsCreateBillModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [updatePaymentData, setUpdatePaymentData] = useState<{
    appointmentId: string
    currentAmount: number
    totalAmount: number
  } | null>(null)

  const [loading, setLoading] = useState(false)
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [editedPatient, setEditedPatient] = useState<PatientProfile | null>(null)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [deletingDocuments, setDeletingDocuments] = useState<Set<string>>(new Set())
  const [updatingAppointments, setUpdatingAppointments] = useState<Set<string>>(new Set())

  // Image preview states
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState("")
  const [previewFileName, setPreviewFileName] = useState("")
  const [previewDocument, setPreviewDocument] = useState<PatientDocument | null>(null)
  const [loadingPreview, setLoadingPreview] = useState<Set<string>>(new Set())

  const [updatePaymentModalOpen, setUpdatePaymentModalOpen] = useState(false)
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<Appointment | null>(null)

  const [updateCustomBillModalOpen, setUpdateCustomBillModalOpen] = useState(false)
  const [selectedCustomBillForPayment, setSelectedCustomBillForPayment] = useState<any>(null)

  const [assignStaffModalOpen, setAssignStaffModalOpen] = useState(false)
  const [selectedAppointmentForAssign, setSelectedAppointmentForAssign] = useState<Appointment | null>(null)
  const [availableStaff, setAvailableStaff] = useState<any[]>([])

  const [assignmentModalAppointment, setAssignmentModalAppointment] = useState<Appointment | null>(null)
  const [updatePaymentModal, setUpdatePaymentModal] = useState<{
    isOpen: boolean
    payment: any | null
    appointment: Appointment | null
  }>({
    isOpen: false,
    payment: null,
    appointment: null,
  })

  const [completeAppointmentModal, setCompleteAppointmentModal] = useState<{
    isOpen: boolean
    appointment: Appointment | null
  }>({
    isOpen: false,
    appointment: null,
  })

  const router = useRouter()

  const [availableTreatments, setAvailableTreatments] = useState<any[]>([])
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null)
  const [treatmentForm, setTreatmentForm] = useState({
    teeth_numbers: "",
    amount: 0,
    date: "",
    notes: "",
  })
  const [patientTreatments, setPatientTreatments] = useState<any[]>([])
  const [loadingTreatments, setLoadingTreatments] = useState(false)
  const [isAddingTreatment, setIsAddingTreatment] = useState(false)
  const [showCreateTreatment, setShowCreateTreatment] = useState(false)
  const [newTreatment, setNewTreatment] = useState({
    name: "",
    description: "",
    default_cost: 0,
    duration_minutes: 30,
    category: "",
  })
  const [isCreatingTreatment, setIsCreatingTreatment] = useState(false)

  useEffect(() => {
    if (isOpen && patientId) {
      setActiveTab(initialTab)
      fetchData()
    }
  }, [isOpen, patientId, initialTab])

  useEffect(() => {
    if (profile) {
      setEditedPatient({ ...profile })
    }
  }, [profile])

  const fetchData = async () => {
    if (!patientId) return

    setIsLoading(true)
    try {
      await Promise.all([
        fetchProfile(),
        fetchAppointments(),
        fetchTreatments(),
        fetchDocuments(),
        fetchPayments(),
        fetchBillingRecords(),
      ])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load patient data")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBillingRecords = async () => {
    try {
      const [records, payments] = await Promise.all([getBillingRecords(patientId, true), getPatientPayments(patientId)])
      setBillingRecords(records)
      setAppointmentPayments(payments)
    } catch (error) {
      console.error("Error fetching billing records:", error)
    }
  }

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", patientId).single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("Error fetching patient profile:", error)
      throw error
    }
  }

  const fetchAppointments = async () => {
    try {
      console.log("Fetching appointments for patient:", patientId)

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          payments!left (
            bill_amount,
            paid_amount,
            payment_status,
            payment_method,
            id
          )
        `)
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false })

      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError)
        throw appointmentsError
      }

      const appointmentsWithDetails = await Promise.all(
        (appointmentsData || []).map(async (appointment) => {
          let doctor = null
          let staff = null

          if (appointment.doctor_id) {
            try {
              const { data: doctorData, error: doctorError } = await supabase
                .from("users")
                .select("first_name, last_name")
                .eq("id", appointment.doctor_id)
                .single()

              if (!doctorError && doctorData) {
                doctor = doctorData
              }
            } catch (error) {
              console.error("Error fetching doctor details:", error)
            }
          }

          if (appointment.assigned_staff) {
            try {
              const { data: staffData, error: staffError } = await supabase
                .from("users")
                .select("first_name, last_name")
                .eq("id", appointment.assigned_staff)
                .single()

              if (!staffError && staffData) {
                staff = staffData
              }
            } catch (error) {
              console.error("Error fetching staff details:", error)
            }
          }

          const paymentInfo = appointment.payments?.[0] || {}

          return {
            ...appointment,
            doctor,
            staff,
            bill_amount: paymentInfo.bill_amount || 0,
            paid_amount: paymentInfo.paid_amount || 0,
            payment_status: paymentInfo.payment_status || "not_paid",
            payment_method: paymentInfo.payment_method,
            payment_id: paymentInfo.id,
          }
        }),
      )

      setAppointments(appointmentsWithDetails)
    } catch (error) {
      console.error("Error in fetchAppointments:", error)
      setAppointments([])
    }
  }

  const fetchTreatments = async () => {
    try {
      const { data, error } = await supabase
        .from("patient_treatments")
        .select(`
          *,
          treatment:treatments(name, description, category),
          doctor:users!patient_treatments_doctor_id_fkey(first_name, last_name)
        `)
        .eq("patient_id", patientId)
        .order("treatment_date", { ascending: false })

      if (error) throw error
      setTreatments(data || [])
    } catch (error) {
      console.error("Error fetching treatments:", error)
      setTreatments([])
    }
  }

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("patient_id", patientId)
        .order("payment_date", { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error("Error fetching payments:", error)
      setPayments([])
    }
  }

  const fetchDocuments = async () => {
    setDocumentsLoading(true)
    try {
      console.log("[v0] Fetching documents for patient:", patientId)
      const docs = await getPatientDocuments(patientId)
      console.log("[v0] Documents fetched successfully:", docs.length, "documents")
      console.log("[v0] Document details:", docs)
      setDocuments(docs)
    } catch (error) {
      console.error("[v0] Error fetching documents in modal:", error)
      setDocuments([])
    } finally {
      setDocumentsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!editedPatient) return

    setIsSaving(true)
    try {
      const { error } = await supabase.from("users").update(editedPatient).eq("id", patientId)

      if (error) throw error

      setProfile(editedPatient)
      setIsEditing(false)
      toast.success("Patient profile updated successfully!")
    } catch (error: any) {
      console.error("Error updating patient profile:", error)
      toast.error("Failed to update profile: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAppointmentStatusUpdate = async (appointmentId: string, newStatus: string) => {
    setUpdatingAppointments((prev) => new Set(prev).add(appointmentId))

    try {
      const result = await updateAppointmentStatus(appointmentId, newStatus as any)

      if (result.success) {
        toast.success(`Appointment ${newStatus} successfully!`)
        await fetchAppointments() // Refresh appointments
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Error updating appointment status:", error)
      toast.error("Failed to update appointment: " + error.message)
    } finally {
      setUpdatingAppointments((prev) => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingDocument(true)
    try {
      await uploadPatientDocument(patientId, file)
      toast.success("Document uploaded successfully!")
      await fetchDocuments()
    } catch (error: any) {
      console.error("Error uploading document from modal:", error)
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
      console.log("[v0] Starting download for document:", document.file_name)
      await downloadDocument(document.file_path, document.file_name)
      toast.success("Document downloaded successfully!")
      console.log("[v0] Download completed for:", document.file_name)
    } catch (error: any) {
      console.error("[v0] Error downloading document:", error)
      toast.error("Failed to download document: " + error.message)
    }
  }

  const handlePreviewImage = async (document: PatientDocument) => {
    if (!isImageFile(document.file_type)) {
      toast.error("Preview is only available for image files")
      return
    }

    setLoadingPreview((prev) => new Set(prev).add(document.id))

    try {
      console.log("[v0] Starting image preview for:", document.file_name)
      console.log("[v0] File path:", document.file_path)

      const imageUrl = await getDocumentPreviewUrl(document.file_path)

      console.log("[v0] Generated preview URL:", imageUrl)

      if (!imageUrl || imageUrl.trim() === "") {
        throw new Error("Generated URL is empty")
      }

      setPreviewImageUrl(imageUrl)
      setPreviewFileName(document.file_name)
      setPreviewDocument(document)
      setPreviewModalOpen(true)

      console.log("[v0] Preview modal opened successfully")
    } catch (error: any) {
      console.error("[v0] Error previewing image:", error)
      toast.error("Failed to preview image: " + error.message)
    } finally {
      setLoadingPreview((prev) => {
        const newSet = new Set(prev)
        newSet.delete(document.id)
        return newSet
      })
    }
  }

  const handlePreviewDownload = () => {
    if (previewDocument) {
      handleDownloadDocument(previewDocument)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
      case "approved":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "fully_paid":
        return "bg-green-100 text-green-800"
      case "partial_paid":
        return "bg-yellow-100 text-yellow-800"
      case "not_paid":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleAssignStaff = (appointment: Appointment) => {
    setAssignmentModalAppointment(appointment)
  }

  const handleUpdatePayment = (appointment: Appointment) => {
    // Find the payment record for this appointment
    const payment = billingRecords.find((record) => record.appointment_id === appointment.id && !record.isCustomBill)

    if (payment) {
      setUpdatePaymentModal({
        isOpen: true,
        payment: payment as any,
        appointment: appointment,
      })
    } else {
      toast.error("No payment record found for this appointment")
    }
  }

  const _handleCreatePaymentForAppointment = async (appointment: Appointment) => {
    try {
      // Check if payment record already exists
      const existingPayment = billingRecords.find(
        (record) => record.appointment_id === appointment.id && !record.isCustomBill,
      )

      if (existingPayment) {
        // If payment exists but is partial, open update modal
        if (existingPayment.amount > (existingPayment.amount_paid || 0)) {
          handleUpdatePayment(appointment)
          return
        } else {
          toast.info("Payment is already complete for this appointment")
          return
        }
      }

      // Create new payment record without description column
      const { data: paymentData, error: paymentError } = await supabase
        .from("billing_records")
        .insert({
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          amount: appointment.bill_amount || 0,
          paid_amount: 0,
          payment_status: "not_paid",
          payment_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Refresh billing records and open update modal
      await getBillingRecords(appointment.patient_id, true)
      handleUpdatePayment(appointment)
    } catch (error) {
      console.error("Error creating payment record:", error)
      toast.error("Failed to create payment record")
    }
  }

  const handleAssignmentUpdated = async () => {
    await fetchAppointments() // Refresh appointments
    setAssignmentModalAppointment(null)
  }

  const _handlePaymentUpdated = async () => {
    await fetchBillingRecords(true) // Refresh billing records
    await fetchAppointments() // Refresh appointments
    setUpdatePaymentModal({
      isOpen: false,
      payment: null,
      appointment: null,
    })
  }

  const handleUpdateCustomBillPayment = async (record: any) => {
    console.log("[v0] Mark Paid/Update Payment button clicked for record:", record)
    setSelectedCustomBillForPayment(record)
    setUpdateCustomBillModalOpen(true)
    console.log("[v0] Modal state set - updateCustomBillModalOpen: true")
  }

  const handleUpdateAppointmentPayment = async (payment: Payment) => {
    console.log("[v0] Mark Paid/Update Payment button clicked for appointment payment:", payment)
    setSelectedAppointmentForPayment({
      id: payment.appointment_id || payment.id,
      appointment_date: payment.appointment?.appointment_date || "",
      appointment_time: payment.appointment?.appointment_time || "",
      appointment_type: payment.appointment?.appointment_type || "Appointment",
      status: payment.appointment?.status || "completed",
      patient_id: payment.patient_id,
      bill_amount: payment.bill_amount,
      paid_amount: payment.paid_amount,
      payment_status: payment.payment_status,
      payment_method: payment.payment_method,
      payment_id: payment.id,
    })
    setUpdatePaymentModalOpen(true)
    console.log("[v0] Modal state set - updatePaymentModalOpen: true")
  }

  const handleDeleteCustomBill = async (record: BillingRecordWithPatient) => {
    console.log("[v0] Delete button clicked for record:", record)

    if (!record.isCustomBill) {
      console.log("[v0] Record is not a custom bill, cannot delete")
      toast.error("This is not a custom bill and cannot be deleted")
      return
    }

    if (!confirm("Are you sure you want to delete this custom bill? This action cannot be undone.")) {
      return
    }

    try {
      console.log("[v0] Attempting to delete record with ID:", record.id)

      const { data: customBillCheck } = await supabase.from("custom_bills").select("id").eq("id", record.id).single()

      const { data: billingRecordCheck } = await supabase
        .from("billing_records")
        .select("id")
        .eq("id", record.id)
        .single()

      console.log("[v0] Record exists in custom_bills:", !!customBillCheck)
      console.log("[v0] Record exists in billing_records:", !!billingRecordCheck)

      let deletedSuccessfully = false

      if (customBillCheck) {
        try {
          const { data, error, count } = await supabase.from("custom_bills").delete().eq("id", record.id)

          console.log("[v0] Delete operation result - data:", data, "error:", error, "count:", count)

          if (error) {
            console.log("[v0] Error deleting from custom_bills:", error.message)
            throw error
          }

          const { data: verifyDeleted } = await supabase.from("custom_bills").select("id").eq("id", record.id).single()

          if (verifyDeleted) {
            console.log("[v0] WARNING: Record still exists after deletion attempt!")
            throw new Error("Record was not deleted - possible permission issue")
          } else {
            deletedSuccessfully = true
            console.log("[v0] Successfully deleted from custom_bills table - verified record is gone")
          }
        } catch (error) {
          console.log("[v0] Exception deleting from custom_bills:", error)
          throw error
        }
      }

      if (!deletedSuccessfully && billingRecordCheck) {
        try {
          const { data, error, count } = await supabase.from("billing_records").delete().eq("id", record.id)

          console.log("[v0] Delete billing record result - data:", data, "error:", error, "count:", count)

          if (error) {
            console.log("[v0] Error deleting from billing_records:", error.message)
            throw error
          }

          const { data: verifyDeleted } = await supabase
            .from("billing_records")
            .select("id")
            .eq("id", record.id)
            .single()

          if (verifyDeleted) {
            console.log("[v0] WARNING: Billing record still exists after deletion attempt!")
            throw new Error("Billing record was not deleted - possible permission issue")
          } else {
            deletedSuccessfully = true
            console.log("[v0] Successfully deleted from billing_records table - verified record is gone")
          }
        } catch (error) {
          console.log("[v0] Exception deleting from billing_records:", error)
          throw error
        }
      }

      if (!customBillCheck && !billingRecordCheck) {
        console.log("[v0] Phantom record detected - removing from UI only")
        setBillingRecords((prev) => prev.filter((r) => r.id !== record.id))
        toast.success("Record removed from display (was already deleted from database)")
        return
      }

      console.log("[v0] Record deleted successfully")

      setBillingRecords((prev) => prev.filter((r) => r.id !== record.id))

      // Refresh billing records after deletion
      setTimeout(async () => {
        try {
          const refreshedRecords = await getBillingRecords(patientId, true)
          setBillingRecords(refreshedRecords)
          console.log("[v0] Billing records refreshed after delete, new count:", refreshedRecords.length)
        } catch (error) {
          console.error("[v0] Error refreshing billing records:", error)
        }
      }, 500)

      toast.success("Custom bill deleted successfully!")
    } catch (error) {
      console.error("[v0] Error deleting custom bill:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete custom bill")
    }
  }

  const handleCustomBillPaymentUpdated = async () => {
    console.log("[v0] handleCustomBillPaymentUpdated called")
    setUpdateCustomBillModalOpen(false)
    setSelectedCustomBillForPayment(null)
    await Promise.all([fetchBillingRecords(), fetchAppointments(), fetchPayments()])
    toast.success("Custom bill payment updated successfully!")
  }

  const _handlePaymentUpdated2 = async () => {
    console.log("[v0] _handlePaymentUpdated2 called")
    setUpdatePaymentModalOpen(false)
    setSelectedAppointmentForPayment(null)
    await Promise.all([fetchBillingRecords(), fetchAppointments(), fetchPayments()])
    toast.success("Payment updated successfully!")
  }

  const _handleAssignStaff = async (appointment: Appointment) => {
    try {
      // Fetch available staff members
      const { data: staffData, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, role")
        .in("role", ["doctor", "staff"])
        .order("first_name")

      if (error) throw error

      setAvailableStaff(staffData || [])
      setSelectedAppointmentForAssign(appointment)
      setAssignStaffModalOpen(true)
    } catch (error) {
      console.error("Error fetching staff:", error)
      toast.error("Failed to load staff members")
    }
  }

  const handleUpdateStaffAssignment = async (staffId: string, role: "doctor" | "staff") => {
    if (!selectedAppointmentForAssign) return

    try {
      const updateData = role === "doctor" ? { assigned_doctor: staffId } : { assigned_staff: staffId }

      const { error } = await supabase.from("appointments").update(updateData).eq("id", selectedAppointmentForAssign.id)

      if (error) throw error

      toast.success(`${role === "doctor" ? "Doctor" : "Staff"} assigned successfully!`)
      setAssignStaffModalOpen(false)
      setSelectedAppointmentForAssign(null)
      await fetchAppointments() // Refresh appointments
    } catch (error) {
      console.error("Error assigning staff:", error)
      toast.error("Failed to assign staff")
    }
  }

  const handleCreatePaymentForAppointment = async (appointment: Appointment) => {
    try {
      // Create a payment record for this appointment
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .insert({
          appointment_id: appointment.id,
          patient_id: patientId,
          bill_amount: 0,
          paid_amount: 0,
          payment_status: "not_paid",
          payment_date: new Date().toISOString(),
          description: `Payment for ${appointment.appointment_type}`,
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Now open the payment modal
      setSelectedAppointmentForPayment(appointment)
      setUpdatePaymentModalOpen(true)
    } catch (error) {
      console.error("Error creating payment record:", error)
      toast.error("Failed to create payment record")
    }
  }

  const [selectedAppointmentForCompletion, setSelectedAppointmentForCompletion] = useState<Appointment | null>(null)

  const handleCompleteAppointment = useCallback(
    (appointment: Appointment) => {
      // Close the patient profile modal
      onClose()
      const dashboardPath =
        currentUserRole === "admin"
          ? "/admin"
          : currentUserRole === "doctor"
            ? "/dashboard"
            : currentUserRole === "staff"
              ? "/dashboard"
              : "/admin"
      router.push(`${dashboardPath}?tab=appointments&highlight=${appointment.id}`)
    },
    [onClose, router, currentUserRole],
  )

  const handleAppointmentCompleted = (patientId?: string, shouldOpenProfile?: boolean) => {
    // Refresh appointments and billing data
    if (profile) {
      fetchAppointments()
      fetchBillingRecords()
    }

    // Close the complete appointment modal
    setCompleteAppointmentModal({
      isOpen: false,
      appointment: null,
    })

    // If shouldOpenProfile is true, switch to billing tab
    if (shouldOpenProfile) {
      setActiveTab("billing")
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) {
      return
    }

    setUpdatingAppointments((prev) => new Set(prev).add(appointmentId))

    try {
      const { error } = await supabase.from("appointments").delete().eq("id", appointmentId)

      if (error) throw error

      toast.success("Appointment deleted successfully!")
      await fetchAppointments() // Refresh appointments
      await fetchBillingRecords() // Refresh billing records
    } catch (error: any) {
      toast.error("Failed to delete appointment: " + (error.message || "Unknown error"))
    } finally {
      setUpdatingAppointments((prev) => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  // Treatment functions
  const handleAddTreatment = async () => {
    if (!selectedTreatment || !treatmentForm) return

    setIsAddingTreatment(true)
    try {
      const { data, error } = await supabase
        .from("patient_treatments")
        .insert({
          patient_id: patientId,
          treatment_id: selectedTreatment.id,
          treatment_date: treatmentForm.date,
          teeth_numbers: treatmentForm.teeth_numbers,
          cost: treatmentForm.amount,
          notes: treatmentForm.notes,
          status: "planned",
        })
        .select(`
          *,
          treatment:treatments(name, description, category),
          doctor:users!patient_treatments_doctor_id_fkey(first_name, last_name)
        `)
        .single()

      if (error) throw error

      toast.success("Treatment added successfully!")
      setPatientTreatments((prev) => [...prev, data])
      setSelectedTreatment(null)
      setTreatmentForm({ teeth_numbers: "", amount: 0, date: "", notes: "" })
      await fetchTreatments()
    } catch (error: any) {
      console.error("Error adding treatment:", error)
      toast.error("Failed to add treatment: " + error.message)
    } finally {
      setIsAddingTreatment(false)
    }
  }

  const handleDeleteTreatment = async (treatmentId: string) => {
    if (!confirm("Are you sure you want to delete this treatment?")) return

    setLoadingTreatments(true)
    try {
      const { error } = await supabase.from("patient_treatments").delete().eq("id", treatmentId)

      if (error) throw error

      toast.success("Treatment deleted successfully!")
      setPatientTreatments((prev) => prev.filter((treatment) => treatment.id !== treatmentId))
      await fetchTreatments()
    } catch (error: any) {
      console.error("Error deleting treatment:", error)
      toast.error("Failed to delete treatment: " + error.message)
    } finally {
      setLoadingTreatments(false)
    }
  }

  const handleCreateTreatment = async () => {
    setIsCreatingTreatment(true)
    try {
      const { data, error } = await supabase
        .from("treatments")
        .insert({
          name: newTreatment.name,
          description: newTreatment.description,
          default_cost: newTreatment.default_cost,
          duration_minutes: newTreatment.duration_minutes,
          category: newTreatment.category,
        })
        .select("*")
        .single()

      if (error) throw error

      toast.success("Treatment created successfully!")
      setAvailableTreatments((prev) => [...prev, data])
      setShowCreateTreatment(false)
      setNewTreatment({ name: "", description: "", default_cost: 0, duration_minutes: 30, category: "" })
    } catch (error: any) {
      console.error("Error creating treatment:", error)
      toast.error("Failed to create treatment: " + error.message)
    } finally {
      setIsCreatingTreatment(false)
    }
  }

  const loadAvailableTreatments = async () => {
    try {
      const { data, error } = await supabase.from("treatments").select("*").order("name")

      if (error) throw error

      setAvailableTreatments(data || [])
    } catch (error) {
      console.error("Error loading treatments:", error)
      toast.error("Failed to load available treatments")
    }
  }

  const loadPatientTreatments = async () => {
    if (!patientId) return

    setLoadingTreatments(true)
    try {
      const { data, error } = await supabase
        .from("patient_treatments")
        .select(`
          *,
          treatment:treatments(name, description, category),
          doctor:users!patient_treatments_doctor_id_fkey(first_name, last_name)
        `)
        .eq("patient_id", patientId)
        .order("treatment_date", { ascending: false })

      if (error) throw error

      // Transform the data to match the expected structure
      const transformedTreatments = data.map((item) => ({
        id: item.id,
        patient_id: item.patient_id,
        treatment_id: item.treatment_id,
        treatment_date: item.treatment_date,
        teeth_numbers: item.teeth_numbers,
        cost: item.cost,
        notes: item.notes,
        status: item.status,
        treatment_name: item.treatment?.name || "Unknown Treatment",
        treatment_description: item.treatment?.description || "",
        treatment_category: item.treatment?.category || "",
        doctor_first_name: item.doctor?.first_name || "",
        doctor_last_name: item.doctor?.last_name || "",
      }))

      setPatientTreatments(transformedTreatments || [])
    } catch (error: any) {
      console.error("Error fetching patient treatments:", error)
      toast.error("Failed to load patient treatments: " + error.message)
    } finally {
      setLoadingTreatments(false)
    }
  }

  useEffect(() => {
    const fetchAvailableTreatments = async () => {
      setLoadingTreatments(true)
      try {
        const { data, error } = await supabase.from("treatments").select("*").order("name")

        if (error) throw error

        setAvailableTreatments(data || [])
      } catch (error: any) {
        console.error("Error fetching available treatments:", error)
        toast.error("Failed to load available treatments: " + error.message)
      } finally {
        setLoadingTreatments(false)
      }
    }

    const fetchPatientTreatments = async () => {
      setLoadingTreatments(true)
      try {
        const { data, error } = await supabase
          .from("patient_treatments")
          .select(`
            *,
            treatment:treatments(name, description, category),
            doctor:users!patient_treatments_doctor_id_fkey(first_name, last_name)
          `)
          .eq("patient_id", patientId)
          .order("treatment_date", { ascending: false })

        if (error) throw error

        // Transform the data to match the expected structure
        const transformedTreatments = data.map((item) => ({
          id: item.id,
          patient_id: item.patient_id,
          treatment_id: item.treatment_id,
          treatment_date: item.treatment_date,
          teeth_numbers: item.teeth_numbers,
          cost: item.cost,
          notes: item.notes,
          status: item.status,
          treatment_name: item.treatment?.name || "Unknown Treatment",
          treatment_description: item.treatment?.description || "",
          treatment_category: item.treatment?.category || "",
          doctor_first_name: item.doctor?.first_name || "",
          doctor_last_name: item.doctor?.last_name || "",
        }))

        setPatientTreatments(transformedTreatments || [])
      } catch (error: any) {
        console.error("Error fetching patient treatments:", error)
        toast.error("Failed to load patient treatments: " + error.message)
      } finally {
        setLoadingTreatments(false)
      }
    }

    if (isOpen && patientId) {
      fetchAvailableTreatments()
      fetchPatientTreatments()
    }
  }, [isOpen, patientId])

  if (!isOpen) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">
                    {profile ? `${profile.first_name} ${profile.last_name}` : "Loading..."}
                  </DialogTitle>
                  <p className="text-sm text-gray-500">{profile?.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}></Button>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-3" />
              <span className="text-lg">Loading patient data...</span>
            </div>
          ) : profile ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="flex w-full overflow-x-auto md:grid md:grid-cols-5 bg-gray-50 scrollbar-hide">
                <TabsTrigger
                  value="profile"
                  className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 min-w-fit px-3 md:px-4"
                >
                  <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Basic Information</span>
                  <span className="sm:hidden">Info</span>
                </TabsTrigger>
                <TabsTrigger
                  value="appointments"
                  className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 min-w-fit px-3 md:px-4"
                >
                  <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Appointments</span>
                  <span className="sm:hidden">Appts</span>
                </TabsTrigger>
                <TabsTrigger
                  value="treatments"
                  className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 min-w-fit px-3 md:px-4"
                >
                  <Activity className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                  <span>Treatment</span>
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 min-w-fit px-3 md:px-4"
                >
                  <FileText className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                  <span>Documents</span>
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 min-w-fit px-3 md:px-4"
                >
                  <CreditCard className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                  <span>Billing</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl">Patient Information</CardTitle>
                    {currentUserRole === "admin" && (
                      <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </>
                        ) : (
                          <>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </>
                        )}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Email</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-base text-gray-900">{profile.email}</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Date of Birth</Label>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editedPatient?.date_of_birth || ""}
                              onChange={(e) =>
                                setEditedPatient((prev) => (prev ? { ...prev, date_of_birth: e.target.value } : null))
                              }
                              className="mt-1"
                            />
                          ) : (
                            <p className="text-base text-gray-900 mt-1">
                              {profile.date_of_birth
                                ? new Date(profile.date_of_birth).toLocaleDateString()
                                : "Not provided"}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Address</Label>
                          {isEditing ? (
                            <Textarea
                              value={editedPatient?.address || ""}
                              onChange={(e) =>
                                setEditedPatient((prev) => (prev ? { ...prev, address: e.target.value } : null))
                              }
                              className="mt-1"
                              rows={3}
                            />
                          ) : (
                            <div className="flex items-start space-x-2 mt-1">
                              <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                              <span className="text-base text-gray-900">{profile.address || "Not provided"}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Phone</Label>
                          {isEditing ? (
                            <Input
                              value={editedPatient?.phone || ""}
                              onChange={(e) =>
                                setEditedPatient((prev) => (prev ? { ...prev, phone: e.target.value } : null))
                              }
                              className="mt-1"
                            />
                          ) : (
                            <div className="flex items-center space-x-2 mt-1">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span className="text-base text-gray-900">{profile.phone || "Not provided"}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Gender</Label>
                          {isEditing ? (
                            <Select
                              value={editedPatient?.gender || ""}
                              onValueChange={(value) =>
                                setEditedPatient((prev) => (prev ? { ...prev, gender: value } : null))
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-base text-gray-900 mt-1">{profile.gender || "Not provided"}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex space-x-3 pt-4 border-t">
                        <Button onClick={handleSaveProfile} disabled={isSaving}>
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Emergency Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Contact Name</Label>
                        {isEditing ? (
                          <Input
                            value={editedPatient?.emergency_contact_name || ""}
                            onChange={(e) =>
                              setEditedPatient((prev) =>
                                prev ? { ...prev, emergency_contact_name: e.target.value } : null,
                              )
                            }
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-base text-gray-900 mt-1">
                            {profile.emergency_contact_name || "Not provided"}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Contact Phone</Label>
                        {isEditing ? (
                          <Input
                            value={editedPatient?.emergency_contact_phone || ""}
                            onChange={(e) =>
                              setEditedPatient((prev) =>
                                prev ? { ...prev, emergency_contact_phone: e.target.value } : null,
                              )
                            }
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-base text-gray-900 mt-1">
                            {profile.emergency_contact_phone || "Not provided"}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Insurance Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Insurance Provider</Label>
                        {isEditing ? (
                          <Input
                            value={editedPatient?.insurance_provider || ""}
                            onChange={(e) =>
                              setEditedPatient((prev) =>
                                prev ? { ...prev, insurance_provider: e.target.value } : null,
                              )
                            }
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-base text-gray-900 mt-1">{profile.insurance_provider || "Not provided"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Policy Number</Label>
                        {isEditing ? (
                          <Input
                            value={editedPatient?.insurance_policy_number || ""}
                            onChange={(e) =>
                              setEditedPatient((prev) =>
                                prev ? { ...prev, insurance_policy_number: e.target.value } : null,
                              )
                            }
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-base text-gray-900 mt-1">
                            {profile.insurance_policy_number || "Not provided"}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Heart className="w-5 h-5 mr-2 text-red-500" />
                      Medical Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Medical History</Label>
                      {isEditing ? (
                        <Textarea
                          value={editedPatient?.medical_history || ""}
                          onChange={(e) =>
                            setEditedPatient((prev) => (prev ? { ...prev, medical_history: e.target.value } : null))
                          }
                          className="mt-1"
                          rows={4}
                          placeholder="Enter medical history..."
                        />
                      ) : (
                        <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">
                          {profile.medical_history || "No medical history recorded"}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Allergies</Label>
                      {isEditing ? (
                        <Textarea
                          value={editedPatient?.allergies || ""}
                          onChange={(e) =>
                            setEditedPatient((prev) => (prev ? { ...prev, allergies: e.target.value } : null))
                          }
                          className="mt-1"
                          rows={3}
                          placeholder="Enter known allergies..."
                        />
                      ) : (
                        <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">
                          {profile.allergies || "No known allergies"}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 flex items-center">
                        <Pill className="w-4 h-4 mr-1" />
                        Current Medications
                      </Label>
                      {isEditing ? (
                        <Textarea
                          value={editedPatient?.current_medications || ""}
                          onChange={(e) =>
                            setEditedPatient((prev) => (prev ? { ...prev, current_medications: e.target.value } : null))
                          }
                          className="mt-1"
                          rows={3}
                          placeholder="Enter current medications..."
                        />
                      ) : (
                        <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">
                          {profile.current_medications || "No current medications"}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appointments" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center">
                        <Calendar className="w-5 h-5 mr-2" />
                        Appointments Management
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{appointments.length} total</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select defaultValue="all">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {appointments.length > 0 ? (
                      <div className="space-y-4">
                        {appointments
                          .sort((a, b) => {
                            const statusOrder = { pending: 0, approved: 1, outstanding: 2, completed: 3, cancelled: 4 }
                            const aOrder = statusOrder[a.status] ?? 5
                            const bOrder = statusOrder[b.status] ?? 5
                            if (aOrder !== bOrder) return aOrder - bOrder
                            return new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
                          })
                          .map((appointment) => {
                            const isProcessing = updatingAppointments.has(appointment.id)

                            const formatDate = (date: string) => {
                              return new Date(date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            }

                            const formatTime = (time: string) => {
                              return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                            }

                            // Find payment info from billing records
                            const payment = billingRecords.find(
                              (record) => record.appointment_id === appointment.id && !record.isCustomBill,
                            )

                            return (
                              <div key={appointment.id} className="p-3 sm:p-4 border rounded-lg">
                                <div className="block sm:hidden space-y-3">
                                  {/* Header with appointment type and status */}
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-medium text-base truncate">{appointment.appointment_type}</h3>
                                      <p className="text-sm text-gray-600 truncate">
                                        {profile?.first_name} {profile?.last_name}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                                    </div>
                                    <Badge
                                      className={`${getStatusColor(appointment.status)} text-xs ml-2 flex-shrink-0`}
                                    >
                                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                    </Badge>
                                  </div>

                                  {/* Date and Time */}
                                  <div className="flex items-center justify-between text-sm">
                                    <div>
                                      <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
                                      <p className="text-gray-600">{formatTime(appointment.appointment_time)}</p>
                                    </div>
                                    {payment && (
                                      <div className="text-right">
                                        <Badge
                                          className={`${getPaymentStatusColor(payment.payment_status || "not_paid")} text-xs`}
                                        >
                                          {payment.payment_status === "fully_paid" && "Fully Paid"}
                                          {payment.payment_status === "partial_paid" && "Partial Paid"}
                                          {(!payment.payment_status || payment.payment_status === "not_paid") &&
                                            "Not Paid"}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>

                                  {/* Staff and Doctor Assignment */}
                                  <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                                    {appointment.doctor && (
                                      <div className="flex items-center">
                                        <UserCheck className="w-3 h-3 mr-1 text-green-600" />
                                        <span>
                                          Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                                        </span>
                                      </div>
                                    )}
                                    {appointment.staff && (
                                      <div className="flex items-center">
                                        <UserCheck className="w-3 h-3 mr-1 text-blue-600" />
                                        <span>
                                          {appointment.staff.first_name} {appointment.staff.last_name}
                                        </span>
                                      </div>
                                    )}
                                    {!appointment.doctor && !appointment.staff && (
                                      <div className="flex items-center text-gray-500">
                                        <UserCheck className="w-3 h-3 mr-1" />
                                        <span>No staff assigned</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Payment Details */}
                                  {payment && appointment.status === "completed" && (
                                    <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                                      <div className="flex justify-between">
                                        <span>Bill Amount:</span>
                                        <span>Rs {payment.amount?.toFixed(2) || "0.00"}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Paid Amount:</span>
                                        <span>Rs {payment.amount_paid?.toFixed(2) || "0.00"}</span>
                                      </div>
                                      {(payment.amount || 0) > (payment.amount_paid || 0) && (
                                        <div className="flex justify-between text-red-600 font-medium">
                                          <span>Outstanding:</span>
                                          <span>
                                            Rs {((payment.amount || 0) - (payment.amount_paid || 0)).toFixed(2)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {appointment.status === "pending" && (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() => handleAppointmentStatusUpdate(appointment.id, "approved")}
                                          disabled={isProcessing}
                                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-7"
                                        >
                                          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approve"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAppointmentStatusUpdate(appointment.id, "rejected")}
                                          disabled={isProcessing}
                                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-3 py-1 h-7"
                                        >
                                          Reject
                                        </Button>
                                      </>
                                    )}

                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        onClose()
                                        const dashboardPath =
                                          currentUserRole === "admin"
                                            ? "/admin"
                                            : currentUserRole === "doctor"
                                              ? "/dashboard"
                                              : currentUserRole === "staff"
                                                ? "/dashboard"
                                                : "/admin"
                                        router.push(`${dashboardPath}?tab=appointments&highlight=${appointment.id}`)
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-7"
                                    >
                                      Manage
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeleteAppointment(appointment.id)}
                                      disabled={isProcessing}
                                      className="border-red-600 text-red-600 hover:bg-red-50 text-xs px-2 py-1 h-7"
                                    >
                                      {isProcessing ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                      ) : (
                                        <Trash2 className="w-3 h-3" />
                                      )}
                                    </Button>

                                    {appointment.status === "completed" && (
                                      <Badge className="bg-gray-100 text-gray-800 text-xs px-2 py-1">Completed</Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="hidden sm:block">
                                  <div className="flex items-center justify-between">
                                    {/* Left side - Appointment info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <h3 className="font-medium text-lg">{appointment.appointment_type}</h3>
                                          <p className="text-sm text-gray-600">
                                            {profile?.first_name} {profile?.last_name}
                                          </p>
                                          <p className="text-xs text-gray-500">{profile?.email}</p>
                                        </div>
                                        <Badge className={`${getStatusColor(appointment.status)} ml-4`}>
                                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                        </Badge>
                                      </div>

                                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                                        <div className="flex items-center">
                                          <Calendar className="w-4 h-4 mr-1" />
                                          <span>{formatDate(appointment.appointment_date)}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <Clock className="w-4 h-4 mr-1" />
                                          <span>{formatTime(appointment.appointment_time)}</span>
                                        </div>
                                      </div>

                                      {/* Staff Assignment */}
                                      <div className="mt-2 text-sm">
                                        <div className="text-gray-600">Assigned to</div>
                                        <div className="flex items-center space-x-4 mt-1">
                                          {appointment.doctor ? (
                                            <div className="flex items-center text-green-600">
                                              <UserCheck className="w-4 h-4 mr-1" />
                                              <span>
                                                Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                                              </span>
                                            </div>
                                          ) : null}
                                          {appointment.staff ? (
                                            <div className="flex items-center text-blue-600">
                                              <UserCheck className="w-4 h-4 mr-1" />
                                              <span>
                                                {appointment.staff.first_name} {appointment.staff.last_name}
                                              </span>
                                            </div>
                                          ) : null}
                                          {!appointment.doctor && !appointment.staff && (
                                            <span className="text-gray-500">No staff assigned</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right side - Payment info and actions */}
                                    <div className="flex items-center space-x-4 ml-6">
                                      {/* Payment Status */}
                                      {payment && appointment.status === "completed" && (
                                        <div className="text-right text-sm">
                                          <div className="text-gray-600">Payment</div>
                                          <div className="space-y-1">
                                            <div>Bill Amount: Rs {payment.amount?.toFixed(2) || "0.00"}</div>
                                            <div>Paid Amount: Rs {payment.amount_paid?.toFixed(2) || "0.00"}</div>
                                            {(payment.amount || 0) > (payment.amount_paid || 0) && (
                                              <div className="text-red-600 font-medium">
                                                Outstanding: Rs{" "}
                                                {((payment.amount || 0) - (payment.amount_paid || 0)).toFixed(2)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Action Buttons */}
                                      <div className="flex items-center space-x-2">
                                        {appointment.status === "pending" && (
                                          <>
                                            <Button
                                              size="sm"
                                              onClick={() => handleAppointmentStatusUpdate(appointment.id, "approved")}
                                              disabled={isProcessing}
                                              className="bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleAppointmentStatusUpdate(appointment.id, "rejected")}
                                              disabled={isProcessing}
                                              className="text-red-600 border-red-200 hover:bg-red-50"
                                            >
                                              Reject
                                            </Button>
                                          </>
                                        )}

                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            onClose()
                                            const dashboardPath =
                                              currentUserRole === "admin"
                                                ? "/admin"
                                                : currentUserRole === "doctor"
                                                  ? "/dashboard"
                                                  : currentUserRole === "staff"
                                                    ? "/dashboard"
                                                    : "/admin"
                                            router.push(`${dashboardPath}?tab=appointments&highlight=${appointment.id}`)
                                          }}
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                          Manage
                                        </Button>

                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleDeleteAppointment(appointment.id)}
                                          disabled={isProcessing}
                                          className="border-red-600 text-red-600 hover:bg-red-50"
                                        >
                                          {isProcessing ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                          ) : (
                                            <Trash2 className="w-4 h-4" />
                                          )}
                                        </Button>

                                        {appointment.status === "completed" && (
                                          <Badge className="bg-gray-100 text-gray-800">Completed</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No appointments found for this patient.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="treatments" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center space-x-2">
                      <Activity className="w-5 h-5" />
                      <span>Treatment Management</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Treatment Selection Section */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Select Treatment Type</Label>
                        <Select
                          value={selectedTreatment?.id || ""}
                          onValueChange={(value) => {
                            if (value === "create-new") {
                              setShowCreateTreatment(true)
                            } else {
                              const treatment = availableTreatments.find((t) => t.id === value)
                              setSelectedTreatment(treatment || null)
                              if (treatment) {
                                setTreatmentForm({
                                  teeth_numbers: "",
                                  amount: treatment.default_cost || 0,
                                  date: new Date().toISOString().split("T")[0],
                                  notes: "",
                                })
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Choose a treatment type..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {availableTreatments.map((treatment) => (
                              <SelectItem key={treatment.id} value={treatment.id}>
                                {treatment.name}
                              </SelectItem>
                            ))}
                            <SelectItem value="create-new">
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Create New Treatment
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Treatment Details Form - Shows when treatment is selected */}
                      {selectedTreatment && (
                        <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-lg">Add Treatment: {selectedTreatment.name}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTreatment(null)
                                setTreatmentForm({ teeth_numbers: "", amount: 0, date: "", notes: "" })
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Teeth Numbers</Label>
                              <Input
                                placeholder="e.g., 1, 2, 3 or 1-4"
                                value={treatmentForm.teeth_numbers}
                                onChange={(e) =>
                                  setTreatmentForm((prev) => ({ ...prev, teeth_numbers: e.target.value }))
                                }
                                className="mt-1"
                              />
                              <p className="text-xs text-gray-500 mt-1">Enter teeth numbers separated by commas</p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-700">Amount</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={treatmentForm.amount}
                                onChange={(e) =>
                                  setTreatmentForm((prev) => ({
                                    ...prev,
                                    amount: Number.parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="mt-1"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Date</Label>
                              <Input
                                type="date"
                                value={treatmentForm.date}
                                onChange={(e) => setTreatmentForm((prev) => ({ ...prev, date: e.target.value }))}
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-700">Notes</Label>
                              <Textarea
                                placeholder="Optional notes..."
                                value={treatmentForm.notes}
                                onChange={(e) => setTreatmentForm((prev) => ({ ...prev, notes: e.target.value }))}
                                className="mt-1"
                                rows={2}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedTreatment(null)
                                setTreatmentForm({ teeth_numbers: "", amount: 0, date: "", notes: "" })
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAddTreatment}
                              disabled={isAddingTreatment}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isAddingTreatment ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                "Add Treatment"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Patient Treatments List */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Patient Treatments</h3>
                      {loadingTreatments ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          <span>Loading treatments...</span>
                        </div>
                      ) : patientTreatments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No treatments assigned yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {patientTreatments.map((treatment) => (
                            <div key={treatment.id} className="border rounded-lg p-4 bg-white">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="font-medium">{treatment.treatment_name}</h4>
                                    <Badge variant={treatment.status === "completed" ? "default" : "secondary"}>
                                      {treatment.status}
                                    </Badge>
                                  </div>
                                  {treatment.teeth_numbers && (
                                    <p className="text-sm text-gray-600 mb-1">
                                      <strong>Teeth:</strong> {treatment.teeth_numbers}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-600 mb-1">
                                    <strong>Amount:</strong> Rs {treatment.cost}
                                  </p>
                                  {treatment.treatment_date && (
                                    <p className="text-sm text-gray-600 mb-1">
                                      <strong>Date:</strong> {new Date(treatment.treatment_date).toLocaleDateString()}
                                    </p>
                                  )}
                                  {treatment.notes && (
                                    <p className="text-sm text-gray-600">
                                      <strong>Notes:</strong> {treatment.notes}
                                    </p>
                                  )}
                                </div>
                                {currentUserRole === "admin" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTreatment(treatment.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Create New Treatment Modal */}
                {showCreateTreatment && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">Create New Treatment</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowCreateTreatment(false)
                            setNewTreatment({
                              name: "",
                              description: "",
                              default_cost: 0,
                              duration_minutes: 30,
                              category: "",
                            })
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Treatment Name</Label>
                          <Input
                            value={newTreatment.name}
                            onChange={(e) => setNewTreatment((prev) => ({ ...prev, name: e.target.value }))}
                            className="mt-1"
                            placeholder="Enter treatment name"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700">Category</Label>
                          <Select
                            value={newTreatment.category}
                            onValueChange={(value) => setNewTreatment((prev) => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Preventive">Preventive</SelectItem>
                              <SelectItem value="Restorative">Restorative</SelectItem>
                              <SelectItem value="Endodontic">Endodontic</SelectItem>
                              <SelectItem value="Oral Surgery">Oral Surgery</SelectItem>
                              <SelectItem value="Cosmetic">Cosmetic</SelectItem>
                              <SelectItem value="Orthodontic">Orthodontic</SelectItem>
                              <SelectItem value="Periodontic">Periodontic</SelectItem>
                              <SelectItem value="Emergency">Emergency</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700">Default Cost</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newTreatment.default_cost}
                            onChange={(e) =>
                              setNewTreatment((prev) => ({
                                ...prev,
                                default_cost: Number.parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="mt-1"
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700">Description (Optional)</Label>
                          <Textarea
                            value={newTreatment.description}
                            onChange={(e) => setNewTreatment((prev) => ({ ...prev, description: e.target.value }))}
                            className="mt-1"
                            placeholder="Enter treatment description"
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowCreateTreatment(false)
                            setNewTreatment({
                              name: "",
                              description: "",
                              default_cost: 0,
                              duration_minutes: 30,
                              category: "",
                            })
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateTreatment}
                          disabled={isCreatingTreatment || !newTreatment.name || !newTreatment.category}
                        >
                          {isCreatingTreatment ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Treatment"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Patient Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <input
                        type="file"
                        id="upload"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingDocument}
                      />
                      <Label htmlFor="upload" className="inline-flex items-center space-x-2 cursor-pointer">
                        <Button asChild variant="secondary" disabled={uploadingDocument}>
                          <label htmlFor="upload">
                            {uploadingDocument ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <FileText className="mr-2 h-4 w-4" />
                                Upload Document
                              </>
                            )}
                          </label>
                        </Button>
                      </Label>
                    </div>

                    {documentsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading documents...</span>
                      </div>
                    ) : documents.length > 0 ? (
                      /* Improved document layout with proper spacing and truncation */
                      <div className="space-y-3">
                        {documents.map((document) => (
                          <div key={document.id} className="border rounded-lg p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4
                                  className="font-semibold text-sm sm:text-base truncate pr-2"
                                  title={document.file_name}
                                >
                                  {document.file_name}
                                </h4>
                                <p className="text-xs sm:text-sm text-gray-500">
                                  Uploaded: {new Date(document.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isImageFile(document.file_type) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreviewImage(document)}
                                    disabled={loadingPreview.has(document.id)}
                                    className="text-xs px-2 py-1 h-8"
                                  >
                                    {loadingPreview.has(document.id) ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      "Preview"
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadDocument(document)}
                                  className="text-xs px-2 py-1 h-8"
                                >
                                  Download
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDocument(document.id, document.file_name)}
                                  disabled={deletingDocuments.has(document.id)}
                                  className="text-red-600 hover:text-red-700 text-xs px-2 py-1 h-8"
                                >
                                  {deletingDocuments.has(document.id) ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-gray-500">No documents uploaded</p>
                        <p className="text-sm text-gray-400">Documents will appear here once uploaded</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-semibold">Billing Records</CardTitle>
                    <Button
                      onClick={() => setIsCreateBillModalOpen(true)}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      Create Custom Bill
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {appointmentPayments.length > 0 || billingRecords.length > 0 ? (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <div className="min-w-full">
                            <div className="grid grid-cols-6 gap-4 py-3 border-b font-medium text-sm text-gray-600 min-w-[800px]">
                              <div>DESCRIPTION</div>
                              <div>DATE</div>
                              <div>AMOUNT</div>
                              <div>PAID</div>
                              <div>STATUS</div>
                              <div className="min-w-[200px]">ACTION</div>
                            </div>
                            {appointmentPayments.map((payment) => {
                              const calculatedStatus =
                                payment.paid_amount === 0
                                  ? "not_paid"
                                  : payment.paid_amount >= payment.bill_amount
                                    ? "fully_paid"
                                    : "partial_paid"

                              return (
                                <div
                                  key={`payment-${payment.id}`}
                                  className="grid grid-cols-6 gap-4 py-3 border-b items-center min-w-[800px]"
                                >
                                  <div className="font-medium">
                                    {payment.appointment?.appointment_type || "Appointment"} Appointment
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {payment.appointment?.appointment_date
                                      ? new Date(payment.appointment.appointment_date).toLocaleDateString("en-US", {
                                          month: "2-digit",
                                          day: "2-digit",
                                          year: "numeric",
                                        })
                                      : new Date(payment.created_at).toLocaleDateString("en-US", {
                                          month: "2-digit",
                                          day: "2-digit",
                                          year: "numeric",
                                        })}
                                  </div>
                                  <div className="font-medium">Rs {payment.bill_amount.toFixed(2)}</div>
                                  <div className="text-sm text-gray-600">Rs {payment.paid_amount.toFixed(2)}</div>
                                  <div>
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        calculatedStatus === "fully_paid"
                                          ? "bg-green-100 text-green-800"
                                          : calculatedStatus === "partial_paid"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {calculatedStatus === "fully_paid"
                                        ? "Paid"
                                        : calculatedStatus === "partial_paid"
                                          ? "Partial"
                                          : "Not Paid"}
                                    </span>
                                  </div>
                                  <div className="flex gap-2 min-w-[200px]">
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateAppointmentPayment(payment)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 whitespace-nowrap"
                                    >
                                      Mark Paid/Update Payment
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                            {billingRecords
                              .filter((record) => {
                                // Filter out records with undefined appointment types and ensure valid data
                                if (record.isCustomBill) return true
                                return record.appointment_type && record.appointment_type !== "undefined"
                              })
                              .map((record) => {
                                const calculatedStatus =
                                  (record.amount_paid || 0) === 0
                                    ? "not_paid"
                                    : (record.amount_paid || 0) >= (record.amount || 0)
                                      ? "fully_paid"
                                      : "partial_paid"

                                return (
                                  <div
                                    key={`billing-${record.id}`}
                                    className="grid grid-cols-6 gap-4 py-3 border-b items-center min-w-[800px]"
                                  >
                                    <div className="font-medium">
                                      {record.isCustomBill
                                        ? record.description
                                        : `${record.appointment_type} Appointment`}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {record.payment_date
                                        ? new Date(record.payment_date).toLocaleDateString("en-US", {
                                            month: "2-digit",
                                            day: "2-digit",
                                            year: "numeric",
                                          })
                                        : new Date().toLocaleDateString("en-US", {
                                            month: "2-digit",
                                            day: "2-digit",
                                            year: "numeric",
                                          })}
                                    </div>
                                    <div className="font-medium">Rs {(record.amount || 0).toFixed(2)}</div>
                                    <div className="text-sm text-gray-600">
                                      Rs {(record.amount_paid || 0).toFixed(2)}
                                    </div>
                                    <div>
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          calculatedStatus === "fully_paid"
                                            ? "bg-green-100 text-green-800"
                                            : calculatedStatus === "partial_paid"
                                              ? "bg-yellow-100 text-yellow-800"
                                              : "bg-red-100 text-red-800"
                                        }`}
                                      >
                                        {calculatedStatus === "fully_paid"
                                          ? "Paid"
                                          : calculatedStatus === "partial_paid"
                                            ? "Partial"
                                            : "Not Paid"}
                                      </span>
                                    </div>
                                    <div className="flex gap-2 min-w-[200px]">
                                      <Button
                                        size="sm"
                                        onClick={() => handleUpdateCustomBillPayment(record)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 whitespace-nowrap"
                                      >
                                        Mark Paid/Update Payment
                                      </Button>
                                      {record.isCustomBill && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleDeleteCustomBill(record)}
                                          className="text-xs px-2 py-1 whitespace-nowrap"
                                        >
                                          Delete
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No billing records found</h3>
                        <p className="text-sm text-gray-500 mb-4">Create your first bill to get started</p>
                        <Button
                          onClick={() => setIsCreateBillModalOpen(true)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          + Create First Bill
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Billing Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {(() => {
                        // Calculate totals from both appointment payments and custom bills
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
                        const outstanding = totalBilled - totalPaid
                        return (
                          <>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <div className="text-sm text-green-600 mb-1">Total Paid</div>
                              <div className="text-2xl font-bold text-green-700">Rs {totalPaid.toFixed(2)}</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg">
                              <div className="text-sm text-red-600 mb-1">Outstanding</div>
                              <div className="text-2xl font-bold text-red-700">Rs {outstanding.toFixed(2)}</div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="text-sm text-blue-600 mb-1">Total Billed</div>
                              <div className="text-2xl font-bold text-blue-700">Rs {totalBilled.toFixed(2)}</div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Patient not found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateCustomBillModal
        isOpen={isCreateBillModalOpen}
        onClose={() => setIsCreateBillModalOpen(false)}
        patientId={patientId}
        currentUserId={currentUserId}
        onBillCreated={() => {
          fetchBillingRecords()
          toast.success("Bill created successfully")
        }}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        imageUrl={previewImageUrl}
        fileName={previewFileName}
        onDownload={handlePreviewDownload}
      />

      {selectedAppointmentForPayment && (
        <UpdatePaymentModal
          isOpen={updatePaymentModalOpen}
          onClose={() => setUpdatePaymentModalOpen(false)}
          payment={{
            id: selectedAppointmentForPayment.payment_id || selectedAppointmentForPayment.id, // Fallback to appointment ID if no payment_id
            bill_amount: selectedAppointmentForPayment.bill_amount || 0,
            paid_amount: selectedAppointmentForPayment.paid_amount || 0,
            payment_method: selectedAppointmentForPayment.payment_method || "",
            notes: "",
          }}
          onPaymentUpdated={_handlePaymentUpdated2}
        />
      )}

      {updateCustomBillModalOpen && selectedCustomBillForPayment && (
        <UpdatePaymentModal
          isOpen={updateCustomBillModalOpen}
          onClose={() => setUpdateCustomBillModalOpen(false)}
          payment={{
            id: selectedCustomBillForPayment.id,
            bill_amount: selectedCustomBillForPayment.amount,
            paid_amount: selectedCustomBillForPayment.amount_paid || 0,
            payment_method: selectedCustomBillForPayment.payment_method || "",
            notes: selectedCustomBillForPayment.notes || "",
            bill_description: selectedCustomBillForPayment.description,
            patient: {
              first_name: selectedCustomBillForPayment.patient_name?.split(" ")[0] || "",
              last_name: selectedCustomBillForPayment.patient_name?.split(" ").slice(1).join(" ") || "",
            },
          }}
          onPaymentUpdated={handleCustomBillPaymentUpdated}
          isCustomBill={true}
        />
      )}

      <Dialog open={assignStaffModalOpen} onOpenChange={setAssignStaffModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Staff to Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAppointmentForAssign && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedAppointmentForAssign.appointment_type}</p>
                <p className="text-sm text-gray-600">
                  {new Date(selectedAppointmentForAssign.appointment_date).toLocaleDateString()} at{" "}
                  {selectedAppointmentForAssign.appointment_time}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-medium">Available Staff:</h4>
              {availableStaff.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">
                      {staff.first_name} {staff.last_name}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">{staff.role}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStaffAssignment(staff.id, staff.role)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Assign
                  </Button>
                </div>
              ))}
            </div>

            {availableStaff.length === 0 && (
              <p className="text-center text-gray-500 py-4">No staff members available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AppointmentAssignmentModal
        isOpen={!!assignmentModalAppointment}
        onClose={() => setAssignmentModalAppointment(null)}
        appointment={assignmentModalAppointment}
        onAssignmentUpdated={handleAssignmentUpdated}
      />

      <UpdatePaymentModal
        isOpen={updatePaymentModal.isOpen}
        onClose={() => setUpdatePaymentModal({ isOpen: false, payment: null, appointment: null })}
        payment={updatePaymentModal.payment}
        appointment={updatePaymentModal.appointment}
        onPaymentUpdated={_handlePaymentUpdated}
      />

      <CompleteAppointmentModal
        isOpen={completeAppointmentModal.isOpen}
        onClose={() => setCompleteAppointmentModal({ isOpen: false, appointment: null })}
        appointment={completeAppointmentModal.appointment}
        onAppointmentCompleted={handleAppointmentCompleted}
      />
      <CompleteAppointmentModal
        isOpen={!!selectedAppointmentForCompletion}
        onClose={() => setSelectedAppointmentForCompletion(null)}
        appointment={selectedAppointmentForCompletion}
        onAppointmentCompleted={handleAppointmentCompleted}
      />
    </>
  )
}
